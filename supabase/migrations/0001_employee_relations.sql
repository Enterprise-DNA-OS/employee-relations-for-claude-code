-- Employee Relations for Claude Code: the HR case desk in plain tables.
-- People, cases (questions, statutory requests, complaints, grievances, protected disclosures,
-- investigations, disciplinary and performance matters), allegations and findings, the process
-- steps a fair decision rests on, interviews, evidence, warnings, and an append-only activity log.
-- Dates are calendar dates in the employer's own country. Statutory deadlines are worked out in
-- v_deadlines; every rule names its source in docs/compliance.md.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- House rules: the employer's own limits, changed with `set`. Laws live in docs/compliance.md.
create table settings (
  key text primary key,
  value text not null,
  note text not null default ''
);

create or replace function setting_num(k text, dflt numeric) returns numeric language sql stable as $$
  select coalesce((select value::numeric from settings where key = k), dflt)
$$;

-- New Zealand public holidays, for counting working days. Add more with `add-holiday`.
create table holidays (
  country text not null check (country in ('NZ', 'AU')),
  day date not null,
  name text not null,
  primary key (country, day)
);

-- A working day: not a weekend, not a listed holiday, and not in the summer close-down.
-- closedown 'privacy' is the Privacy Act 2020 s 7 period, 25 December to 15 January.
-- closedown 'legislation' is the Legislation Act 2019 s 13 period, 25 December to 2 January.
create or replace function is_working_day(d date, ctry text, closedown text) returns boolean language sql stable as $$
  select extract(isodow from d) < 6
     and not exists (select 1 from holidays h where h.country = ctry and h.day = d)
     and not (
       (closedown = 'privacy' and ((extract(month from d) = 12 and extract(day from d) >= 25) or (extract(month from d) = 1 and extract(day from d) <= 15)))
       or (closedown = 'legislation' and ((extract(month from d) = 12 and extract(day from d) >= 25) or (extract(month from d) = 1 and extract(day from d) <= 2)))
     )
$$;

-- The day that is n working days after start_day (start_day itself does not count).
create or replace function add_working_days(start_day date, n int, ctry text, closedown text) returns date language plpgsql stable as $$
declare
  d date := start_day;
  k int := 0;
begin
  while k < n loop
    d := d + 1;
    if is_working_day(d, ctry, closedown) then k := k + 1; end if;
  end loop;
  return d;
end $$;

create table people (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,16}$'),
  name text not null check (length(trim(name)) > 0),
  email text,
  job_title text,
  team text,
  manager_id uuid references people(id),
  country text not null check (country in ('NZ', 'AU')),
  state text check (state is null or state in ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  started_on date,
  left_on date,
  status text not null default 'active' check (status in ('active', 'left')),
  hr boolean not null default false,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'left') = (left_on is not null)),
  check (country = 'AU' or state is null),
  check (manager_id is null or manager_id <> id)
);

create sequence case_ref_seq start 1001;

create table cases (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default 'C-' || nextval('case_ref_seq'),
  kind text not null check (kind in ('question', 'request', 'flexible-work', 'parental-leave-extension', 'privacy-access',
    'statement-of-reasons', 'complaint', 'grievance', 'disclosure', 'investigation', 'disciplinary', 'performance')),
  title text not null check (length(trim(title)) > 0),
  person_id uuid references people(id),            -- the employee the case is about, or who asked
  raised_by_id uuid references people(id),         -- who raised it (complainant, discloser); null when anonymous
  handler_id uuid references people(id),           -- the HR person running it
  country text not null check (country in ('NZ', 'AU')),
  received_on date not null,
  occurred_on date,                                -- grievances: when the action happened or came to notice
  sexual_harassment boolean not null default false,
  protected boolean not null default false,        -- protected disclosure: the discloser's identity is withheld
  anonymous boolean not null default false,
  status text not null default 'open' check (status in ('open', 'investigating', 'decided', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  summary text,
  acknowledged_on date,
  decision text check (decision is null or decision in (
    'answered', 'approved', 'varied', 'refused', 'provided', 'granted', 'partial',
    'no-action', 'advice', 'coaching', 'resolved', 'not-upheld', 'upheld', 'referred',
    'verbal-warning', 'written-warning', 'final-warning', 'demotion', 'dismissal')),
  decision_on date,
  ground_code text,                                -- NZ flexible work: the s 69AAF(2) ground relied on
  reasons text,                                    -- why the decision was made, in the decision-maker's words
  override text,                                   -- reason a fairness step was overridden, logged
  outcome_told_on date,
  closed_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((decision is null) = (decision_on is null)),
  check (closed_on is null or status = 'closed'),
  check (status <> 'closed' or closed_on is not null),
  check (not (anonymous and raised_by_id is not null)),
  check (kind <> 'parental-leave-extension' or country = 'AU'),
  check (kind <> 'statement-of-reasons' or country = 'NZ'),
  check (decision_on is null or decision_on >= received_on),
  check (occurred_on is null or occurred_on <= received_on)
);
create index cases_person on cases (person_id);
create index cases_status on cases (status);

create table allegations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  n int not null,
  category text not null default 'misconduct' check (category in ('bullying', 'harassment', 'sexual-harassment', 'discrimination',
    'misconduct', 'safety', 'fraud', 'performance', 'other')),
  text text not null check (length(trim(text)) > 0),
  respondent_id uuid references people(id),
  finding text not null default 'open' check (finding in ('open', 'substantiated', 'partly-substantiated', 'not-substantiated', 'unable-to-determine')),
  finding_on date,
  finding_reasons text,
  unique (case_id, n),
  check ((finding = 'open') = (finding_on is null))
);

create table steps (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  kind text not null check (kind in ('acknowledged', 'concerns-notified', 'information-provided', 'support-person-offered',
    'response-invited', 'response-received', 'meeting-held', 'discussed', 'interim-measure', 'referred', 'outcome-told', 'discloser-updated')),
  on_date date not null,
  due_on date,
  detail text,
  actor text not null,
  created_at timestamptz not null default now(),
  check (kind <> 'response-invited' or due_on is not null),
  check (due_on is null or due_on >= on_date)
);
create index steps_case on steps (case_id, kind);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  person_id uuid references people(id),
  name text,                                       -- someone outside the people list (a customer, a contractor)
  role text not null check (role in ('complainant', 'respondent', 'witness', 'employee', 'discloser')),
  held_on date not null,
  support_person text,
  notes_location text,
  signed boolean not null default false,
  created_at timestamptz not null default now(),
  check (person_id is not null or name is not null)
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  n int not null,
  description text not null check (length(trim(description)) > 0),
  source text,
  received_on date not null,
  location text,
  unique (case_id, n)
);

create table warnings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  person_id uuid not null references people(id),
  level text not null check (level in ('verbal', 'written', 'final')),
  issued_on date not null,
  expires_on date not null,
  reason text not null,
  withdrawn_on date,
  withdrawn_reason text,
  check (expires_on > issued_on),
  check ((withdrawn_on is null) = (withdrawn_reason is null))
);

create table activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  ref text,
  detail text not null default ''
);

create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'activity is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

create trigger people_touch before update on people for each row execute function touch_updated_at();
create trigger cases_touch before update on cases for each row execute function touch_updated_at();

-- Read-only to everyone but the owner: a shared installation adds its own grants.
do $$
declare t text;
begin
  foreach t in array array['settings','holidays','people','cases','allegations','steps','interviews','evidence','warnings','activity']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ views

-- Every case with its people. A protected disclosure never shows who raised it.
create or replace view v_cases as
select c.*,
       p.code as person_code, p.name as person, p.team, m.name as manager,
       case when c.protected then 'withheld (protected disclosure)' when c.anonymous then 'anonymous' else rb.name end as raised_by,
       h.name as handler,
       (current_date - c.received_on) as age_days,
       coalesce((select max(a.at)::date from activity a where a.ref = c.ref), c.received_on) as last_touched
  from cases c
  left join people p on p.id = c.person_id
  left join people m on m.id = p.manager_id
  left join people rb on rb.id = c.raised_by_id
  left join people h on h.id = c.handler_id;

-- Every dated obligation on every case: the law, guidance and the house rules, with the source.
create or replace view v_deadlines as
with c as (select * from cases where status <> 'closed' or closed_on >= current_date - 365)
select c.id as case_id, c.ref, c.kind as case_kind, 'decide in writing' as obligation,
       (c.received_on + interval '1 month')::date as due_on, c.decision_on as met_on, 'law' as kind,
       'Respond in writing as soon as possible, no later than 1 month after the request' as rule,
       'Employment Relations Act 2000 (NZ) s 69AAE' as source
  from c where c.kind = 'flexible-work' and c.country = 'NZ'
union all
select c.id, c.ref, c.kind, 'respond in writing', c.received_on + 21, c.decision_on, 'law',
       'Give a written response within 21 days', 'Fair Work Act 2009 (Cth) s 65A'
  from c where c.kind = 'flexible-work' and c.country = 'AU'
union all
select c.id, c.ref, c.kind, 'respond in writing', c.received_on + 21, c.decision_on, 'law',
       'Give a written response to a request to extend unpaid parental leave within 21 days', 'Fair Work Act 2009 (Cth) s 76A'
  from c where c.kind = 'parental-leave-extension'
union all
select c.id, c.ref, c.kind, 'decide the access request', add_working_days(c.received_on, 20, 'NZ', 'privacy'), c.decision_on, 'law',
       'Decide and tell the requester within 20 working days (25 December to 15 January does not count)', 'Privacy Act 2020 (NZ) s 44 and s 7'
  from c where c.kind = 'privacy-access' and c.country = 'NZ'
union all
select c.id, c.ref, c.kind, 'answer the access request', c.received_on + setting_num('privacy_au_days', 30)::int, c.decision_on, 'house',
       'House rule: privacy_au_days', 'Employee records are generally exempt from the Privacy Act 1988 (Cth) s 7B(3); this is the employer''s own limit'
  from c where c.kind = 'privacy-access' and c.country = 'AU'
union all
select c.id, c.ref, c.kind, 'give the statement of reasons', c.received_on + 14, c.decision_on, 'law',
       'Provide a written statement of the reasons for dismissal within 14 days of the request', 'Employment Relations Act 2000 (NZ) s 120'
  from c where c.kind = 'statement-of-reasons'
union all
select c.id, c.ref, c.kind, 'acknowledge and deal with the disclosure', add_working_days(c.received_on, 20, 'NZ', 'legislation'),
       coalesce(c.decision_on, (select min(s.on_date) from steps s where s.case_id = c.id and s.kind = 'discloser-updated')), 'guidance',
       'Within 20 working days: acknowledge, consider, check whether it was made elsewhere, deal with it, and tell the discloser',
       'Protected Disclosures (Protection of Whistleblowers) Act 2022 (NZ) s 13'
  from c where c.kind = 'disclosure' and c.country = 'NZ'
union all
select c.id, c.ref, c.kind, 'acknowledge', c.received_on + setting_num('acknowledge_days', 3)::int, c.acknowledged_on, 'house',
       'House rule: acknowledge_days', 'The employer''s own limit'
  from c where c.kind in ('complaint', 'grievance', 'disclosure')
union all
select c.id, c.ref, c.kind, 'answer', c.received_on + setting_num('answer_days', 5)::int, c.decision_on, 'house',
       'House rule: answer_days', 'The employer''s own limit'
  from c where c.kind in ('question', 'request')
union all
select c.id, c.ref, c.kind, 'reach a decision', c.received_on + setting_num('investigation_days', 42)::int, c.decision_on, 'house',
       'House rule: investigation_days', 'The employer''s own limit'
  from c where c.kind in ('complaint', 'grievance', 'disclosure', 'investigation', 'disciplinary', 'performance')
union all
select c.id, c.ref, c.kind, 'employee response due', s.due_on,
       (select min(r.on_date) from steps r where r.case_id = c.id and r.kind = 'response-received' and r.on_date >= s.on_date), 'process',
       'The employee was given until this date to respond',
       case when c.country = 'NZ' then 'Employment Relations Act 2000 (NZ) s 103A(3)(c)' else 'Fair Work Act 2009 (Cth) s 387(c)' end
  from c join steps s on s.case_id = c.id and s.kind = 'response-invited';

-- Each obligation's standing today.
create or replace view v_deadline_status as
select d.*, v.title, v.person, v.handler, v.status as case_status,
       case when d.met_on is not null and d.met_on <= d.due_on then 'met'
            when d.met_on is not null then 'met late'
            when d.due_on < current_date then 'overdue'
            when d.due_on = current_date then 'due today'
            else 'due' end as standing,
       (d.due_on - current_date) as days_left
  from v_deadlines d join v_cases v on v.id = d.case_id;

-- Before an adverse outcome: what the record shows about a fair process.
-- s 103A(3) (NZ) and s 387 (AU) are tests a decision is judged by, not a form to fill. These are the
-- facts a decision-maker should be able to point to.
create or replace view v_fairness as
select c.id as case_id, c.ref, c.kind, c.country, c.status,
       (select min(on_date) from steps s where s.case_id = c.id and s.kind = 'concerns-notified') as concerns_notified,
       (select min(on_date) from steps s where s.case_id = c.id and s.kind = 'information-provided') as information_provided,
       (select min(on_date) from steps s where s.case_id = c.id and s.kind = 'support-person-offered') as support_offered,
       (select max(on_date) from steps s where s.case_id = c.id and s.kind = 'response-invited') as response_invited,
       (select max(due_on) from steps s where s.case_id = c.id and s.kind = 'response-invited') as response_due,
       (select max(on_date) from steps s where s.case_id = c.id and s.kind = 'response-received') as response_received,
       (select count(*)::int from allegations a where a.case_id = c.id) as allegations,
       (select count(*)::int from allegations a where a.case_id = c.id and a.finding = 'open') as open_findings
  from cases c
 where c.kind in ('investigation', 'disciplinary', 'performance');

create or replace view v_fairness_gaps as
select f.case_id, f.ref, 'hard' as weight, 'concerns not put to the employee in writing' as gap,
       case when f.country = 'NZ' then 'Employment Relations Act 2000 (NZ) s 103A(3)(b)' else 'Fair Work Act 2009 (Cth) s 387(b)' end as source
  from v_fairness f where f.concerns_notified is null
union all
select f.case_id, f.ref, 'hard', 'no opportunity to respond yet',
       case when f.country = 'NZ' then 'Employment Relations Act 2000 (NZ) s 103A(3)(c)' else 'Fair Work Act 2009 (Cth) s 387(c)' end
  from v_fairness f where f.response_invited is null or (f.response_received is null and f.response_due >= current_date)
union all
select f.case_id, f.ref, 'soft', 'relevant information not given to the employee',
       'Employment Relations Act 2000 (NZ) s 4(1A)(c)'
  from v_fairness f where f.information_provided is null and f.country = 'NZ'
union all
select f.case_id, f.ref, 'soft', 'support person not offered',
       case when f.country = 'NZ' then 'Good practice; part of a fair process under Employment Relations Act 2000 (NZ) s 103A' else 'Fair Work Act 2009 (Cth) s 387(d)' end
  from v_fairness f where f.support_offered is null
union all
select f.case_id, f.ref, 'soft', f.open_findings || ' allegation(s) without a finding',
       case when f.country = 'NZ' then 'Employment Relations Act 2000 (NZ) s 103A(3)(a)' else 'Fair Work Act 2009 (Cth) s 387(a)' end
  from v_fairness f where f.open_findings > 0;

-- Warnings with their standing.
create or replace view v_warnings as
select w.*, p.code as person_code, p.name as person, p.team, c.ref,
       case when w.withdrawn_on is not null then 'withdrawn'
            when w.expires_on < current_date then 'expired'
            else 'live' end as standing,
       (w.expires_on - current_date) as days_left
  from warnings w join people p on p.id = w.person_id join cases c on c.id = w.case_id;

-- After an adverse decision, how long the employee has to challenge it.
create or replace view v_windows as
select c.id as case_id, c.ref, p.name as person, c.decision, c.country,
       coalesce(c.outcome_told_on, c.decision_on) as from_day,
       case when c.country = 'NZ' then coalesce(c.outcome_told_on, c.decision_on) + 90
            else coalesce(c.outcome_told_on, c.decision_on) + 21 end as window_ends,
       case when c.country = 'NZ' then 'Personal grievance raised within 90 days: Employment Relations Act 2000 (NZ) s 114(1)'
            else 'Unfair dismissal or general protections application within 21 days: Fair Work Act 2009 (Cth) s 394(2), s 366(1)' end as rule
  from cases c join people p on p.id = c.person_id
 where c.decision in ('verbal-warning', 'written-warning', 'final-warning', 'demotion', 'dismissal')
   and (c.country = 'NZ' or c.decision = 'dismissal');

-- Every problem with a case, in one place: the CLI, the views and the documents all read this.
create or replace view v_case_problems as
select d.case_id, d.ref, case when d.kind = 'law' then 'law' when d.kind = 'guidance' then 'guidance' else 'house' end as kind,
       d.obligation || ' overdue since ' || d.due_on as problem, d.source as rule
  from v_deadline_status d
 where d.standing = 'overdue' and d.kind in ('law', 'guidance', 'house') and d.case_status <> 'closed'
union all
select c.id, c.ref, 'law', 'refused without a ground from s 69AAF(2)', 'Employment Relations Act 2000 (NZ) s 69AAE and s 69AAF'
  from cases c where c.kind = 'flexible-work' and c.country = 'NZ' and c.decision = 'refused' and c.ground_code is null
union all
select c.id, c.ref, 'law', 'refused without a recorded discussion with the employee',
       case when c.kind = 'flexible-work' then 'Fair Work Act 2009 (Cth) s 65A' else 'Fair Work Act 2009 (Cth) s 76A' end
  from cases c where c.kind in ('flexible-work', 'parental-leave-extension') and c.country = 'AU' and c.decision = 'refused'
   and not exists (select 1 from steps s where s.case_id = c.id and s.kind = 'discussed' and s.on_date <= c.decision_on)
union all
select c.id, c.ref, 'law', 'refused without written reasons', 'Fair Work Act 2009 (Cth) s 65A and s 76A; Employment Relations Act 2000 (NZ) s 69AAE'
  from cases c where c.kind in ('flexible-work', 'parental-leave-extension') and c.decision = 'refused' and coalesce(trim(c.reasons), '') = ''
union all
select g.case_id, g.ref, 'fairness', 'decided with a gap: ' || g.gap, g.source
  from v_fairness_gaps g join cases c on c.id = g.case_id
 where c.decision in ('verbal-warning', 'written-warning', 'final-warning', 'demotion', 'dismissal')
union all
select c.id, c.ref, 'note',
       'raised ' || (c.received_on - c.occurred_on) || ' days after the event, outside the ' || case when c.sexual_harassment then '12-month' else '90-day' end || ' window',
       'Employment Relations Act 2000 (NZ) s 114(1), (3) and (7): the employer may consent, or the Authority may grant leave'
  from cases c where c.kind = 'grievance' and c.country = 'NZ' and c.occurred_on is not null
   and c.received_on > case when c.sexual_harassment then (c.occurred_on + interval '12 months')::date - 1 else c.occurred_on + 89 end
union all
select v.id, v.ref, 'house', 'no handler', 'House rule: every open case has a handler'
  from v_cases v where v.status <> 'closed' and v.handler_id is null
union all
select v.id, v.ref, 'house', 'untouched for ' || (current_date - v.last_touched) || ' days', 'House rule: stale_days'
  from v_cases v where v.status in ('open', 'investigating') and current_date - v.last_touched > setting_num('stale_days', 14)
union all
select c.id, c.ref, 'house', 'decided, the person has not been told', 'House rule: tell the outcome before closing'
  from cases c where c.status = 'decided' and c.outcome_told_on is null;
