import { createClient } from '@supabase/supabase-js';
import { validateBatch } from './validation.ts';

const ORIGINS = new Set(['https://ck1020974.github.io', 'http://127.0.0.1:5182']);
const LIMIT = 100 * 1024;
// New API-key dictionaries are provided by the platform. Only fall back when absent.
function configuredKeys(name: string, legacy?: string): string[] {
  const value = Deno.env.get(name);
  if (value !== undefined) {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? Object.values(parsed).filter((v): v is string => typeof v === 'string') : []; } catch { return []; }
  }
  const fallback = legacy && Deno.env.get(legacy);
  return fallback ? [fallback] : [];
}
Deno.serve(async request => {
  const origin = request.headers.get('origin') ?? '';
  const headers = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (!ORIGINS.has(origin)) return new Response('Forbidden', { status: 403 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!configuredKeys('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY').includes(request.headers.get('apikey') ?? '')) return reply(401, { error: 'Unauthorized' });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415, { error: 'Expected JSON' });
  if (Number(request.headers.get('content-length')) > LIMIT) return reply(413, { error: 'Body too large' });
  try {
    // Bound streaming reads as well as Content-Length: chunked bodies cannot bypass the cap.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'Invalid body' });
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > LIMIT) { await reader.cancel(); return reply(413, { error: 'Body too large' }); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let rows;
    try { rows = validateBatch(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), Date.now(), origin === 'http://127.0.0.1:5182'); }
    catch { return reply(400, { error: 'Invalid analytics event' }); }
    const secret = configuredKeys('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')[0];
    const url = Deno.env.get('SUPABASE_URL');
    if (!secret || !url) return reply(503, { error: 'Unavailable' });
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const visitor of new Set(rows.map(row => row.visitor_id))) {
      const { count, error } = await db.from('pa_events').select('event_id', { count: 'exact', head: true }).eq('visitor_id', visitor).gte('received_at', new Date(Date.now() - 3600000).toISOString());
      if (error) return reply(503, { error: 'Unavailable' });
      if ((count ?? 0) + rows.filter(row => row.visitor_id === visitor).length > 500) return reply(429, { error: 'Rate limited' });
    }
    // Ignore all uniqueness conflicts, including logical battle/run duplicates with new event IDs.
    const { error } = await db.rpc('pa_ingest_events', { p_events: rows });
    if (error) return reply(503, { error: 'Unavailable' });
    return reply(200, { accepted: rows.map(row => row.event_id) });
  } catch { return reply(503, { error: 'Unavailable' }); }
});
