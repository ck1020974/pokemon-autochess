import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', server: { middlewareMode: true } });
try {
  const { validateBatch } = await server.ssrLoadModule('/supabase/functions/pa-ingest/validation.ts');
  const now = Date.parse('2026-11-03T00:00:00Z');
  const uuid = '57fc9aa0-d217-4e79-b8ad-7d8142de4374';
  const event = { eventId: uuid, visitorId: uuid, runId: uuid, battleId: `${uuid}:1`, kind: 'battle_end', clientAt: new Date(now).toISOString(), edition: 'classic', difficulty: 'NORMAL', version: 'test-v1', payload: { result: 'WIN', turn: 1, outcome: null } };
  const check = value => validateBatch({ events: [value] }, now, false);
  assert.equal(check(event)[0].event_id, uuid);
  for (const bad of [{ kind: 'invented' }, { eventId: 'fake' }, { visitorId: 'fake' }, { difficulty: 'EASY' }, { edition: 'made-up' }, { battleId: `${uuid}:2` }, { payload: { ...event.payload, result: 'win' } }, { payload: { ...event.payload, outcome: 'unknown' } }, { clientAt: new Date(now - 8 * 86400000).toISOString() }, { clientAt: new Date(now + 301000).toISOString() }, { extra: true }, { payload: { junk: 'x'.repeat(25000) } }]) assert.throws(() => check({ ...event, ...bad }));
  const team = [{ templateId: 'gastly', name: '<img src=x onerror=alert(1)>', level: 1, attack: 10, hp: 20, maxHp: 20, synergies: ['Ghost'] }, null, null, null, null];
  const start = { ...event, kind: 'battle_start', payload: { turn: 1, winsBefore: 0, livesBefore: 5, opponentId: 'novice_1', opponentDifficulty: 'EASY', playerTeam: team, enemyTeam: team, synergies: { Ghost: 2 }, psychicN: 0 } };
  assert.deepEqual(check(start)[0].payload.playerTeam, team);
  assert.equal(check({ ...start, payload: { ...start.payload, synergies: { Ghost: 7 } } })[0].payload.synergies.Ghost, 7);
  const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
  for (const unit of Object.values(ALL_UNITS)) {
    const snapshot = { templateId: unit.id, name: unit.name, level: 1, attack: unit.baseStats.attack, hp: unit.baseStats.hp, maxHp: unit.baseStats.maxHp, synergies: unit.synergies };
    check({ ...start, payload: { ...start.payload, playerTeam: [snapshot, null, null, null, null] } });
  }
  assert.throws(() => check({ ...start, payload: { ...start.payload, playerTeam: [{ ...team[0], attack: Infinity }, null, null, null, null] } }));
  assert.throws(() => check({ ...start, payload: { ...start.payload, synergies: { Unknown: 2 } } }));
  assert.throws(() => check({ ...start, payload: { ...start.payload, playerTeam: team.slice(1) } }));
  assert.equal(validateBatch({ events: [event] }, now, true)[0].is_test, true);
  assert.equal(check({ ...event, isTest: true })[0].is_test, true);
  assert.throws(() => validateBatch({ events: Array(11).fill(event) }, now));
  assert.throws(() => validateBatch({ events: [], author: true }, now));
  console.log('Analytics validation: valid events, hostile inputs, bounds, timestamps, and five slots passed.');
} finally { await server.close(); }
