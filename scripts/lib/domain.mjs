// The rules of the HR case desk. scripts/cases.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// A protected disclosure never shows who raised it, in any command, view or document.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick, yesNo } from './csv.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}
// Salesforce report dates: "21/10/2026", "21/10/2026 9:15 am", "2026-10-21T09:15:00.000Z".
export function looseDate(v, label) {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return date(m[1], label);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, label);
  throw Error(`${label} "${s}" is not a date`);
}

function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isInteger(n) || n < min || n > max) throw Error(`--${label} must be a whole number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);
const flag = (v) => v === true || yesNo(v);

export const KINDS = ['question', 'request', 'flexible-work', 'parental-leave-extension', 'privacy-access', 'statement-of-reasons',
  'complaint', 'grievance', 'disclosure', 'investigation', 'disciplinary', 'performance'];
const REQUESTS = ['question', 'request', 'flexible-work', 'parental-leave-extension', 'privacy-access', 'statement-of-reasons'];
const CONDUCT = ['investigation', 'disciplinary', 'performance'];
const CONCERNS = ['complaint', 'grievance', 'disclosure'];
const ADVERSE = ['verbal-warning', 'written-warning', 'final-warning', 'demotion', 'dismissal'];
const STEPS = ['acknowledged', 'concerns-notified', 'information-provided', 'support-person-offered', 'response-invited', 'response-received',
  'meeting-held', 'discussed', 'interim-measure', 'referred', 'outcome-told', 'discloser-updated'];
const CATEGORIES = ['bullying', 'harassment', 'sexual-harassment', 'discrimination', 'misconduct', 'safety', 'fraud', 'performance', 'other'];
const FINDINGS = ['substantiated', 'partly-substantiated', 'not-substantiated', 'unable-to-determine'];
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
// Employment Relations Act 2000 (NZ) s 69AAF(2): the only grounds a flexible working request may be refused on.
export const NZ_FLEX_GROUNDS = {
  'reorganise': 'inability to reorganise work among existing staff',
  'recruit': 'inability to recruit additional staff',
  'quality': 'detrimental impact on quality',
  'performance': 'detrimental impact on performance',
  'insufficient-work': 'insufficiency of work during the periods the employee proposes to work',
  'structural-change': 'planned structural changes',
  'cost': 'burden of additional costs',
  'customer-demand': 'detrimental effect on ability to meet customer demand',
  'collective-agreement': 'the request is inconsistent with a collective agreement that binds the employee (s 69AAF(3))',
};
export const SETTINGS = ['acknowledge_days', 'answer_days', 'investigation_days', 'response_days', 'stale_days', 'privacy_au_days',
  'warning_verbal_months', 'warning_written_months', 'warning_final_months'];

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}

// Resolve one record from a code, reference, id prefix or name. Exact (case-insensitive) beats
// partial; more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const person = async (db, term) => choose(await db.query('select * from people order by code'), term, 'Person', (r) => [r.code, r.name, r.email, r.id]);
export const theCase = async (db, term) => choose(await db.query('select * from v_cases order by ref'), term, 'Case', (r) => [r.ref, r.title, r.id]);
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);
const addDays = async (db, d, n) => (await db.query('select ($1::date + $2::int)::text as d', [d, n]))[0].d;
const addMonths = async (db, d, n) => (await db.query(`select ($1::date + ($2::int || ' months')::interval)::date::text as d`, [d, n]))[0].d;

function outDir(sub) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, sub);
  mkdirSync(dir, { recursive: true });
  return dir;
}
function draftFile(name, body) {
  const file = path.join(outDir('drafts'), name);
  writeFileSync(file, body);
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}

// Remove the person who raised a protected disclosure from anything shown.
function shield(c) {
  if (!c?.protected) return c;
  const { raised_by_id, ...rest } = c;
  return rest;
}
const caseRow = (c) => ({ ref: c.ref, kind: c.kind, title: c.title, person: c.person, raised_by: c.raised_by, handler: c.handler,
  country: c.country, status: c.status, received_on: c.received_on, age_days: c.age_days });

// ------------------------------------------------------------------ reads

export const QUESTIONS = [
  ['How many days from receipt to decision, by kind of case, over the last 12 months?',
    `select kind, count(*)::int as decided, round(avg(decision_on - received_on))::int as avg_days, max(decision_on - received_on) as longest
       from cases where decision_on >= current_date - 365 group by kind order by avg_days desc`],
  ['Which statutory deadlines were missed or met late, by rule?',
    `select source as rule, obligation, count(*) filter (where standing = 'met late')::int as met_late, count(*) filter (where standing = 'overdue')::int as overdue
       from v_deadline_status where kind in ('law', 'guidance') group by source, obligation
       having count(*) filter (where standing in ('met late', 'overdue')) > 0 order by overdue desc, met_late desc`],
  ['Which managers have the most complaints, grievances and investigations in their team over 12 months?',
    `select coalesce(manager, '(no manager)') as manager, team, count(*)::int as cases, string_agg(ref, ', ' order by ref) as refs
       from v_cases where kind in ('complaint', 'grievance', 'investigation', 'disciplinary') and received_on >= current_date - 365
      group by manager, team order by cases desc, manager`],
  ['Who holds more than one live warning?',
    `select person_code as code, person, team, count(*)::int as live, string_agg(level || ' to ' || expires_on, '; ' order by expires_on) as warnings
       from v_warnings where standing = 'live' group by person_code, person, team having count(*) > 1 order by live desc`],
  ['How often are allegations substantiated, by category?',
    `select category, count(*)::int as allegations, count(*) filter (where finding in ('substantiated', 'partly-substantiated'))::int as substantiated,
            count(*) filter (where finding = 'open')::int as open
       from allegations group by category order by allegations desc`],
  ['Which flexible work requests were refused, on what grounds, and in which team?',
    `select ref, person, team, country, decision_on, coalesce(ground_code, '-') as ground, reasons from v_cases
      where kind in ('flexible-work', 'parental-leave-extension') and decision = 'refused' order by decision_on desc`],
  ['Which HR handlers carry the most open cases, and how old is the oldest?',
    `select coalesce(handler, '(none)') as handler, count(*)::int as open, max(age_days) as oldest_days,
            (select count(*)::int from v_deadline_status d where d.handler is not distinct from v.handler and d.standing = 'overdue' and d.case_status <> 'closed') as overdue
       from v_cases v where status <> 'closed' group by handler order by open desc`],
  ['Who is named as a respondent in more than one case?',
    `select p.code, p.name, p.team, count(distinct a.case_id)::int as cases, string_agg(distinct c.ref, ', ') as refs
       from allegations a join people p on p.id = a.respondent_id join cases c on c.id = a.case_id
      group by p.code, p.name, p.team having count(distinct a.case_id) > 1 order by cases desc`],
  ['Which adverse decisions were made with a fairness step overridden or missing?',
    `select c.ref, p.name as person, c.decision, c.decision_on, coalesce(c.override, '(none given)') as override,
            (select string_agg(g.gap, '; ') from v_fairness_gaps g where g.case_id = c.id) as gaps
       from cases c join people p on p.id = c.person_id
      where c.decision in ('verbal-warning', 'written-warning', 'final-warning', 'demotion', 'dismissal')
        and (c.override is not null or exists (select 1 from v_fairness_gaps g where g.case_id = c.id)) order by c.decision_on desc`],
  ['Who raised a complaint or grievance and then became the subject of a disciplinary or performance case within 6 months?',
    `select p.code, p.name, r.ref as raised, r.received_on as raised_on, d.ref as then_subject_of, d.kind, d.received_on
       from cases r join cases d on d.person_id = r.raised_by_id and d.kind in ('disciplinary', 'performance', 'investigation')
        and d.received_on > r.received_on and d.received_on <= r.received_on + 183
       join people p on p.id = r.raised_by_id
      where r.kind in ('complaint', 'grievance', 'flexible-work') and not r.protected order by d.received_on desc`],
];

export const reads = {
  async attention(db) {
    return db.query(`
      select 1 as rank, 0 as k, case kind when 'law' then 'law' else 'guidance' end as item, ref, problem || ' (' || rule || ')' as detail
        from v_case_problems where kind in ('law', 'guidance')
      union all
      select 2, days_left, case days_left when 0 then 'due today' when 1 then 'due tomorrow' else 'due in ' || days_left || ' days' end, ref,
             obligation || ' by ' || due_on || ': ' || title || ' (' || source || ')'
        from v_deadline_status where standing in ('due', 'due today') and days_left <= 7 and kind in ('law', 'guidance', 'process') and case_status <> 'closed'
      union all
      select 3, 0, 'fairness gap', ref, problem from v_case_problems where kind = 'fairness' and ref in (select ref from cases where status <> 'closed')
      union all
      select 4, window_ends - current_date, 'challenge window open', ref, person || ', ' || decision || ': until ' || window_ends || ' (' || (window_ends - current_date) || ' days)'
        from v_windows where window_ends >= current_date
      union all
      select 5, 0, 'house rule', ref, problem from v_case_problems where kind = 'house'
      union all
      select 6, 0, 'note', ref, problem from v_case_problems where kind = 'note' and ref in (select ref from cases where status <> 'closed')
      union all
      select 7, days_left, 'warning expires soon', ref, person || ': ' || level || ' warning expires ' || expires_on from v_warnings where standing = 'live' and days_left <= 30
      order by rank, k, ref`).then((rows) => rows.map(({ rank, k, ...r }) => r));
  },

  async cases(db, args, f) {
    const where = [];
    const p = [];
    if (!f.all) where.push(`status <> 'closed'`);
    if (f.kind) { p.push(oneOf(f.kind, KINDS, 'kind')); where.push(`kind = $${p.length}`); }
    if (f.status) { p.push(oneOf(f.status, ['open', 'investigating', 'decided', 'closed'], 'status')); where.push(`status = $${p.length}`); }
    if (f.handler) { p.push((await person(db, f.handler)).id); where.push(`handler_id = $${p.length}`); }
    if (f.person) { p.push((await person(db, f.person)).id); where.push(`person_id = $${p.length}`); }
    const rows = await db.query(`select v.*, (select d.due_on::text || ' ' || d.obligation from v_deadline_status d where d.case_id = v.id and d.met_on is null order by d.due_on limit 1) as next_due
      from v_cases v ${where.length ? 'where ' + where.join(' and ') : ''} order by received_on, ref`, p);
    return rows.map((c) => ({ ref: c.ref, kind: c.kind, title: c.title, person: c.person, raised_by: c.raised_by, handler: c.handler, status: c.status, age_days: c.age_days, next_due: c.next_due }));
  },

  async case(db, args) {
    const c = await theCase(db, args[0]);
    const [allegations, steps, interviews, evidence, deadlines, problems, gaps, warnings, activity] = await Promise.all([
      db.query(`select a.n, a.category, a.text, r.name as respondent, a.finding, a.finding_on, a.finding_reasons from allegations a left join people r on r.id = a.respondent_id where a.case_id = $1 order by a.n`, [c.id]),
      db.query(`select on_date, kind, due_on, detail, actor from steps where case_id = $1 order by on_date, created_at`, [c.id]),
      db.query(`select i.held_on, coalesce(p.name, i.name) as who, i.role, i.support_person, i.signed, i.notes_location from interviews i left join people p on p.id = i.person_id where i.case_id = $1 order by i.held_on`, [c.id]),
      db.query(`select n, description, source, received_on, location from evidence where case_id = $1 order by n`, [c.id]),
      db.query(`select obligation, due_on, met_on, standing, kind, source from v_deadline_status where case_id = $1 order by due_on`, [c.id]),
      db.query(`select kind, problem, rule from v_case_problems where case_id = $1`, [c.id]),
      db.query(`select weight, gap, source from v_fairness_gaps where case_id = $1`, [c.id]),
      db.query(`select level, issued_on, expires_on, standing from v_warnings where case_id = $1`, [c.id]),
      db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, detail from activity where ref = $1 order by at`, [c.ref]),
    ]);
    const { id, person_id, handler_id, raised_by_id, external_id, created_at, updated_at, ...rest } = shield(c);
    return { case: rest, allegations, steps, interviews: c.protected ? interviews.map((i) => (i.role === 'discloser' ? { ...i, who: 'withheld (protected disclosure)' } : i)) : interviews,
      evidence, deadlines, problems, fairness: CONDUCT.includes(c.kind) ? gaps : [], warnings, activity };
  },

  async people(db, args, f) {
    return db.query(`select p.code, p.name, p.job_title, p.team, m.name as manager, p.country || coalesce(' ' || p.state, '') as location, p.status, p.hr,
        (select count(*)::int from cases c where c.person_id = p.id and c.status <> 'closed') as open_cases,
        (select count(*)::int from v_warnings w where w.person_id = p.id and w.standing = 'live') as live_warnings
      from people p left join people m on m.id = p.manager_id ${f.all ? '' : `where p.status = 'active'`} order by p.code`);
  },

  async person(db, args) {
    const p = await person(db, args[0]);
    return {
      person: { code: p.code, name: p.name, job_title: p.job_title, team: p.team, country: p.country, state: p.state, status: p.status, started_on: p.started_on, left_on: p.left_on },
      cases_about: await db.query(`select ref, kind, title, status, received_on, decision from cases where person_id = $1 order by received_on desc`, [p.id]),
      // A protected disclosure never appears against the person who made it.
      cases_raised: await db.query(`select ref, kind, title, status, received_on from cases where raised_by_id = $1 and person_id is distinct from $1 and not protected order by received_on desc`, [p.id]),
      named_in: await db.query(`select c.ref, a.n, a.category, a.finding from allegations a join cases c on c.id = a.case_id where a.respondent_id = $1 order by c.ref`, [p.id]),
      warnings: await db.query(`select ref, level, issued_on, expires_on, standing from v_warnings where person_id = $1 order by issued_on desc`, [p.id]),
    };
  },

  async deadlines(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 365 }) : 30;
    const due = await db.query(`select due_on, ref, obligation, standing, days_left, kind, title, handler, source from v_deadline_status
      where met_on is null and case_status <> 'closed' and due_on <= current_date + $1::int order by due_on, ref`, [days]);
    const windows = await db.query(`select window_ends, ref, person, decision, rule from v_windows where window_ends >= current_date order by window_ends`);
    return { due, challenge_windows: windows };
  },

  async fairness(db, args) {
    const c = await theCase(db, args[0]);
    if (!CONDUCT.includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}. The fairness check is for investigations, disciplinary and performance cases.`);
    const [facts] = await db.query(`select concerns_notified, information_provided, support_offered, response_invited, response_due, response_received, allegations, open_findings from v_fairness where case_id = $1`, [c.id]);
    const gaps = await db.query(`select weight, gap, source from v_fairness_gaps where case_id = $1 order by weight, gap`, [c.id]);
    return { case: { ref: c.ref, title: c.title, person: c.person, country: c.country },
      ready: gaps.length ? (gaps.some((g) => g.weight === 'hard') ? 'no: an adverse outcome would be refused' : 'only with --override and a reason') : 'yes', facts, gaps };
  },

  async warnings(db, args, f) {
    return db.query(`select person_code as code, person, team, level, issued_on, expires_on, days_left, standing, ref, reason from v_warnings
      ${f.all ? '' : `where standing = 'live'`} order by expires_on`);
  },

  async workload(db) {
    return db.query(`select coalesce(h.name, '(no handler)') as handler, count(c.*)::int as open_cases,
        count(*) filter (where c.kind in ('investigation', 'disciplinary', 'performance', 'complaint', 'grievance', 'disclosure'))::int as casework,
        count(*) filter (where c.kind in ('question', 'request', 'flexible-work', 'parental-leave-extension', 'privacy-access', 'statement-of-reasons'))::int as requests,
        max(current_date - c.received_on) as oldest_days,
        (select count(*)::int from v_deadline_status d where d.handler is not distinct from h.name and d.standing = 'overdue' and d.case_status <> 'closed') as overdue
      from cases c left join people h on h.id = c.handler_id where c.status <> 'closed' group by h.name order by open_cases desc`);
  },

  async compliance(db) {
    return db.query(`select kind, rule, count(*)::int as cases, min(ref) as first, (array_agg(problem order by ref))[1] as example
      from v_case_problems group by kind, rule
      order by case kind when 'law' then 1 when 'guidance' then 2 when 'fairness' then 3 when 'house' then 4 else 5 end, cases desc, rule`);
  },

  async insights(db) {
    const out = [];
    for (const [question, sql] of QUESTIONS) out.push({ question, rows: await db.query(sql) });
    return out;
  },

  async activity(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 7;
    return db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, ref, detail from activity where at >= now() - ($1::int || ' days')::interval order by at desc`, [days]);
  },

  async holidays(db, args, f) {
    return db.query(`select day, country, name from holidays where day >= current_date - 30 order by day`);
  },
};

// ------------------------------------------------------------------ writes

const decisionRules = (c) => {
  if (c.kind === 'flexible-work' && c.country === 'NZ') return ['approved', 'refused'];
  if (['flexible-work', 'parental-leave-extension'].includes(c.kind)) return ['approved', 'varied', 'refused'];
  if (c.kind === 'privacy-access') return ['granted', 'partial', 'refused'];
  if (c.kind === 'statement-of-reasons') return ['provided'];
  if (['question', 'request'].includes(c.kind)) return ['answered'];
  if (CONCERNS.includes(c.kind)) return ['upheld', 'not-upheld', 'resolved', 'referred', 'no-action'];
  return ['no-action', 'advice', 'coaching', 'referred', ...ADVERSE];
};

export const writes = {
  async 'add-person'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'country');
    const country = oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country');
    const state = f.state ? oneOf(String(f.state).toUpperCase(), STATES, 'state') : null;
    if (country === 'NZ' && state) throw Error('--state is for Australian employees only');
    const manager = f.manager ? (await person(db, f.manager)).id : null;
    const code = String(f.code).toUpperCase();
    if (!/^[A-Z0-9-]{2,16}$/.test(code)) throw Error('--code must be 2 to 16 letters, digits or dashes');
    return tx(db, async () => {
      const [p] = await db.query(`insert into people (code, name, email, job_title, team, manager_id, country, state, started_on, hr)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning code, name, country, state`,
        [code, String(f.name).trim(), text(f.email), text(f.title), text(f.team), manager, country, state, f.started ? date(f.started, 'started') : null, flag(f.hr)]);
      await log(db, actor, 'add-person', p.code, p.name);
      return p;
    });
  },

  async 'person-status'(db, args, f) {
    const actor = actorOf(f);
    const p = await person(db, args[0]);
    const status = oneOf(f.status, ['active', 'left'], 'status');
    const on = status === 'left' ? (f.date ? date(f.date, 'date') : today()) : null;
    return tx(db, async () => {
      await db.query('update people set status = $2, left_on = $3 where id = $1', [p.id, status, on]);
      await log(db, actor, 'person-status', p.code, `${status}${on ? ' ' + on : ''}${f.reason ? ': ' + f.reason : ''}`);
      return { person: p.name, status, left_on: on,
        open_cases: await db.query(`select ref, kind, title from cases where (person_id = $1 or handler_id = $1) and status <> 'closed'`, [p.id]) };
    });
  },

  async 'open-case'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'kind', 'title');
    const kind = oneOf(f.kind, KINDS, 'kind');
    const subject = f.person ? await person(db, f.person) : null;
    const anonymous = flag(f.anonymous);
    const raisedBy = f['raised-by'] && !anonymous ? await person(db, f['raised-by']) : null;
    const handler = f.handler ? await person(db, f.handler) : null;
    if (REQUESTS.includes(kind) && !subject) throw Error(`A ${kind} needs --person (who asked)`);
    if (CONDUCT.includes(kind) && !subject) throw Error(`A ${kind} case needs --person (the employee it is about)`);
    const country = f.country ? oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country') : subject?.country || raisedBy?.country;
    if (!country) throw Error('--country is required when no --person is named');
    const received = f.received ? date(f.received, 'received') : today();
    const occurred = f.occurred ? date(f.occurred, 'occurred') : null;
    if (kind === 'grievance' && country === 'NZ' && !occurred) throw Error('A New Zealand grievance needs --occurred: the date the action happened or came to the employee\'s notice (s 114)');
    if (kind === 'parental-leave-extension' && country !== 'AU') throw Error('A request to extend unpaid parental leave under s 76 is an Australian right. Log a New Zealand request as a request.');
    if (kind === 'statement-of-reasons' && country !== 'NZ') throw Error('The statement of reasons for dismissal is s 120 of the New Zealand Act. Log an Australian request as a request.');
    const isProtected = kind === 'disclosure' ? f.protected === undefined || flag(f.protected) : flag(f.protected);
    if (isProtected && !raisedBy && !anonymous) throw Error('A protected disclosure needs --raised-by (kept confidential) or --anonymous');
    const requester = REQUESTS.includes(kind) ? subject : raisedBy;
    return tx(db, async () => {
      const [c] = await db.query(`insert into cases (kind, title, person_id, raised_by_id, handler_id, country, received_on, occurred_on, sexual_harassment, protected, anonymous, priority, summary)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id, ref`,
        [kind, String(f.title).trim(), subject?.id || null, requester?.id || null, handler?.id || null, country, received, occurred,
          flag(f['sexual-harassment']), isProtected, anonymous, f.priority ? oneOf(f.priority, ['low', 'normal', 'high'], 'priority') : 'normal', text(f.summary)]);
      await log(db, actor, 'open-case', c.ref, `${kind}: ${String(f.title).trim()}`);
      return { ref: c.ref, kind, country, received_on: received,
        deadlines: await db.query(`select obligation, due_on, kind, source from v_deadlines where case_id = $1 order by due_on`, [c.id]),
        problems: await db.query(`select kind, problem, rule from v_case_problems where case_id = $1`, [c.id]) };
    });
  },

  async assign(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'handler');
    const h = await person(db, f.handler);
    if (!h.hr) throw Error(`${h.name} is not marked as HR. Run add-person with --hr, or choose someone in HR.`);
    return tx(db, async () => {
      await db.query('update cases set handler_id = $2 where id = $1', [c.id, h.id]);
      await log(db, actor, 'assign', c.ref, h.name);
      return { ref: c.ref, handler: h.name };
    });
  },

  async acknowledge(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    const on = f.date ? date(f.date, 'date') : today();
    if (on < c.received_on) throw Error(`${c.ref} was received ${c.received_on}; it cannot be acknowledged before that`);
    return tx(db, async () => {
      await db.query('update cases set acknowledged_on = coalesce(acknowledged_on, $2) where id = $1', [c.id, on]);
      await db.query(`insert into steps (case_id, kind, on_date, detail, actor) values ($1, 'acknowledged', $2, $3, $4)`, [c.id, on, text(f.detail), actor]);
      await log(db, actor, 'acknowledge', c.ref, on);
      return { ref: c.ref, acknowledged_on: on };
    });
  },

  async step(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'kind');
    const kind = oneOf(f.kind, STEPS, 'kind');
    if (c.status === 'closed') throw Error(`${c.ref} is closed`);
    const on = f.date ? date(f.date, 'date') : today();
    if (on < c.received_on) throw Error(`${c.ref} was received ${c.received_on}; a step cannot come before that`);
    let due = f.due ? date(f.due, 'due') : null;
    if (kind === 'response-invited' && !due) due = await addDays(db, on, await setting(db, 'response_days', 5));
    if (due && due < on) throw Error('--due cannot be before --date');
    if (kind === 'response-received' && !(await db.query(`select 1 from steps where case_id = $1 and kind = 'response-invited' and on_date <= $2`, [c.id, on])).length) {
      throw Error(`Record response-invited first: the employee is asked to respond, then responds.`);
    }
    if (kind === 'outcome-told' && !c.decision) throw Error(`${c.ref} has no decision yet. Record it with decide or respond first.`);
    return tx(db, async () => {
      await db.query(`insert into steps (case_id, kind, on_date, due_on, detail, actor) values ($1,$2,$3,$4,$5,$6)`, [c.id, kind, on, due, text(f.detail), actor]);
      if (kind === 'concerns-notified' && c.status === 'open') await db.query(`update cases set status = 'investigating' where id = $1`, [c.id]);
      if (kind === 'outcome-told') await db.query('update cases set outcome_told_on = coalesce(outcome_told_on, $2) where id = $1', [c.id, on]);
      if (kind === 'acknowledged') await db.query('update cases set acknowledged_on = coalesce(acknowledged_on, $2) where id = $1', [c.id, on]);
      await log(db, actor, 'step', c.ref, `${kind} ${on}${due ? ' due ' + due : ''}`);
      const result = { ref: c.ref, step: kind, on_date: on };
      if (due) result.due_on = due;
      if (CONDUCT.includes(c.kind)) result.fairness_gaps = await db.query(`select weight, gap from v_fairness_gaps where case_id = $1`, [c.id]);
      return result;
    });
  },

  async allegation(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'text');
    if (![...CONDUCT, ...CONCERNS].includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}; allegations belong to complaints, grievances, disclosures and conduct cases`);
    const category = f.category ? oneOf(f.category, CATEGORIES, 'category') : 'misconduct';
    const respondent = f.respondent ? await person(db, f.respondent) : CONDUCT.includes(c.kind) ? { id: c.person_id, name: c.person } : null;
    return tx(db, async () => {
      const [{ n }] = await db.query('select coalesce(max(n), 0) + 1 as n from allegations where case_id = $1', [c.id]);
      await db.query(`insert into allegations (case_id, n, category, text, respondent_id) values ($1,$2,$3,$4,$5)`, [c.id, n, category, String(f.text).trim(), respondent?.id || null]);
      await log(db, actor, 'allegation', c.ref, `${n}: ${category}`);
      return { ref: c.ref, n, category, respondent: respondent?.name || null };
    });
  },

  async finding(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'n', 'finding', 'reasons');
    const n = num(f.n, 'n', { min: 1, max: 999 });
    const finding = oneOf(f.finding, FINDINGS, 'finding');
    const on = f.date ? date(f.date, 'date') : today();
    const [a] = await db.query('select * from allegations where case_id = $1 and n = $2', [c.id, n]);
    if (!a) throw Error(`${c.ref} has no allegation ${n}`);
    if (CONDUCT.includes(c.kind)) {
      const gaps = await db.query(`select gap from v_fairness_gaps where case_id = $1 and weight = 'hard'`, [c.id]);
      if (gaps.length) throw Error(`Not yet: ${gaps.map((g) => g.gap).join('; ')}. A finding against the employee comes after they have heard the allegation and had the chance to respond.`);
    }
    return tx(db, async () => {
      await db.query('update allegations set finding = $3, finding_on = $4, finding_reasons = $5 where case_id = $1 and n = $2', [c.id, n, finding, on, String(f.reasons).trim()]);
      await log(db, actor, 'finding', c.ref, `allegation ${n} ${finding}`);
      return { ref: c.ref, n, finding, on };
    });
  },

  async interview(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'role');
    const role = oneOf(f.role, ['complainant', 'respondent', 'witness', 'employee', 'discloser'], 'role');
    if (!f.person && !f.name) throw Error('Name who was interviewed: --person (an employee) or --name (anyone else)');
    const p = f.person ? await person(db, f.person) : null;
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      await db.query(`insert into interviews (case_id, person_id, name, role, held_on, support_person, notes_location, signed) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [c.id, p?.id || null, p ? null : String(f.name).trim(), role, on, text(f.support), text(f.notes), flag(f.signed)]);
      await log(db, actor, 'interview', c.ref, c.protected && role === 'discloser' ? 'discloser interviewed' : `${role} ${p?.name || f.name}`);
      return { ref: c.ref, role, held_on: on };
    });
  },

  async evidence(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'description');
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      const [{ n }] = await db.query('select coalesce(max(n), 0) + 1 as n from evidence where case_id = $1', [c.id]);
      await db.query(`insert into evidence (case_id, n, description, source, received_on, location) values ($1,$2,$3,$4,$5,$6)`,
        [c.id, n, String(f.description).trim(), text(f.source), on, text(f.location)]);
      await log(db, actor, 'evidence', c.ref, `${n}: ${String(f.description).trim()}`);
      return { ref: c.ref, n };
    });
  },

  // The outcome of a complaint, grievance, disclosure or conduct case.
  async decide(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    if (REQUESTS.includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}. Record the answer with respond.`);
    if (c.decision) throw Error(`${c.ref} was already decided (${c.decision} on ${c.decision_on})`);
    need(f, 'outcome', 'reasons');
    const outcome = oneOf(f.outcome, decisionRules(c), 'outcome');
    const on = f.date ? date(f.date, 'date') : today();
    if (on < c.received_on) throw Error(`--date is before ${c.ref} was received`);
    let override = null;
    if (ADVERSE.includes(outcome)) {
      const gaps = await db.query('select weight, gap, source from v_fairness_gaps where case_id = $1 order by weight', [c.id]);
      const hard = gaps.filter((g) => g.weight === 'hard');
      if (hard.length) throw Error(`Refused: ${hard.map((g) => `${g.gap} (${g.source})`).join('; ')}. This cannot be overridden.`);
      if (gaps.length) {
        if (!text(f.override)) throw Error(`Refused: ${gaps.map((g) => `${g.gap} (${g.source})`).join('; ')}. Record the step, or give --override="<the reason>" and it is kept on the case.`);
        override = String(f.override).trim();
      }
    }
    return tx(db, async () => {
      await db.query(`update cases set decision = $2, decision_on = $3, reasons = $4, override = $5, status = 'decided' where id = $1`, [c.id, outcome, on, String(f.reasons).trim(), override]);
      let warning = null;
      const level = { 'verbal-warning': 'verbal', 'written-warning': 'written', 'final-warning': 'final' }[outcome];
      if (level) {
        const months = await setting(db, `warning_${level}_months`, level === 'verbal' ? 6 : 12);
        const expires = f.expires ? date(f.expires, 'expires') : await addMonths(db, on, months);
        await db.query(`insert into warnings (case_id, person_id, level, issued_on, expires_on, reason) values ($1,$2,$3,$4,$5,$6)`, [c.id, c.person_id, level, on, expires, c.title]);
        warning = { level, expires_on: expires };
      }
      await log(db, actor, 'decide', c.ref, `${outcome}${override ? ' (override: ' + override + ')' : ''}`);
      const [w] = await db.query('select window_ends, rule from v_windows where case_id = $1', [c.id]);
      return { ref: c.ref, decision: outcome, on, warning, override, challenge_window: w || null, next: 'Tell the person with step --kind=outcome-told, then close' };
    });
  },

  // The written answer to a question, request or statutory request.
  async respond(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    if (!REQUESTS.includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}. Record the outcome with decide.`);
    if (c.decision) throw Error(`${c.ref} was already answered (${c.decision} on ${c.decision_on})`);
    need(f, 'decision');
    const decision = oneOf(f.decision, decisionRules(c), 'decision');
    const on = f.date ? date(f.date, 'date') : today();
    if (on < c.received_on) throw Error(`--date is before ${c.ref} was received`);
    const reasons = text(f.reasons);
    let ground = null;
    if (decision === 'refused' && c.kind === 'flexible-work' && c.country === 'NZ') {
      need(f, 'ground', 'reasons');
      ground = oneOf(f.ground, Object.keys(NZ_FLEX_GROUNDS), 'ground');
    }
    if (decision === 'refused' && ['flexible-work', 'parental-leave-extension'].includes(c.kind) && c.country === 'AU') {
      need(f, 'reasons');
      const talked = await db.query(`select 1 from steps where case_id = $1 and kind = 'discussed' and on_date <= $2`, [c.id, on]);
      if (!talked.length) throw Error(`Refused: the record shows no discussion with the employee before refusing (${c.kind === 'flexible-work' ? 's 65A' : 's 76A'} of the Fair Work Act 2009). Record step --kind=discussed first.`);
    }
    if (['partial', 'refused'].includes(decision) && c.kind === 'privacy-access') need(f, 'reasons');
    if (c.kind === 'statement-of-reasons') need(f, 'reasons');
    return tx(db, async () => {
      await db.query(`update cases set decision = $2, decision_on = $3, reasons = $4, ground_code = $5, status = 'decided' where id = $1`, [c.id, decision, on, reasons, ground]);
      await log(db, actor, 'respond', c.ref, `${decision}${ground ? ' on ' + ground : ''}`);
      const met = await db.query(`select obligation, due_on, standing, source from v_deadline_status where case_id = $1 and kind in ('law', 'house')`, [c.id]);
      return { ref: c.ref, decision, on, ground: ground ? NZ_FLEX_GROUNDS[ground] : null, deadlines: met, next: `Draft the letter with draft-response ${c.ref}` };
    });
  },

  async close(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    if (c.status === 'closed') throw Error(`${c.ref} is already closed`);
    if (!c.decision && !text(f.withdrawn)) throw Error(`${c.ref} has no decision. Record one with ${REQUESTS.includes(c.kind) ? 'respond' : 'decide'}, or close it with --withdrawn="<why>"`);
    const open = (await db.query(`select n from allegations where case_id = $1 and finding = 'open'`, [c.id])).map((r) => r.n);
    if (open.length && !text(f.withdrawn)) throw Error(`Allegation(s) ${open.join(', ')} have no finding yet`);
    if (c.decision && !c.outcome_told_on && !REQUESTS.includes(c.kind)) throw Error(`${c.person || 'The person'} has not been told the outcome. Record step --kind=outcome-told first.`);
    if (c.kind === 'disclosure' && c.decision && !c.anonymous && !(await db.query(`select 1 from steps where case_id = $1 and kind = 'discloser-updated'`, [c.id])).length) {
      throw Error('Tell the discloser what was done before closing (Protected Disclosures Act 2022 s 13). Record step --kind=discloser-updated.');
    }
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      await db.query(`update cases set status = 'closed', closed_on = $2, summary = coalesce(summary, '') || $3 where id = $1`,
        [c.id, on, text(f.withdrawn) ? `\nWithdrawn: ${String(f.withdrawn).trim()}` : '']);
      await log(db, actor, 'close', c.ref, text(f.withdrawn) ? `withdrawn: ${f.withdrawn}` : c.decision);
      return { ref: c.ref, closed_on: on };
    });
  },

  async 'withdraw-warning'(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'reason');
    const [w] = await db.query(`select * from warnings where case_id = $1 and withdrawn_on is null`, [c.id]);
    if (!w) throw Error(`${c.ref} has no warning in force`);
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      await db.query('update warnings set withdrawn_on = $2, withdrawn_reason = $3 where id = $1', [w.id, on, String(f.reason).trim()]);
      await log(db, actor, 'withdraw-warning', c.ref, `${w.level}: ${f.reason}`);
      return { ref: c.ref, level: w.level, withdrawn_on: on };
    });
  },

  async set(db, args, f) {
    const actor = actorOf(f);
    const [key, value] = args;
    oneOf(key, SETTINGS, 'setting');
    const v = num(value, key, { min: 1, max: 365 });
    return tx(db, async () => {
      await db.query(`insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value`, [key, String(v)]);
      await log(db, actor, 'set', key, String(v));
      return { [key]: v };
    });
  },

  async log(db, args, f) {
    const actor = actorOf(f);
    const c = await theCase(db, args[0]);
    need(f, 'note');
    await log(db, actor, 'note', c.ref, String(f.note).trim());
    return { ref: c.ref, logged: String(f.note).trim() };
  },

  async 'add-holiday'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'date', 'name');
    const d = date(f.date, 'date');
    const country = f.country ? oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country') : 'NZ';
    return tx(db, async () => {
      await db.query('insert into holidays (country, day, name) values ($1,$2,$3) on conflict (country, day) do update set name = excluded.name', [country, d, String(f.name).trim()]);
      await log(db, actor, 'add-holiday', d, `${country} ${f.name}`);
      return { country, day: d, name: String(f.name).trim() };
    });
  },
};

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const mdTable = (rows) => {
  if (!rows.length) return '_None._\n';
  const keys = Object.keys(rows[0]);
  return `| ${keys.join(' | ')} |\n|${keys.map(() => '---').join('|')}|\n${rows.map((r) => `| ${keys.map((k) => String(r[k] ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ')} |`).join('\n')}\n`;
};
const firstName = (n) => String(n || '').split(' ')[0];

export const drafts = {
  async 'draft-invite'(db, args, f) {
    const c = await theCase(db, args[0]);
    if (!CONDUCT.includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}; a disciplinary meeting invitation is for conduct and performance cases`);
    const allegations = await db.query('select n, text from allegations where case_id = $1 order by n', [c.id]);
    if (!allegations.length) throw Error(`${c.ref} has no allegations. Add them with allegation first; the letter must say exactly what is alleged.`);
    const info = await db.query(`select n, description from evidence where case_id = $1 order by n`, [c.id]);
    const [inv] = await db.query(`select max(due_on) as due from steps where case_id = $1 and kind = 'response-invited'`, [c.id]);
    const consequence = text(f.consequence) || '[state the most serious outcome being considered, for example a final written warning or dismissal]';
    const body = `# Invitation to a disciplinary meeting (draft)

Case ${c.ref}. Draft only: nothing has been sent. Check every bracketed item before it goes.

Dear ${firstName(c.person)},

We need to talk with you about concerns that have been raised. No decision has been made. We want your explanation before we decide anything.

## What is alleged

${allegations.map((a) => `${a.n}. ${a.text}`).join('\n')}

## The information we have

${info.length ? info.map((e) => `- ${e.description}`).join('\n') : '- [list every document or statement you are relying on; the employee gets a copy]'}

Copies are attached. If you think there is other information we should look at, please tell us.

## Responding

You can respond in writing, at a meeting, or both, by **${inv?.due || '[date: give a reasonable time]'}**. The meeting is on [date and time] at [place].

You are welcome to bring a support person or representative, such as a union delegate, a family member or a lawyer.

## Why this matters

If the allegations are found to be true, the outcome could include ${consequence}. We will consider everything you tell us before deciding.

${c.country === 'NZ' ? 'You can contact the Employee Assistance Programme on [number] for confidential support.' : 'You can contact the Employee Assistance Programme on [number] for confidential support.'}

Regards,
${c.handler || '[name]'}

---
Process record: concerns-notified, information-provided, support-person-offered and response-invited are steps to record when this letter is sent (step --kind=...).
`;
    return { file: draftFile(`${c.ref}-invite.md`, body) };
  },

  async 'draft-outcome'(db, args, f) {
    const c = await theCase(db, args[0]);
    if (REQUESTS.includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}. Use draft-response.`);
    if (!c.decision) throw Error(`${c.ref} has no decision yet`);
    const allegations = await db.query('select n, text, finding, finding_reasons from allegations where case_id = $1 order by n', [c.id]);
    const [resp] = await db.query(`select max(on_date) as d from steps where case_id = $1 and kind = 'response-received'`, [c.id]);
    const [w] = await db.query('select level, expires_on from warnings where case_id = $1 and withdrawn_on is null', [c.id]);
    const [win] = await db.query('select window_ends, rule from v_windows where case_id = $1', [c.id]);
    const to = c.protected || c.anonymous ? null : CONCERNS.includes(c.kind) ? c.raised_by : c.person;
    const body = `# Outcome letter (draft)

Case ${c.ref}. Draft only: nothing has been sent.

Dear ${firstName(to) || '[name]'},

${c.protected ? 'Thank you for raising this matter. Your identity has been kept confidential throughout.\n\n' : ''}This letter confirms the outcome of ${c.kind === 'disclosure' ? 'the disclosure you made' : `the ${c.kind} matter: ${c.title}`}.

## Findings

${allegations.length ? allegations.map((a) => `${a.n}. ${a.text}: **${a.finding}**. ${a.finding_reasons || ''}`).join('\n') : '_No separate allegations were recorded._'}

${resp?.d ? `We considered your response of ${resp.d} before reaching this decision.\n\n` : ''}## The decision

${c.decision.replace(/-/g, ' ')}. ${c.reasons || ''}

${w ? `This ${w.level} warning stays in force until ${w.expires_on}. A further matter of a similar kind before then may lead to more serious action.\n\n` : ''}${win && c.country === 'NZ' && to === c.person ? 'If you disagree with this decision you may raise a personal grievance within 90 days.\n\n' : ''}If you would like to talk about this letter, contact ${c.handler || '[name]'}.

Regards,
${c.handler || '[name]'}

---
Record when this goes: step ${c.ref} --kind=outcome-told${c.kind === 'disclosure' ? ', and --kind=discloser-updated' : ''}.
`;
    return { file: draftFile(`${c.ref}-outcome.md`, body) };
  },

  async 'draft-response'(db, args, f) {
    const c = await theCase(db, args[0]);
    if (!REQUESTS.includes(c.kind)) throw Error(`${c.ref} is a ${c.kind}. Use draft-outcome.`);
    if (!c.decision) throw Error(`${c.ref} has no answer recorded yet. Record it with respond first.`);
    const lines = [];
    if (c.kind === 'flexible-work' && c.country === 'NZ') {
      lines.push(c.decision === 'approved' ? 'Your request for flexible working is approved, starting [date], on the terms you asked for.'
        : `We are not able to agree to your request. This decision is made on a ground set out in section 69AAF(2) of the Employment Relations Act 2000: **${NZ_FLEX_GROUNDS[c.ground_code] || '[ground]'}**.\n\nOur reasons: ${c.reasons}`);
    } else if (['flexible-work', 'parental-leave-extension'].includes(c.kind)) {
      const what = c.kind === 'flexible-work' ? 'change in working arrangements' : 'extension of unpaid parental leave';
      lines.push(c.decision === 'approved' ? `Your request for a ${what} is approved.`
        : c.decision === 'varied' ? `After our discussion, we can agree to a ${what} on these terms: ${c.reasons || '[terms]'}.`
        : `We are not able to agree to your request for a ${what}.\n\nOur reasonable business grounds, and how they apply to your request: ${c.reasons}\n\n${c.kind === 'parental-leave-extension' ? '[State any shorter extension we could agree to, or that there is none.]\n\n' : '[State any changes we could make instead, or that there are none.]\n\n'}If you disagree, you can talk to us again, and if it is not resolved you can refer the dispute to the Fair Work Commission.`);
    } else if (c.kind === 'privacy-access') {
      lines.push(c.decision === 'granted' ? 'The information you asked for is attached.' : c.decision === 'partial'
        ? `Most of the information you asked for is attached. Some has been withheld: ${c.reasons}`
        : `We are not able to give you the information you asked for: ${c.reasons}`);
      if (c.decision !== 'granted') lines.push(c.country === 'NZ' ? 'You have the right to complain to the Privacy Commissioner about this decision.' : 'If you are unhappy with this decision, please contact us.');
    } else if (c.kind === 'statement-of-reasons') {
      lines.push(`You asked for a statement of the reasons for your dismissal. They are:\n\n${c.reasons}`);
    } else {
      lines.push(c.reasons || '[the answer]');
    }
    const body = `# Written response (draft)

Case ${c.ref}: ${c.title}. Received ${c.received_on}. Decision recorded ${c.decision_on}. Draft only: nothing has been sent.

Dear ${firstName(c.person)},

Thank you for your ${c.kind === 'question' ? 'question' : 'request'} of ${c.received_on}.

${lines.join('\n\n')}

Regards,
${c.handler || '[name]'}
`;
    return { file: draftFile(`${c.ref}-response.md`, body) };
  },

  async 'draft-chronology'(db, args, f) {
    const c = await theCase(db, args[0]);
    const detail = await reads.case(db, [c.ref]);
    const events = await db.query(`
      select received_on as day, 'received' as what, title as detail from cases where id = $1
      union all select on_date, kind, coalesce(detail, '') from steps where case_id = $1
      union all select i.held_on, 'interview: ' || i.role, ${c.protected ? `case when i.role = 'discloser' then 'withheld' else coalesce(p.name, i.name) end` : 'coalesce(p.name, i.name)'} from interviews i left join people p on p.id = i.person_id where i.case_id = $1
      union all select received_on, 'evidence ' || n, description from evidence where case_id = $1
      union all select finding_on, 'finding on allegation ' || n, finding from allegations where case_id = $1 and finding_on is not null
      union all select decision_on, 'decision', decision from cases where id = $1 and decision_on is not null
      order by 1, 2`, [c.id]);
    const body = `# Case file: ${c.ref} ${c.title} (draft)

Kind: ${c.kind}. Country: ${c.country}. Handler: ${c.handler || '-'}. Status: ${c.status}.${c.protected ? '\nProtected disclosure: the discloser\'s identity is withheld from this file.' : ''}

## Chronology

${mdTable(events)}
## Allegations and findings

${mdTable(detail.allegations)}
## Interviews

${mdTable(detail.interviews)}
## Evidence

${mdTable(detail.evidence)}
## Deadlines

${mdTable(detail.deadlines)}
## Open problems

${mdTable(detail.problems)}`;
    return { file: draftFile(`${c.ref}-chronology.md`, body) };
  },

  async 'weekly-review'(db) {
    const [attention, deadlines, compliance, workload, warnings] = await Promise.all([
      reads.attention(db), reads.deadlines(db, [], { days: 14 }), reads.compliance(db), reads.workload(db),
      db.query(`select person, level, expires_on, ref from v_warnings where standing = 'live' and days_left <= 60 order by expires_on`)]);
    const body = `# HR case desk: weekly review, ${today()}

Draft only, from the records.

## Needs attention

${mdTable(attention)}
## Due in the next 14 days

${mdTable(deadlines.due)}
## Challenge windows still open

${mdTable(deadlines.challenge_windows)}
## Rules and where the records fall short

${mdTable(compliance)}
## Who is carrying what

${mdTable(workload)}
## Warnings expiring in 60 days

${mdTable(warnings)}`;
    return { file: draftFile(`weekly-review-${today()}.md`, body) };
  },
};

// ------------------------------------------------------------------ import and export

// Salesforce report exports (Reports > Export > Details Only, comma-separated). Headings vary by org,
// so each field accepts the usual labels, and --map="Your Heading:field,..." covers the rest.
const MAPS = {
  people: { code: ['Employee Number', 'Employee ID', 'Employee: Employee Number'], first: ['First Name'], last: ['Last Name'], name: ['Full Name', 'Employee Name', 'Name'],
    email: ['Email', 'Work Email'], title: ['Job Title', 'Title', 'Job Profile'], team: ['Department', 'Team', 'Organisation'], manager: ['Manager', 'Manager Name', 'Manager: Full Name'],
    country: ['Country', 'Work Country', 'Location Country'], state: ['State', 'State/Province', 'Work State'], started: ['Start Date', 'Employment Start Date', 'Hire Date'],
    status: ['Employee Status', 'Status'] },
  cases: { number: ['Case Number'], subject: ['Subject'], type: ['Type', 'Case Type', 'Topic', 'Category'], status: ['Status'], priority: ['Priority'],
    employee: ['Employee Number', 'Employee: Employee Number', 'Contact Name', 'Employee Name', 'Employee: Full Name'], owner: ['Case Owner', 'Owner Name'],
    opened: ['Date/Time Opened', 'Opened Date', 'Created Date'], closed: ['Date/Time Closed', 'Closed Date'], description: ['Description'] },
};
// Salesforce case types to our kinds. Anything else comes in as a question or request, to be re-kinded with /customise if needed.
const TYPE_KINDS = [[/flex/i, 'flexible-work'], [/parental/i, 'parental-leave-extension'], [/privacy|personnel file|access to (my )?file/i, 'privacy-access'],
  [/grievance/i, 'grievance'], [/complaint|bullying|harass/i, 'complaint'], [/whistle|disclosure|speak.?up/i, 'disclosure'], [/investigat/i, 'investigation'],
  [/disciplin|misconduct/i, 'disciplinary'], [/performance/i, 'performance'], [/request|change|correction/i, 'request']];

async function importSalesforce(db, args, f) {
  const actor = actorOf(f);
  const [source, file] = args;
  if (source !== 'salesforce') throw Error('Usage: import salesforce <file.csv> --kind=people|cases');
  if (!file) throw Error('Name the CSV file exported from the Salesforce report');
  const kind = oneOf(f.kind, Object.keys(MAPS), 'kind');
  const map = { ...MAPS[kind] };
  if (f.map) for (const pair of String(f.map).split(',')) {
    const [h, field] = pair.split(':').map((s) => s.trim());
    if (!map[field]) throw Error(`--map field "${field}" is not one of: ${Object.keys(map).join(', ')}`);
    map[field] = [h];
  }
  const get = (r, field) => pick(r, ...map[field]).trim();
  const rows = parseCsv(readFileSync(path.resolve(file), 'utf8'));
  const counts = { kind, rows: rows.length, added: 0, skipped: 0 };
  const defaultCountry = f.country ? oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country') : null;
  const countryOf = (v, at) => {
    const s = String(v || '').trim().toLowerCase();
    if (['nz', 'new zealand', 'aotearoa'].includes(s)) return 'NZ';
    if (['au', 'aus', 'australia'].includes(s)) return 'AU';
    if (!s && defaultCountry) return defaultCountry;
    throw Error(`country "${v}" (${at}): pass --country=NZ or --country=AU`);
  };
  await db.exec('begin');
  try {
    const managers = [];
    for (const [i, r] of rows.entries()) {
      const at = `row ${i + 2}`;
      try {
        if (kind === 'people') {
          const ext = `salesforce:${get(r, 'code') || get(r, 'email')}`;
          if (ext === 'salesforce:') throw Error('no employee number or email');
          if ((await db.query('select 1 from people where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const name = get(r, 'name') || `${get(r, 'first')} ${get(r, 'last')}`.trim();
          if (!name) throw Error('no name');
          const country = countryOf(get(r, 'country'), at);
          const st = String(get(r, 'state')).toUpperCase();
          const state = country === 'AU' && STATES.includes(st) ? st : null;
          const left = /terminat|inactive|left/i.test(get(r, 'status'));
          const code = (get(r, 'code') || `E-${i + 1}`).toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 16).padEnd(2, '0');
          await db.query(`insert into people (code, name, email, job_title, team, country, state, started_on, status, left_on, external_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [code, name, get(r, 'email') || null, get(r, 'title') || null, get(r, 'team') || null, country, state,
              get(r, 'started') ? looseDate(get(r, 'started'), `start date (${at})`) : null, left ? 'left' : 'active', left ? today() : null, ext]);
          if (get(r, 'manager')) managers.push([code, get(r, 'manager')]);
        } else {
          const number = get(r, 'number');
          if (!number) throw Error('no Case Number');
          const ext = `salesforce:${number}`;
          if ((await db.query('select 1 from cases where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const who = get(r, 'employee');
          const p = who ? await db.query('select id, country from people where upper(code) = upper($1) or lower(name) = lower($1) or lower(email) = lower($1)', [who]) : [];
          if (who && p.length !== 1) throw Error(`employee "${who}" ${p.length ? 'matches more than one person' : 'not found (import people first)'}`);
          const owner = get(r, 'owner') ? await db.query('select id from people where lower(name) = lower($1)', [get(r, 'owner')]) : [];
          const type = `${get(r, 'type')} ${get(r, 'subject')}`;
          let kindC = (TYPE_KINDS.find(([re]) => re.test(type)) || [null, 'question'])[1];
          const country = p[0]?.country || countryOf('', at);
          if (kindC === 'parental-leave-extension' && country !== 'AU') kindC = 'request';
          if (REQUESTS.includes(kindC) && !p.length) kindC = 'complaint';
          const opened = looseDate(get(r, 'opened'), `opened (${at})`);
          const closed = /closed|resolved/i.test(get(r, 'status')) ? (get(r, 'closed') ? looseDate(get(r, 'closed'), `closed (${at})`) : opened) : null;
          const prio = /high|urgent|critical/i.test(get(r, 'priority')) ? 'high' : /low/i.test(get(r, 'priority')) ? 'low' : 'normal';
          await db.query(`insert into cases (kind, title, person_id, raised_by_id, handler_id, country, received_on, priority, summary, status, closed_on, decision, decision_on, external_id)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [kindC, get(r, 'subject') || `Salesforce case ${number}`, p[0]?.id || null, REQUESTS.includes(kindC) ? p[0]?.id || null : null, owner[0]?.id || null, country, opened, prio,
              get(r, 'description') || null, closed ? 'closed' : 'open', closed, closed ? (REQUESTS.includes(kindC) ? decisionRules({ kind: kindC, country })[0] : 'resolved') : null, closed, ext]);
        }
        counts.added++;
      } catch (e) {
        throw Error(`${at}: ${e.message}. Nothing was imported.`);
      }
    }
    for (const [code, m] of managers) {
      await db.query(`update people set manager_id = (select id from people where (lower(name) = lower($2) or upper(code) = upper($2)) and code <> $1 limit 1) where code = $1`, [code, m]);
    }
    if (f['dry-run']) { await db.exec('rollback'); return { ...counts, dry_run: true, next: 'Run again without --dry-run to keep it' }; }
    await log(db, actor, 'import', `salesforce-${kind}`, `${path.basename(file)}: ${counts.added} added, ${counts.skipped} already here`);
    await db.exec('commit');
    return counts;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'holidays', 'people', 'cases', 'allegations', 'steps', 'interviews', 'evidence', 'warnings', 'activity'];
  const out = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) out.tables[t] = await db.query(`select * from ${t}`);
  const file = path.resolve(f.out || path.join(outDir('exports'), `employee-relations-${today()}.json`));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2), { mode: 0o600 });
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out.tables[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importSalesforce, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}
