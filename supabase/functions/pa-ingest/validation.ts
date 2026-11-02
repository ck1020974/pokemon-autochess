// Pure validation: shared with local Vite tests, independent of the edge runtime.
type Obj = Record<string, unknown>;
export interface EventRow { event_id: string; visitor_id: string; run_id: string | null; battle_id: string | null; kind: string; event_at: string; edition: string | null; difficulty: string | null; version: string; payload: Obj; is_test: boolean }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SYNERGIES = new Set('Starter Normal Ghost Grass Fire Water Triplets Hard Cave Angry Snow SwordDance Roost Psychic Trick BugBite Charge Thief Charm BatonPass Outrage Intimidate'.split(' '));
const editions = ['classic', 'modern', 'infinite'];
const difficulties = ['NORMAL', 'GREAT', 'ULTRA', 'MASTER'];
const fail = (): never => { throw new Error('Invalid analytics event'); };
const object = (value: unknown): Obj => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Obj : fail();
function keys(value: Obj, allowed: string[], required = allowed) { if (Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !(key in value))) fail(); }
const str = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value);
const int = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const uuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const member = (value: unknown, values: string[]) => typeof value === 'string' && values.includes(value);
function team(value: unknown) {
  if (!Array.isArray(value) || value.length !== 5) fail();
  for (const item of value as unknown[]) {
    if (item === null) continue;
    const unit = object(item); keys(unit, ['templateId', 'name', 'level', 'attack', 'hp', 'maxHp', 'synergies']);
    if (!str(unit.templateId, 80) || !/^[a-zA-Z0-9_-]+$/.test(unit.templateId) || !str(unit.name, 100) || !int(unit.level, 1, 3) || !int(unit.attack, 0, 1000000) || !int(unit.hp, 0, 1000000) || !int(unit.maxHp, 1, 1000000) || unit.hp > unit.maxHp) fail();
    if (!Array.isArray(unit.synergies) || unit.synergies.length > 10 || unit.synergies.some(id => typeof id !== 'string' || !SYNERGIES.has(id)) || new Set(unit.synergies).size !== unit.synergies.length) fail();
  }
}
export function validateBatch(body: unknown, now = Date.now(), forceTest = false): EventRow[] {
  const batch = object(body); keys(batch, ['events']);
  if (!Array.isArray(batch.events) || batch.events.length < 1 || batch.events.length > 10) fail();
  return (batch.events as unknown[]).map(raw => {
    const e = object(raw); keys(e, ['eventId', 'visitorId', 'runId', 'battleId', 'kind', 'clientAt', 'edition', 'difficulty', 'version', 'payload', 'isTest'], ['eventId', 'visitorId', 'runId', 'battleId', 'kind', 'clientAt', 'edition', 'difficulty', 'version', 'payload']);
    if (!uuid(e.eventId) || !uuid(e.visitorId) || !member(e.kind, ['visit', 'battle_start', 'battle_end', 'run_end']) || !str(e.version, 80) || !/^[a-zA-Z0-9._+-]+$/.test(e.version) || ('isTest' in e && typeof e.isTest !== 'boolean')) fail();
    if (!str(e.clientAt, 40) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(e.clientAt)) fail();
    const time = Date.parse(e.clientAt as string);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== (e.clientAt as string).slice(0, 19) || now - time >= 7 * 86400000 || time - now >= 5 * 60000) fail();
    const p = object(e.payload);
    if (new TextEncoder().encode(JSON.stringify(p)).length > 24000) fail();
    if (e.kind === 'visit') {
      if (e.runId !== null || e.battleId !== null || e.edition !== null || e.difficulty !== null) fail();
      keys(p, []);
    } else {
      if (!uuid(e.runId) || !member(e.edition, editions) || !member(e.difficulty, difficulties)) fail();
      if (e.kind === 'run_end') { keys(p, ['outcome']); if (e.battleId !== null || !member(p.outcome, ['victory', 'defeat', 'abandoned'])) fail(); }
      else {
        if (!int(p.turn, 1, 10000) || e.battleId !== `${e.runId}:${p.turn}`) fail();
        if (e.kind === 'battle_end') {
          keys(p, ['turn', 'result', 'outcome']);
          if (!member(p.result, ['WIN', 'LOSS', 'DRAW']) || (p.outcome !== null && !member(p.outcome, ['victory', 'defeat']))) fail();
        } else {
          keys(p, ['turn', 'winsBefore', 'livesBefore', 'opponentId', 'opponentDifficulty', 'playerTeam', 'enemyTeam', 'synergies', 'psychicN']);
          if (!int(p.winsBefore, 0, 10000) || !int(p.livesBefore, 0, 10000) || !int(p.psychicN, 0, 1000000) || (p.opponentId !== null && (!str(p.opponentId, 80) || !/^[a-zA-Z0-9_-]+$/.test(p.opponentId))) || !member(p.opponentDifficulty, ['EASY', 'NORMAL', 'HARD', 'VERY_HARD'])) fail();
          team(p.playerTeam); team(p.enemyTeam);
          const synergies = object(p.synergies);
          if (Object.entries(synergies).some(([id, n]) => !SYNERGIES.has(id) || !int(n, 1, 20))) fail();
        }
      }
    }
    return { event_id: e.eventId as string, visitor_id: e.visitorId as string, run_id: e.runId as string | null, battle_id: e.battleId as string | null, kind: e.kind as string, event_at: new Date(time).toISOString(), edition: e.edition as string | null, difficulty: e.difficulty as string | null, version: e.version as string, payload: p, is_test: forceTest || e.isTest === true };
  });
}
