-- No frontend role can insert events or edit the owner allowlist.
create table public.pa_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.pa_owners enable row level security;
revoke all on public.pa_owners from anon, authenticated;
grant select on public.pa_owners to authenticated;
grant all on public.pa_owners to service_role;
create policy owner_membership on public.pa_owners for select to authenticated
  using (user_id = (select auth.uid()));

create table public.pa_events (
  event_id uuid primary key,
  visitor_id uuid not null,
  run_id uuid,
  battle_id text,
  kind text not null check (kind in ('visit','battle_start','battle_end','run_end')),
  event_at timestamptz not null,
  received_at timestamptz not null default now(),
  edition text check (edition in ('classic','modern','infinite')),
  difficulty text check (difficulty in ('NORMAL','GREAT','ULTRA','MASTER')),
  version text not null check (length(version) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 24000),
  is_test boolean not null default false,
  check ((kind = 'visit' and run_id is null and battle_id is null and edition is null and difficulty is null)
    or (kind = 'run_end' and run_id is not null and battle_id is null and edition is not null and difficulty is not null)
    or (kind in ('battle_start','battle_end') and run_id is not null and battle_id is not null and edition is not null and difficulty is not null
      and battle_id ~ ('^' || run_id::text || ':[1-9][0-9]{0,4}$')))
);
create unique index pa_events_battle_start_unique on public.pa_events(visitor_id,battle_id) where kind = 'battle_start';
create unique index pa_events_battle_end_unique on public.pa_events(visitor_id,battle_id) where kind = 'battle_end';
create unique index pa_events_run_end_unique on public.pa_events(visitor_id,run_id) where kind = 'run_end';
create index pa_events_visitor_receipt on public.pa_events(visitor_id,received_at);
create index pa_events_run on public.pa_events(visitor_id,run_id,event_at) where not is_test;
create index pa_events_date_dimensions on public.pa_events(event_at,edition,difficulty,version) where not is_test;
alter table public.pa_events enable row level security;
revoke all on public.pa_events from anon, authenticated;
grant select on public.pa_events to authenticated;
grant all on public.pa_events to service_role;
create policy author_events on public.pa_events for select to authenticated using
  (exists (select 1 from public.pa_owners where user_id = (select auth.uid())));

-- PostgREST upsert targets the primary key by default. This service-only RPC also
-- ignores the logical partial-unique battle/run keys, so replay IDs cannot inflate counts.
create function public.pa_ingest_events(p_events jsonb) returns void
language sql security invoker set search_path = pg_catalog, public as $$
  insert into public.pa_events(event_id,visitor_id,run_id,battle_id,kind,event_at,edition,difficulty,version,payload,is_test)
  select event_id,visitor_id,run_id,battle_id,kind,event_at,edition,difficulty,version,payload,is_test
  from jsonb_to_recordset(p_events) as e(event_id uuid,visitor_id uuid,run_id uuid,battle_id text,
    kind text,event_at timestamptz,edition text,difficulty text,version text,payload jsonb,is_test boolean)
  on conflict do nothing;
$$;
revoke all on function public.pa_ingest_events(jsonb) from public, anon, authenticated;
grant execute on function public.pa_ingest_events(jsonb) to service_role;

create function public.pa_dashboard(p_from date, p_to date, p_edition text default null,
  p_difficulty text default null, p_version text default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare report jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.pa_owners where user_id = auth.uid()) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 730 then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  if (p_edition is not null and p_edition not in ('classic','modern','infinite'))
    or (p_difficulty is not null and p_difficulty not in ('NORMAL','GREAT','ULTRA','MASTER'))
    or (p_version is not null and length(p_version) > 80) then
    raise exception 'Invalid filter' using errcode = '22023';
  end if;
  with
  events as materialized (select * from public.pa_events where not is_test),
  -- Pair both halves, including dimensions, before counting any battle or qualification.
  paired as materialized (
    select s.visitor_id,s.run_id,s.battle_id,s.edition,s.difficulty,s.version,
      s.event_at started_at,e.event_at ended_at,s.payload start_payload,e.payload end_payload,
      e.payload->>'result' result,(e.event_at at time zone 'Asia/Taipei')::date AS report_day
    from events s join events e on e.visitor_id=s.visitor_id and e.battle_id=s.battle_id
      and e.run_id=s.run_id and e.edition=s.edition and e.difficulty=s.difficulty and e.version=s.version
    where s.kind='battle_start' and e.kind='battle_end' and e.event_at >= s.event_at
      and e.payload->>'result' in ('WIN','LOSS','DRAW')
  ),
  first_battle as (
    select distinct on (visitor_id,run_id) * from paired order by visitor_id,run_id,ended_at,battle_id
  ),
  run_base as (
    select f.*, (select min(s.event_at) from events s where s.visitor_id=f.visitor_id and s.run_id=f.run_id and s.kind='battle_start') run_started_at,
      (select max(s.event_at) from events s where s.visitor_id=f.visitor_id and s.run_id=f.run_id) updated_at,
      (select s.payload->'playerTeam' from events s where s.visitor_id=f.visitor_id and s.run_id=f.run_id and s.kind='battle_start' order by s.event_at desc,s.battle_id desc limit 1) team,
      coalesce(
        (select s.payload->>'outcome' from events s where s.visitor_id=f.visitor_id and s.run_id=f.run_id and s.kind='run_end'
          and s.edition=f.edition and s.difficulty=f.difficulty and s.version=f.version and s.payload->>'outcome' in ('victory','defeat','abandoned') limit 1),
        (select b.end_payload->>'outcome' from paired b where b.visitor_id=f.visitor_id and b.run_id=f.run_id
          and b.end_payload->>'outcome' in ('victory','defeat') order by b.ended_at desc limit 1)) outcome,
      (select count(*) from paired b where b.visitor_id=f.visitor_id and b.run_id=f.run_id and b.result='WIN') wins,
      (select count(*) from paired b where b.visitor_id=f.visitor_id and b.run_id=f.run_id and b.result='LOSS') losses,
      (select count(*) from paired b where b.visitor_id=f.visitor_id and b.run_id=f.run_id and b.result='DRAW') draws
    from first_battle f
  ),
  runs as materialized (
    select r.*, coalesce(outcome,case when updated_at < now()-interval '24 hours' then 'abandoned' else 'in_progress' end) status
    from run_base r where report_day between p_from and p_to
      and (p_edition is null or edition=p_edition) and (p_difficulty is null or difficulty=p_difficulty)
      and (p_version is null or version=p_version)
  ),
  battles as materialized (
    select * from paired where report_day between p_from and p_to
      and (p_edition is null or edition=p_edition) and (p_difficulty is null or difficulty=p_difficulty)
      and (p_version is null or version=p_version)
  ),
  visits as materialized (select * from events where kind='visit' and (event_at at time zone 'Asia/Taipei')::date between p_from and p_to),
  run_counts as (select count(*) n,count(distinct visitor_id) players,
    count(*) filter(where status in ('victory','defeat')) completed,
    count(*) filter(where status='victory') victories,count(*) filter(where status='defeat') defeats,
    count(*) filter(where status='abandoned') abandoned,count(*) filter(where status='in_progress') progressing,
    avg(wins) avg_wins from runs),
  battle_counts as (select count(*) n,count(*) filter(where result='WIN') wins,
    count(*) filter(where result='DRAW') draws,count(*) filter(where result='LOSS') losses from battles),
  days as (select p_from+i AS report_day from generate_series(0,p_to-p_from) i),
  daily as (select d.report_day,
    (select count(*) from visits v where (v.event_at at time zone 'Asia/Taipei')::date=d.report_day) visits,
    (select count(distinct visitor_id) from runs r where r.report_day=d.report_day) players,
    (select count(*) from runs r where r.report_day=d.report_day) runs,
    (select count(*) from battles b where b.report_day=d.report_day) battles from days d),
  mode_keys as (select edition,difficulty from runs union select edition,difficulty from battles),
  mode_stats as (select k.*,
    (select count(*) from runs r where r.edition=k.edition and r.difficulty=k.difficulty) runs,
    (select count(*) from runs r where r.edition=k.edition and r.difficulty=k.difficulty and status in ('victory','defeat')) completed,
    (select count(*) from runs r where r.edition=k.edition and r.difficulty=k.difficulty and status='victory') victories,
    (select count(*) from battles b where b.edition=k.edition and b.difficulty=k.difficulty) battles,
    (select count(*) from battles b where b.edition=k.edition and b.difficulty=k.difficulty and result='WIN') wins from mode_keys k),
  synergy_stats as (
    select s.key id,count(*) battles,count(*) filter(where b.result='WIN') wins
    from battles b cross join lateral jsonb_each(b.start_payload->'synergies') s
    where jsonb_typeof(s.value)='number' and s.value::numeric > 0 group by s.key
  ),
  recent as (select * from runs order by run_started_at desc,run_id limit 20)
  select jsonb_build_object(
    'summary',jsonb_build_object('visits',(select count(*) from visits),'players',r.players,'runs',r.n,
      'completedRuns',r.completed,'victories',r.victories,'defeats',r.defeats,'abandonedRuns',r.abandoned,'inProgressRuns',r.progressing,
      'battles',b.n,'battleWins',b.wins,'battleDraws',b.draws,'battleLosses',b.losses,
      'winRate',100.0*b.wins/nullif(b.n,0),'completionRate',100.0*r.completed/nullif(r.n,0),
      'clearRate',100.0*r.victories/nullif(r.completed,0),'avgWins',r.avg_wins),
    'daily',coalesce((select jsonb_agg(jsonb_build_object('date',report_day,'visits',visits,'players',players,'runs',runs,'battles',battles) order by report_day) from daily),'[]'::jsonb),
    'modes',coalesce((select jsonb_agg(jsonb_build_object('edition',edition,'difficulty',difficulty,'runs',runs,'completedRuns',completed,'victories',victories,'battles',battles,'winRate',100.0*wins/nullif(battles,0)) order by edition,difficulty) from mode_stats),'[]'::jsonb),
    'synergies',coalesce((select jsonb_agg(jsonb_build_object('id',id,'battles',battles,'wins',wins,'winRate',100.0*wins/nullif(battles,0)) order by battles desc,id) from synergy_stats),'[]'::jsonb),
    'recentRuns',coalesce((select jsonb_agg(jsonb_build_object('runId',run_id,'edition',edition,'difficulty',difficulty,'version',version,'startedAt',run_started_at,'status',status,'wins',wins,'losses',losses,'draws',draws,'team',coalesce(team,'[null,null,null,null,null]'::jsonb)) order by run_started_at desc,run_id) from recent),'[]'::jsonb),
    'versions',coalesce((select jsonb_agg(version order by version) from (select distinct version from events) v),'[]'::jsonb),
    'generatedAt',now()) into report from run_counts r cross join battle_counts b;
  return report;
end;
$$;
revoke all on function public.pa_dashboard(date,date,text,text,text) from public, anon;
grant execute on function public.pa_dashboard(date,date,text,text,text) to authenticated;
comment on function public.pa_dashboard(date,date,text,text,text) is
  'Owner only. Run cohort date is first paired battle completion (Taipei). Visits ignore dimension filters; battles use completion dates. Run outcomes and win totals include all currently received events for the selected cohort. Browser-reported trends, not verified competition results.';
