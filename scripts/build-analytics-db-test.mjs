import { writeFile } from 'node:fs/promises';

const owner = process.argv[2];
if (!/^[0-9a-f-]{36}$/.test(owner ?? '')) throw new Error('Owner UUID required');
let eventCounter = 0;
const uuid = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const team = [null, { templateId: 'rattata', name: '小拉達', level: 1, attack: 2, hp: 3, maxHp: 3, synergies: ['Normal'] }, null, null, null];
const rows = [];
const add = (kind, visitor, run, turn, at, payload, edition = 'classic', difficulty = 'NORMAL', isTest = false) => rows.push({
    event_id: uuid(++eventCounter + 100), visitor_id: uuid(visitor), run_id: run ? uuid(run) : null,
    battle_id: kind.startsWith('battle_') ? `${uuid(run)}:${turn}` : null, kind,
    event_at: at, edition: kind === 'visit' ? null : edition, difficulty: kind === 'visit' ? null : difficulty,
    version: 'fixture-v1', payload, is_test: isTest,
});
const battle = (visitor, run, turn, at, result, edition = 'classic', difficulty = 'NORMAL', isTest = false) => {
    const end = new Date(Date.parse(at) + 60000).toISOString();
    add('battle_start', visitor, run, turn, at, { turn, playerTeam: team, synergies: turn === 1 ? { Normal: 2, Thief: 5 } : { Normal: 2 } }, edition, difficulty, isTest);
    add('battle_end', visitor, run, turn, end, { turn, result, outcome: null }, edition, difficulty, isTest);
};
add('visit', 1, null, null, '2026-11-01T15:59:00Z', {});
add('visit', 2, null, null, '2026-11-01T16:01:00Z', {});
battle(1, 10, 1, '2026-11-01T15:58:00Z', 'WIN');
battle(1, 10, 2, '2026-11-01T16:01:00Z', 'DRAW');
add('run_end', 1, 10, null, '2026-11-01T16:04:00Z', { outcome: 'victory' });
battle(2, 20, 1, '2026-11-02T00:00:00Z', 'LOSS', 'modern', 'GREAT');
add('run_end', 2, 20, null, '2026-11-02T00:02:00Z', { outcome: 'defeat' }, 'modern', 'GREAT');
battle(1, 30, 1, '2026-11-02T01:00:00Z', 'WIN', 'infinite', 'ULTRA');
add('run_end', 1, 30, null, '2026-11-02T01:02:00Z', { outcome: 'abandoned' }, 'infinite', 'ULTRA');
add('battle_start', 99, 90, 1, '2026-11-02T02:00:00Z', { turn: 1, playerTeam: team, synergies: {} });
battle(99, 91, 1, '2026-11-02T02:01:00Z', 'WIN', 'classic', 'NORMAL', true);
// Same logical result with a different event UUID must not be counted twice.
rows.push({ ...rows.find(row => row.kind === 'battle_end'), event_id: uuid(999) });
const json = quote(JSON.stringify(rows));
const sql = `begin;
select public.pa_ingest_events(${json}::jsonb);
select public.pa_ingest_events(${json}::jsonb);
do $$ begin
 if has_table_privilege('anon','public.pa_events','select') or has_table_privilege('authenticated','public.pa_events','insert')
   or has_table_privilege('authenticated','public.pa_owners','insert')
   or has_function_privilege('authenticated','public.pa_ingest_events(jsonb)','execute')
   or has_function_privilege('anon','public.pa_dashboard(date,date,text,text,text)','execute') then raise exception 'Unexpected public grants'; end if;
end $$;
select set_config('request.jwt.claims',${quote(JSON.stringify({sub:uuid(9999),role:'authenticated'}))},true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.pa_events)<>0 then raise exception 'Nonowner can read events'; end if;
 begin
  perform public.pa_dashboard('2026-11-01','2026-11-02');
  raise exception 'Nonowner can call report';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',${quote(JSON.stringify({sub:owner,role:'authenticated'}))},true);
set local role authenticated;
do $$ declare r jsonb; s jsonb; begin
 r:=public.pa_dashboard('2026-11-01','2026-11-02',null,null,'fixture-v1'); s:=r->'summary';
 if (s->>'visits')::int<>2 or (s->>'players')::int<>2 or (s->>'runs')::int<>3 or (s->>'battles')::int<>4
   or (s->>'completedRuns')::int<>2 or (s->>'victories')::int<>1 or (s->>'defeats')::int<>1
   or (s->>'abandonedRuns')::int<>1 or (s->>'winRate')::numeric<>50 or (s->>'clearRate')::numeric<>50 then raise exception 'Bad summary: %',s; end if;
 if (r->'daily'->0->>'visits')::int<>1 or (r->'daily'->0->>'runs')::int<>1 or (r->'daily'->1->>'runs')::int<>2 then raise exception 'Taipei day/cohort failure: %',r->'daily'; end if;
 if jsonb_array_length(r->'recentRuns'->0->'team')<>5 or r->'recentRuns'->0->'team'->0<>'null'::jsonb then raise exception 'Lost slot holes'; end if;
 r:=public.pa_dashboard('2026-11-01','2026-11-02','classic','NORMAL','fixture-v1');
 if (r->'summary'->>'runs')::int<>1 or (r->'summary'->>'battles')::int<>2 or (r->'summary'->>'visits')::int<>2 then raise exception 'Filter/visit semantics incorrect'; end if;
 r:=public.pa_dashboard('2026-11-02','2026-11-02','classic','NORMAL','fixture-v1');
 if (r->'summary'->>'runs')::int<>0 or (r->'summary'->>'battles')::int<>1 or (r->'summary'->>'players')::int<>1
   or (r->'daily'->0->>'players')::int<>1 then raise exception 'Continuing cross-midnight players are missing'; end if;
 r:=public.pa_dashboard('2025-01-01','2025-01-01');
 if (r->'summary'->>'runs')::int<>0 or r->'summary'->'winRate'<>'null'::jsonb then raise exception 'Zero denominator failure'; end if;
end $$;
reset role;
select 'PASS: RLS, grants, idempotency, Taipei dates, run qualification, all denominators, filters, test exclusion and five-slot snapshots' as verification;
rollback;`;
await writeFile('analytics-db-test.local', sql);
console.log('Analytics transactional DB test prepared.');
