# Employee Relations for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS], [how many staff, in New Zealand, Australia or both]
- **Operator:** [YOUR NAME], [your role: head of people, HR advisor, employment consultant]
- **What matters most:** [for example: no statutory request goes unanswered past its deadline, no warning is issued without a fair process on record]

The work is an HR case desk in New Zealand or Australia: questions and requests, statutory requests with deadlines in law, complaints, personal grievances, protected disclosures, investigations, disciplinary and performance matters, and warnings.

## Rules

- Read the CLI result before answering. Every answer about a person or a case starts with data from `node scripts/cases.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- This is personal information about employees. Show only what the question needs. Never speculate about a person's motive, credibility, health or private life, and never summarise one employee's case to another.
- A protected disclosure never shows who made it. The CLI withholds the name; never try to work it out from dates, teams or wording, and never put it in a draft.
- Before any warning, demotion or dismissal, run `/fairness`. If the concerns were not put in writing or the employee has not had the chance to respond, say so and stop. Never look for a way around it.
- A finding, a decision's reasons and an override reason are the decision-maker's words. Ask for them; never write them.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a date, an allegation, a statement, a ground or an outcome. Copy them from the operator or the documents.
- Never send, call or delete. Letters are drafts in `drafts/`; case files and records are documents in `docs-out/`. Recording a step as done does not do it; a person does that.
- The rules in `docs/compliance.md` are records checks, not legal advice. If a rule looks out of date, or the matter needs a lawyer, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports, drafts and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Record that the person who raised a case has been told it was received. | `/acknowledge` |
| The activity log for the last 7 days (or --days=N): who did what, on which case. | `/activity` |
| Add a holiday (for example your region's anniversary day) to the working-day calendar. | `/add-holiday` |
| Add an employee: code, name, country (NZ or AU), Australian state, email, job title, team, manager, start date, and --hr for the HR team. | `/add-person` |
| Add an allegation to a complaint, grievance, disclosure or conduct case, with its category and who it is about. | `/allegation` |
| Give a case to someone in HR. | `/assign` |
| Show what needs a person today: statutory deadlines missed, refusals without what the law asks for, responses due this week, fairness gaps, grievance windows still open, cases with no handler or gone quiet, and warnings about to expire. | `/attention` |
| One case in full: the facts, allegations and findings, process steps, interviews, evidence, deadlines, problems, fairness gaps, warnings and its activity. | `/case` |
| Every open case (or --all), with who it is about, who raised it, the handler, its age and the next thing due. Filter by --kind, --status, --handler or --person. | `/cases` |
| Close a case. Refused without a decision (or --withdrawn with the reason), with an allegation still open, before the person is told the outcome, or for a disclosure before the discloser is updated. | `/close` |
| Check every case against the rules in docs/compliance.md: law first, then guidance, fairness, house rules and notes, each with its source and the first example. | `/compliance` |
| Make this system yours in plain language. Add a field, rename a kind, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Every dated obligation due in the next 30 days (or --days=N) and anything overdue, with the rule and its source, plus the challenge windows still open after adverse decisions. | `/deadlines` |
| Record the outcome of a complaint, grievance, disclosure or conduct case. An adverse outcome (warning, demotion, dismissal) is refused unless the concerns were put in writing and the employee had the chance to respond; other gaps need --override with a reason, which is kept. A warning is recorded with its expiry. | `/decide` |
| Render case files, statutory request records, warning records and the monthly HR case report as branded HTML from the records. | `/documents` |
| Write the case file: a chronology of every step, interview, piece of evidence, finding and decision, with deadlines and open problems. Written to drafts/. | `/draft-chronology` |
| Draft the letter inviting an employee to a disciplinary or performance meeting: each allegation word for word, the information relied on, the date to respond by, the right to a support person, and the most serious outcome being considered. Written to drafts/, never sent. | `/draft-invite` |
| Draft the outcome letter: findings with reasons, the response considered, the decision, any warning and its expiry, and in New Zealand the 90-day grievance window. A protected disclosure letter names no one. Written to drafts/, never sent. | `/draft-outcome` |
| Draft the written response to a request: the decision, and for a refusal the ground and reasons the law asks for (s 69AAE and s 69AAF in New Zealand, s 65A or s 76A in Australia, the right to complain to the Privacy Commissioner). Written to drafts/, never sent. | `/draft-response` |
| Record a piece of evidence on a case: what it is, where it came from, when, and where it is kept. | `/evidence` |
| Export every record to one JSON file the business owns. | `/export` |
| Before an adverse outcome: what the record shows about a fair process (concerns put, information given, support person offered, time to respond, findings), and whether decide would accept it. | `/fairness` |
| Record the finding on one allegation, with the reasons. On a conduct case, refused until the employee has heard the allegation and had the chance to respond. | `/finding` |
| The New Zealand holidays used to count working days, from 30 days ago. | `/holidays` |
| Bring employees, then cases, across from Salesforce report exports (comma-separated). Dry run first. Repeat rows are skipped and one bad row stops the whole file. | `/import` |
| The ten questions Salesforce HR Service does not answer out of the box: time to decision by kind, statutory deadlines missed, managers with the most cases, people with more than one live warning, substantiation by category, refused flexible work by ground, handler load, repeat respondents, adverse decisions with a fairness step overridden, and people disciplined within 6 months of raising a complaint. | `/insights` |
| Record an interview: who, their role, the date, any support person, where the notes are, and whether they are signed. | `/interview` |
| Add a note to a case's activity log. | `/log` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in your brand by `npm run view`. | `/new-view` |
| Open a case: a question, request, flexible work request, parental leave extension (AU), privacy access request, statement of reasons (NZ), complaint, grievance, protected disclosure, investigation, disciplinary or performance matter. Shows the deadlines it starts. | `/open-case` |
| Every active employee (or --all): role, team, manager, country and state, open cases and live warnings. | `/people` |
| One employee: cases about them, cases they raised (never a protected disclosure), allegations naming them, and their warnings. | `/person` |
| Mark an employee as left (with the date), or active again. Lists the open cases that are about them or that they handle. | `/person-status` |
| Record the written answer to a question, request or statutory request. A New Zealand flexible work refusal needs a s 69AAF(2) ground and reasons; an Australian refusal needs a recorded discussion first and reasons; a privacy refusal needs reasons. | `/respond` |
| Change a house rule: acknowledge_days, answer_days, investigation_days, response_days, stale_days, privacy_au_days, warning_verbal_months, warning_written_months or warning_final_months. | `/set` |
| Record a process step: acknowledged, concerns-notified, information-provided, support-person-offered, response-invited (with --due), response-received, meeting-held, discussed, interim-measure, referred, outcome-told or discloser-updated. | `/step` |
| Render the read-only dashboards in views.json (this week, deadlines, open cases, the warning register) as HTML in your brand. | `/view` |
| Every warning in force (or --all), soonest to expire first, with the case it came from. | `/warnings` |
| Write the Monday review to drafts/ from attention, the next 14 days of deadlines, challenge windows, compliance, workload and warnings expiring. | `/weekly-review` |
| Withdraw a warning before it expires, with the reason. | `/withdraw-warning` |
| Open cases per HR handler: casework, requests, the oldest case and how many obligations are overdue. | `/workload` |

If an ask fits nothing here, run `node scripts/cases.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/cases.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `v_deadlines` is every dated obligation with its source, `v_fairness_gaps` is what the record lacks before an adverse outcome, and `v_case_problems` is every problem in one place: the CLI, the views and the documents all read them. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `settings` holds the house rules (`set` changes them); `holidays` holds the days that are not working days. Laws and their sources are in `docs/compliance.md`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/replace-salesforce-hr-service.md` is the switching guide.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=salesforce-hr-service&utm_medium=readme
