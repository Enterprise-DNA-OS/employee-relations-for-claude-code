#!/usr/bin/env node
// npm test: a temporary database, the demo employer, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, drafts, commands, QUESTIONS, date, looseDate } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'er-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
const day = async (n) => (await one('select (current_date + $1::int)::text as d', [n])).d;
const problems = async (ref) => (await db.query('select kind, problem from v_case_problems where ref = $1', [ref]));
const read = (rel) => readFileSync(path.join(process.env.OUTPUT_DIR, rel), 'utf8');

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  await seed(db);
  eq((await one('select count(*)::int as n from cases')).n, 18, 'seed is idempotent (cases)');
  eq((await one('select count(*)::int as n from people')).n, 21, 'seed is idempotent (people)');
  eq((await one('select count(*)::int as n from activity')).n, 13, 'seed activity written once');

  // Every read runs.
  for (const cmd of Object.keys(reads)) {
    const a = { case: ['C-1007'], person: ['Leon'], fairness: ['C-1008'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  eq(ins.length, 10);
  ok(ins.every((q) => Array.isArray(q.rows) && q.rows.length > 0), 'every question has an answer on the demo data');
  ok(ins[3].rows.some((r) => r.person === 'Hemi Walker'), 'two live warnings');
  ok(ins[7].rows.some((r) => r.name === 'Leon Fraser' && r.cases === 2), 'repeat respondent');
  ok(ins[8].rows.some((r) => r.ref === 'C-1013'), 'decision with a fairness step overridden');
  ok(ins[9].rows.some((r) => r.name === 'Daniel Russo' && r.then_subject_of === 'C-1008'), 'complaint then discipline within 6 months');

  // Parsing is strict.
  eq(date('2026-10-21', 'x'), '2026-10-21');
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;
  assert.throws(() => date('21/10/2026', 'x'), /date/); checks++;
  eq(looseDate('21/10/2026 9:15 am', 'x'), '2026-10-21');
  eq(looseDate('2026-10-21T09:15:00.000Z', 'x'), '2026-10-21');
  assert.throws(() => looseDate('October', 'x'), /not a date/); checks++;

  // Working days, as the statutes count them.
  const wd = async (d, n, cal) => (await one('select add_working_days($1::date, $2, $3, $4)::text as d', [d, n, 'NZ', cal])).d;
  eq(await wd('2026-10-23', 1, 'privacy'), '2026-10-27', 'Labour Day is not a working day');
  eq(await wd('2026-12-20', 5, 'privacy'), '2027-01-18', 'Privacy Act: 25 December to 15 January does not count');
  eq(await wd('2026-12-20', 5, 'legislation'), '2027-01-05', 'Legislation Act: 25 December to 2 January, then the observed holiday');
  eq(await wd('2026-12-10', 20, 'privacy'), '2027-01-29', 'a 20 working day request over the summer close-down');

  // The demo employer says what it should.
  const attention = await call('attention');
  const has = (item, ref) => attention.some((r) => r.item === item && r.ref === ref);
  ok(has('law', 'C-1001'), 'NZ flexible work request past one month');
  ok(has('law', 'C-1002'), 'AU refusal with no discussion recorded');
  ok(has('law', 'C-1006'), 'statement of reasons past 14 days');
  ok(has('due tomorrow', 'C-1008'), 'employee response due');
  ok(has('challenge window open', 'C-1014'), 'grievance window after a dismissal');
  ok(has('note', 'C-1010'), 'grievance raised outside 90 days');
  ok(!attention.some((r) => r.ref === 'C-1011' && r.item === 'note'), 'sexual harassment grievance inside 12 months is not flagged');
  ok(has('house rule', 'C-1016'), 'no handler');
  ok(has('warning expires soon', 'C-1018'), 'warning about to expire');
  const comp = await call('compliance');
  ok(comp[0].kind === 'law' && comp.some((r) => r.kind === 'fairness'), 'compliance puts law first and shows fairness gaps');

  // A protected disclosure never shows who raised it.
  const pd = JSON.stringify(await call('case', ['C-1009']));
  ok(!pd.includes('Olivia') && pd.includes('withheld (protected disclosure)'), 'case hides the discloser');
  ok(!JSON.stringify(await call('cases', [], { all: true })).includes('Olivia'), 'case list hides the discloser');
  ok(!(await call('person', ['Olivia'])).cases_raised.some((c) => c.ref === 'C-1009'), 'person view hides the disclosure');
  const chron = await call('draft-chronology', ['C-1009']);
  ok(!read(chron.file).includes('Olivia') && read(chron.file).includes('withheld'), 'case file hides the discloser');

  // Opening cases: the rules each kind brings.
  await fails(() => call('open-case', [], { ...A, kind: 'grievance', title: 'x', person: 'Priya', 'raised-by': 'Priya' }), /--occurred/);
  await fails(() => call('open-case', [], { ...A, kind: 'parental-leave-extension', title: 'x', person: 'Priya' }), /Australian right/);
  await fails(() => call('open-case', [], { ...A, kind: 'statement-of-reasons', title: 'x', person: 'Aisha' }), /New Zealand Act/);
  await fails(() => call('open-case', [], { ...A, kind: 'disclosure', title: 'x', country: 'NZ' }), /--raised-by/);
  await fails(() => call('open-case', [], { ...A, kind: 'question', title: 'x', country: 'NZ' }), /--person/);
  await fails(() => call('open-case', [], { kind: 'question', title: 'x', person: 'Priya' }), /--actor/);
  await fails(() => call('open-case', [], { ...A, kind: 'holiday', title: 'x', person: 'Priya' }), /--kind/);
  const flex = await call('open-case', [], { ...A, kind: 'flexible-work', title: 'Nine-day fortnight', person: 'Grace', handler: 'Mele', received: '2026-10-01' });
  eq(flex.deadlines.find((d) => d.kind === 'law').due_on, '2026-11-01', 'NZ: one month to decide');
  const priv = await call('open-case', [], { ...A, kind: 'privacy-access', title: 'My file', person: 'Hemi', received: '2026-12-10' });
  eq(priv.deadlines[0].due_on, '2027-01-29', 'NZ privacy request: 20 working days');
  const au = await call('open-case', [], { ...A, kind: 'flexible-work', title: 'Part-time', person: 'Aisha', received: '2026-10-01' });
  eq(au.deadlines.find((d) => d.kind === 'law').due_on, '2026-10-22', 'AU: 21 days');
  const anon = await call('open-case', [], { ...A, kind: 'disclosure', title: 'Cash handling', country: 'AU', anonymous: true });
  ok((await one('select protected, anonymous, raised_by_id from cases where ref = $1', [anon.ref])).protected, 'disclosures are protected by default');
  const lateGr = await call('open-case', [], { ...A, kind: 'grievance', title: 'Old roster change', person: 'Hemi', 'raised-by': 'Hemi', occurred: await day(-120) });
  ok(lateGr.problems.some((p) => /90-day/.test(p.problem)), 'late grievance flagged at once');
  const shGr = await call('open-case', [], { ...A, kind: 'grievance', title: 'Comments', person: 'Leon', 'raised-by': 'Priya', occurred: await day(-120), 'sexual-harassment': true });
  ok(!shGr.problems.some((p) => /window/.test(p.problem)), 'sexual harassment grievance gets 12 months');

  // Statutory requests: the answer must carry what the law asks for.
  await fails(() => call('respond', ['C-1001'], { ...A, decision: 'refused', reasons: 'Busy' }), /--ground/);
  await fails(() => call('respond', ['C-1001'], { ...A, decision: 'refused', ground: 'too-hard', reasons: 'Busy' }), /--ground must be one of/);
  await fails(() => call('respond', ['C-1001'], { ...A, decision: 'varied' }), /--decision must be one of: approved, refused/);
  const r1 = await call('respond', ['C-1001'], { ...A, decision: 'refused', ground: 'customer-demand', reasons: 'The phones need two people on Wednesdays and Fridays.' });
  eq(r1.deadlines.find((d) => d.source.includes('69AAE')).standing, 'met late', 'answered after the month: met late');
  ok(!(await problems('C-1001')).some((p) => p.kind === 'law'), 'no law problem once answered on a ground');
  const resp1 = await call('draft-response', ['C-1001']);
  ok(/section 69AAF\(2\)/.test(read(resp1.file)) && read(resp1.file).includes('ability to meet customer demand'), 'NZ refusal letter names the ground');
  await fails(() => call('respond', ['C-1001'], { ...A, decision: 'approved' }), /already answered/);
  await fails(() => call('respond', ['C-1004'], { ...A, decision: 'refused', reasons: 'Cannot backfill the route' }), /no discussion/);
  await call('step', ['C-1004'], { ...A, kind: 'discussed', detail: 'Talked through a 3 month extension' });
  ok(await call('respond', ['C-1004'], { ...A, decision: 'varied', reasons: 'A further 3 months, to the end of February' }), 'AU parental leave extension varied after discussion');
  const resp4 = await call('draft-response', ['C-1004']);
  ok(read(resp4.file).includes('extension of unpaid parental leave'), 'AU response letter');
  await fails(() => call('respond', ['C-1005'], { ...A, decision: 'partial' }), /--reasons/);
  ok(await call('respond', ['C-1005'], { ...A, decision: 'partial', reasons: 'Witness statements withheld to protect the witnesses' }), 'privacy partial with reasons');
  ok(read((await call('draft-response', ['C-1005'])).file).includes('Privacy Commissioner'), 'privacy letter names the right to complain');
  await fails(() => call('respond', ['C-1006'], { ...A, decision: 'provided' }), /--reasons/);
  await fails(() => call('respond', ['C-1007'], { ...A, decision: 'answered' }), /Record the outcome with decide/);
  await fails(() => call('decide', ['C-1015'], { ...A, outcome: 'answered', reasons: 'x' }), /Record the answer with respond/);

  // The fairness gate before an adverse outcome.
  await fails(() => call('decide', ['C-1008'], { ...A, outcome: 'final-warning', reasons: 'x', override: 'urgent' }), /no opportunity to respond yet.*cannot be overridden/);
  await fails(() => call('finding', ['C-1008'], { ...A, n: '1', finding: 'substantiated', reasons: 'CCTV' }), /Not yet/);
  await fails(() => call('step', ['C-1011'], { ...A, kind: 'response-received' }), /response-invited first/);
  await call('step', ['C-1008'], { ...A, kind: 'response-received', detail: 'Says he was told to by the shift lead' });
  await fails(() => call('decide', ['C-1008'], { ...A, outcome: 'final-warning', reasons: 'x' }), /support person not offered.*--override/);
  await call('finding', ['C-1008'], { ...A, n: '1', finding: 'substantiated', reasons: 'CCTV; he accepts he drove it' });
  await fails(() => call('decide', ['C-1008'], { ...A, outcome: 'final-warning' }), /--reasons/);
  await fails(() => call('decide', ['C-1008'], { ...A, outcome: 'sacked', reasons: 'x' }), /--outcome/);
  const dec = await call('decide', ['C-1008'], { ...A, outcome: 'written-warning', reasons: 'He accepts it; the instruction from the shift lead is being looked at separately.', override: 'Daniel said by phone he did not want anyone with him' });
  eq(dec.warning.level, 'written');
  eq(dec.warning.expires_on, (await one(`select (current_date + interval '12 months')::date::text as d`)).d, 'written warning live for 12 months');
  ok((await problems('C-1008')).some((p) => p.kind === 'fairness'), 'override stays visible in compliance');
  ok((await one('select count(*)::int as n from activity where ref = $1 and detail like $2', ['C-1008', '%override%'])).n === 1, 'override logged');
  await fails(() => call('decide', ['C-1008'], { ...A, outcome: 'no-action', reasons: 'x' }), /already decided/);
  const out8 = await call('draft-outcome', ['C-1008']);
  ok(read(out8.file).includes('stays in force until'), 'outcome letter carries the warning expiry');
  await fails(() => call('close', ['C-1008'], A), /has not been told/);
  await call('step', ['C-1008'], { ...A, kind: 'outcome-told' });
  ok(await call('close', ['C-1008'], A), 'closed once told');
  await fails(() => call('step', ['C-1008'], { ...A, kind: 'meeting-held' }), /closed/);
  const inv = await call('draft-invite', ['C-1007'], { consequence: 'a final written warning' });
  ok(read(inv.file).includes('support person') && read(inv.file).includes('a final written warning'), 'invitation letter');
  await fails(() => call('draft-invite', ['C-1001']), /conduct and performance/);
  const nz = await call('open-case', [], { ...A, kind: 'disciplinary', title: 'Late again', person: 'Grace', handler: 'Mele' });
  await fails(() => call('draft-invite', [nz.ref]), /no allegations/);
  await call('allegation', [nz.ref], { ...A, text: 'Late four times in October' });
  const inv2 = await call('step', [nz.ref], { ...A, kind: 'response-invited' });
  eq(inv2.due_on, await day(5), 'response time defaults to response_days');
  ok((await one('select status from cases where ref = $1', [nz.ref])).status === 'open', 'status unchanged until concerns are put');
  await call('step', [nz.ref], { ...A, kind: 'concerns-notified' });
  eq((await one('select status from cases where ref = $1', [nz.ref])).status, 'investigating');

  // A disclosure closes only once the discloser hears what was done.
  await call('finding', ['C-1009'], { ...A, n: '1', finding: 'substantiated', reasons: 'Seven invoices split under the limit' });
  await call('decide', ['C-1009'], { ...A, outcome: 'upheld', reasons: 'Delegations tightened; disciplinary process opened separately' });
  await call('step', ['C-1009'], { ...A, kind: 'outcome-told' });
  await fails(() => call('close', ['C-1009'], A), /discloser-updated/);
  await call('step', ['C-1009'], { ...A, kind: 'discloser-updated' });
  ok(await call('close', ['C-1009'], A), 'disclosure closed');
  ok(!read((await call('draft-outcome', ['C-1009'])).file).includes('Olivia'), 'disclosure outcome letter names no one');
  await fails(() => call('close', ['C-1007'], A), /no decision/);
  ok(await call('close', ['C-1016'], { ...A, withdrawn: 'Payroll fixed it directly' }), 'withdrawn case closes');

  // Warnings, settings, people.
  await fails(() => call('withdraw-warning', ['C-1018'], A), /--reason/);
  await call('withdraw-warning', ['C-1018'], { ...A, reason: 'Speed camera found to be miscalibrated' });
  ok(!(await call('insights'))[3].rows.some((r) => r.person === 'Hemi Walker'), 'withdrawn warning no longer counts');
  await fails(() => call('withdraw-warning', ['C-1018'], { ...A, reason: 'again' }), /no warning in force/);
  await fails(() => call('set', ['coffee_days', '3'], A), /--setting/);
  await fails(() => call('set', ['stale_days', '0'], A), /stale_days/);
  const staleBefore = (await db.query(`select 1 from v_case_problems where problem like 'untouched%'`)).length;
  await call('set', ['stale_days', '60'], A);
  ok((await db.query(`select 1 from v_case_problems where problem like 'untouched%'`)).length < staleBefore, 'house rule changed');
  await fails(() => call('assign', ['C-1015'], { ...A, handler: 'Craig' }), /not marked as HR/);
  ok(await call('assign', ['C-1015'], { ...A, handler: 'Jared' }), 'assigned');
  await fails(() => call('add-person', [], { ...A, code: 'P-090', name: 'Z', country: 'NZ', state: 'NSW' }), /Australian/);
  await fails(() => call('add-person', [], { ...A, code: 'P-001', name: 'Dup', country: 'NZ' }), /duplicate|unique/i);
  ok(await call('add-person', [], { ...A, code: 'P-090', name: 'Wiremu Tane', country: 'NZ', manager: 'Craig', team: 'Auckland Warehouse' }), 'person added');
  const left = await call('person-status', ['Leon'], { ...A, status: 'left', reason: 'Resigned' });
  ok(left.open_cases.length >= 2, 'leaving lists the open cases');
  await fails(() => call('case', ['Fraser']), /not found/);
  await fails(() => call('person', ['a']), /ambiguous/);
  ok(await call('add-holiday', [], { ...A, date: '2027-01-25', name: 'Wellington Anniversary' }), 'holiday added');
  eq(await wd('2027-01-22', 1, 'privacy'), '2027-01-26', 'an added holiday is skipped');

  // Drafts.
  for (const [cmd, a] of [['draft-chronology', ['C-1007']], ['weekly-review', []], ['draft-response', ['C-1002']]]) {
    const r = await call(cmd, a);
    ok(r.file && existsSync(path.join(process.env.OUTPUT_DIR, r.file)), `${cmd} wrote ${r.file}`);
  }
  ok(read(`drafts/weekly-review-${new Date().toISOString().slice(0, 10)}.md`).includes('Challenge windows'), 'weekly review');
  await fails(() => call('draft-response', ['C-1003']), /no answer recorded/);

  // Import from Salesforce report exports: dry run, atomic, repeat rows skipped.
  const ex = (f) => path.join(REPO_ROOT, 'examples', 'salesforce', f);
  const dry = await call('import', ['salesforce', ex('employees.csv')], { ...A, kind: 'people', 'dry-run': true });
  eq(dry.added, 4); ok(dry.dry_run);
  eq((await one(`select count(*)::int as n from people where external_id like 'salesforce:%'`)).n, 0, 'dry run keeps nothing');
  eq((await call('import', ['salesforce', ex('employees.csv')], { ...A, kind: 'people' })).added, 4);
  eq((await call('import', ['salesforce', ex('employees.csv')], { ...A, kind: 'people' })).skipped, 4, 'repeat rows skipped');
  const kieran = await one(`select p.country, p.state, m.name as manager from people p left join people m on m.id = p.manager_id where p.code = 'E-4102'`);
  ok(kieran.country === 'AU' && kieran.state === 'NSW' && kieran.manager === "Sarah O'Neill", 'country, state and manager mapped');
  eq((await one(`select status from people where code = 'E-4104'`)).status, 'left', 'terminated employee comes in as left');
  const ci = await call('import', ['salesforce', ex('cases.csv')], { ...A, kind: 'cases', country: 'NZ' });
  eq(ci.added, 4);
  const kinds = Object.fromEntries((await db.query(`select external_id, kind, status from cases where external_id like 'salesforce:%'`)).map((r) => [r.external_id, r]));
  eq(kinds['salesforce:00001021'].kind, 'flexible-work');
  eq(kinds['salesforce:00001022'].kind, 'privacy-access');
  eq(kinds['salesforce:00001023'].status, 'closed');
  eq(kinds['salesforce:00001024'].kind, 'complaint');
  ok((await db.query(`select 1 from v_deadlines d join cases c on c.id = d.case_id where c.external_id = 'salesforce:00001021' and d.kind = 'law'`)).length, 'imported requests get their statutory deadline');
  const bad = path.join(root, 'bad.csv');
  writeFileSync(bad, 'Case Number,Subject,Type,Status,Employee Number,Date/Time Opened\n9001,Fine,Leave,New,E-4101,01/10/2026\n9002,Broken,Leave,New,NOBODY,01/10/2026\n');
  const before = (await one('select count(*)::int as n from cases')).n;
  await fails(() => call('import', ['salesforce', bad], { ...A, kind: 'cases' }), /row 3: employee "NOBODY" not found.*Nothing was imported/);
  eq((await one('select count(*)::int as n from cases')).n, before, 'a bad row stops the whole file');
  await fails(() => call('import', ['salesforce', bad], { ...A, kind: 'payroll' }), /--kind/);
  await fails(() => call('import', ['workday', bad], { ...A, kind: 'cases' }), /Usage/);

  // Export, activity, and the log cannot be rewritten.
  const exp = await call('export', [], {});
  ok(existsSync(exp.file) && exp.rows.cases > 18, 'export writes every table');
  ok((await call('activity', [], { days: '1' })).length > 20, 'activity log fills');
  await fails(() => db.query('update activity set detail = $1', ['rewritten']), /append-only/);
  await fails(() => db.query('delete from activity'), /append-only/);
  await fails(() => call('log', [], { ...A, note: 'x' }), /Name the/);
  ok(await call('log', ['C-1007'], { ...A, note: 'Leon has asked for the rosters' }), 'notes');

  // Database guards beyond the CLI.
  await fails(() => db.query(`update cases set decision = 'upheld' where ref = 'C-1011'`), /check|violates/i);
  await fails(() => db.query(`update cases set anonymous = true where ref = 'C-1007'`), /check|violates/i);
  await fails(() => db.query(`update cases set status = 'closed' where ref = 'C-1011'`), /check|violates/i);
  await fails(() => db.query(`insert into steps (case_id, kind, on_date, actor) select id, 'response-invited', current_date, 'x' from cases where ref = 'C-1011'`), /check|violates/i);
  await fails(() => db.query(`update allegations set finding = 'substantiated' where finding = 'open'`), /check|violates/i);
  await fails(() => call('nonsense'), /Unknown command/);

  // The CLI shell, views and documents.
  const env = { ...process.env };
  const cli = (a) => spawnSync(process.execPath, ['scripts/cases.mjs', ...a], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const h = cli(['--help']);
  eq(h.status, 0); ok(h.stdout.includes('fairness'), 'help lists commands');
  const j = cli(['warnings', '--json']);
  eq(j.status, 0); ok(Array.isArray(JSON.parse(j.stdout)), 'json output');
  const t = cli(['attention']);
  eq(t.status, 0); ok(t.stdout.includes('C-1006'), 'human output');
  const u = cli(['attention', '--bogus']);
  eq(u.status, 1); ok(u.stderr.includes('Unknown option'), 'unknown option refused');
  const v = spawnSync(process.execPath, ['scripts/view.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(v.status, 0, v.stderr);
  const views = JSON.parse(readFileSync(path.join(REPO_ROOT, 'views.json'), 'utf8'));
  for (const vw of views) ok(existsSync(path.join(process.env.OUTPUT_DIR, 'views', `${vw.name}.html`)), `view ${vw.name}`);
  const page = read('views/week.html');
  ok(!page.includes('TODO') && page.includes('Against the law'), 'week view rendered');
  ok(!read('views/cases.html').includes('Olivia'), 'views hide the discloser');
  const d = spawnSync(process.execPath, ['scripts/docs.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(d.status, 0, d.stderr);
  const docs = JSON.parse(readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'));
  for (const doc of docs) ok(readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', doc.name)).length > 0, `document ${doc.name}`);
  const pdFile = readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', 'case-file')).find((f) => f.includes('c-1009'));
  ok(pdFile && !read(path.join('docs-out', 'case-file', pdFile)).includes('Olivia'), 'documents hide the discloser');
  const { page: renderPage, table: renderTable } = await import('./lib/render.mjs');
  const html = renderPage({ title: 'T', subtitle: '<script>alert(1)</script>', sections: [{ title: 'S', html: renderTable([{ name: '<b>x</b>' }]) }] });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;') && html.includes('&lt;b&gt;'), 'HTML is escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
  const special = ['customise', 'new-view', 'view', 'documents'];
  for (const c of commands) ok(recipes.includes(c), `/${c} has a recipe`);
  for (const r of recipes) ok(commands.includes(r) || special.includes(r), `/${r} drives a real command`);
  const claude = readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  for (const r of recipes) ok(claude.includes(`/${r}\``), `CLAUDE.md routes /${r}`);
  ok(!claude.includes('TODO(author)') && !readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').includes('TODO(author)'), 'no TODO(author) left');
  ok(Object.keys(drafts).length === 5, 'five drafts');

  console.log(`PASS: ${checks} checks (${db.mode})`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
