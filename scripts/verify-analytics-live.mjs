import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { ANALYTICS_URL, ANALYTICS_PUBLIC_KEY } from '../src/analytics/config.ts';

const endpoint = `${ANALYTICS_URL}/functions/v1/pa-ingest`;
const origin = 'https://ck1020974.github.io';
const event = { eventId: crypto.randomUUID(), visitorId: crypto.randomUUID(), runId: null, battleId: null,
    kind: 'visit', clientAt: new Date().toISOString(), edition: null, difficulty: null, version: 'integration-test', payload: {}, isTest: true };
const send = (data, key = ANALYTICS_PUBLIC_KEY, requestOrigin = origin) => fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, origin: requestOrigin }, body: JSON.stringify(data) });
const first = await send({ events: [event] });
assert.equal(first.status, 200, await first.clone().text());
assert.deepEqual((await first.json()).accepted, [event.eventId]);
const replay = await send({ events: [event] });
assert.equal(replay.status, 200);
assert.equal((await send({ events: [event] }, 'wrong-key')).status, 401);
assert.equal((await send({ events: [event] }, ANALYTICS_PUBLIC_KEY, 'https://invalid.example')).status, 403);
assert.equal((await send({ events: [{ ...event, kind: 'invalid' }] })).status, 400);
const options = await fetch(endpoint, { method: 'OPTIONS', headers: { origin, 'Access-Control-Request-Headers': 'apikey,content-type' } });
assert.equal(options.status, 204);
const read = await fetch(`${ANALYTICS_URL}/rest/v1/pa_events?select=event_id`, { headers: { apikey: ANALYTICS_PUBLIC_KEY } });
assert.ok([401, 403].includes(read.status));
const report = await fetch(`${ANALYTICS_URL}/rest/v1/rpc/pa_dashboard`, { method: 'POST', headers: { apikey: ANALYTICS_PUBLIC_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_from: '2026-11-01', p_to: '2026-11-03' }) });
assert.ok([401, 403].includes(report.status));
const output = '../output/作者統計頁-20261103';
await mkdir(output, { recursive: true });
await writeFile(`${output}/cloud-verification.json`, JSON.stringify({ ingestion: true, replayAccepted: true, invalidKeyRejected: true, invalidOriginRejected: true,
    malformedEventRejected: true, cors: true, anonymousReadDenied: true, anonymousReportDenied: true, testEventId: event.eventId, testVisitorId: event.visitorId, checkedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ passed: true, testEventId: event.eventId, testVisitorId: event.visitorId }));
