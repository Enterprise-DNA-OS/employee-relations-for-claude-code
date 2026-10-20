# The CLI

Every slash command drives one command of `node scripts/cases.mjs`. Human tables by default, `--json` for machines. Every write needs `--actor="<your name>"`, which goes in the activity log. Dates are `YYYY-MM-DD` and default to today.

## attention

Show what needs a person today: statutory deadlines missed, refusals without what the law asks for, responses due this week, fairness gaps, grievance windows still open, cases with no handler or gone quiet, and warnings about to expire.

```bash
node scripts/cases.mjs attention
```

## cases

Every open case (or --all), with who it is about, who raised it, the handler, its age and the next thing due. Filter by --kind, --status, --handler or --person.

```bash
node scripts/cases.mjs cases [--kind=<kind>] [--handler=<name>] [--all]
```

## case

One case in full: the facts, allegations and findings, process steps, interviews, evidence, deadlines, problems, fairness gaps, warnings and its activity.

```bash
node scripts/cases.mjs case <ref>
```

## people

Every active employee (or --all): role, team, manager, country and state, open cases and live warnings.

```bash
node scripts/cases.mjs people [--all]
```

## person

One employee: cases about them, cases they raised (never a protected disclosure), allegations naming them, and their warnings.

```bash
node scripts/cases.mjs person <name or code>
```

## deadlines

Every dated obligation due in the next 30 days (or --days=N) and anything overdue, with the rule and its source, plus the challenge windows still open after adverse decisions.

```bash
node scripts/cases.mjs deadlines [--days=30]
```

## fairness

Before an adverse outcome: what the record shows about a fair process (concerns put, information given, support person offered, time to respond, findings), and whether decide would accept it.

```bash
node scripts/cases.mjs fairness <ref>
```

## warnings

Every warning in force (or --all), soonest to expire first, with the case it came from.

```bash
node scripts/cases.mjs warnings [--all]
```

## workload

Open cases per HR handler: casework, requests, the oldest case and how many obligations are overdue.

```bash
node scripts/cases.mjs workload
```

## compliance

Check every case against the rules in docs/compliance.md: law first, then guidance, fairness, house rules and notes, each with its source and the first example.

```bash
node scripts/cases.mjs compliance
```

## insights

The ten questions Salesforce HR Service does not answer out of the box: time to decision by kind, statutory deadlines missed, managers with the most cases, people with more than one live warning, substantiation by category, refused flexible work by ground, handler load, repeat respondents, adverse decisions with a fairness step overridden, and people disciplined within 6 months of raising a complaint.

```bash
node scripts/cases.mjs insights
```

## activity

The activity log for the last 7 days (or --days=N): who did what, on which case.

```bash
node scripts/cases.mjs activity [--days=7]
```

## holidays

The New Zealand holidays used to count working days, from 30 days ago.

```bash
node scripts/cases.mjs holidays
```

## add-person

Add an employee: code, name, country (NZ or AU), Australian state, email, job title, team, manager, start date, and --hr for the HR team.

```bash
node scripts/cases.mjs add-person --code=<code> --name="<name>" --country=<NZ|AU> [--state=<NSW>] [--title="<job title>"] [--team="<team>"] [--manager="<name>"] [--hr] --actor="<you>"
```

## person-status

Mark an employee as left (with the date), or active again. Lists the open cases that are about them or that they handle.

```bash
node scripts/cases.mjs person-status <name> --status=<left|active> [--date=<YYYY-MM-DD>] [--reason="<why>"] --actor="<you>"
```

## open-case

Open a case: a question, request, flexible work request, parental leave extension (AU), privacy access request, statement of reasons (NZ), complaint, grievance, protected disclosure, investigation, disciplinary or performance matter. Shows the deadlines it starts.

```bash
node scripts/cases.mjs open-case --kind=<kind> --title="<title>" --person="<who it is about or who asked>" [--raised-by="<who raised it>"] [--handler="<HR person>"] [--received=<YYYY-MM-DD>] [--occurred=<YYYY-MM-DD>] [--sexual-harassment] [--anonymous] --actor="<you>"
```

## assign

Give a case to someone in HR.

```bash
node scripts/cases.mjs assign <ref> --handler="<name>" --actor="<you>"
```

## acknowledge

Record that the person who raised a case has been told it was received.

```bash
node scripts/cases.mjs acknowledge <ref> [--date=<YYYY-MM-DD>] [--detail="<how>"] --actor="<you>"
```

## step

Record a process step: acknowledged, concerns-notified, information-provided, support-person-offered, response-invited (with --due), response-received, meeting-held, discussed, interim-measure, referred, outcome-told or discloser-updated.

```bash
node scripts/cases.mjs step <ref> --kind=<step> [--date=<YYYY-MM-DD>] [--due=<YYYY-MM-DD>] [--detail="<what>"] --actor="<you>"
```

## allegation

Add an allegation to a complaint, grievance, disclosure or conduct case, with its category and who it is about.

```bash
node scripts/cases.mjs allegation <ref> --text="<exactly what is alleged>" [--category=<bullying|harassment|sexual-harassment|discrimination|misconduct|safety|fraud|performance|other>] [--respondent="<name>"] --actor="<you>"
```

## finding

Record the finding on one allegation, with the reasons. On a conduct case, refused until the employee has heard the allegation and had the chance to respond.

```bash
node scripts/cases.mjs finding <ref> --n=<number> --finding=<substantiated|partly-substantiated|not-substantiated|unable-to-determine> --reasons="<why>" --actor="<you>"
```

## interview

Record an interview: who, their role, the date, any support person, where the notes are, and whether they are signed.

```bash
node scripts/cases.mjs interview <ref> --role=<complainant|respondent|witness|employee|discloser> --person="<name>" [--name="<someone outside the business>"] [--support="<who>"] [--notes="<where>"] [--signed] --actor="<you>"
```

## evidence

Record a piece of evidence on a case: what it is, where it came from, when, and where it is kept.

```bash
node scripts/cases.mjs evidence <ref> --description="<what>" [--source="<from>"] [--location="<where kept>"] --actor="<you>"
```

## decide

Record the outcome of a complaint, grievance, disclosure or conduct case. An adverse outcome (warning, demotion, dismissal) is refused unless the concerns were put in writing and the employee had the chance to respond; other gaps need --override with a reason, which is kept. A warning is recorded with its expiry.

```bash
node scripts/cases.mjs decide <ref> --outcome=<outcome> --reasons="<the decision-maker's reasons>" [--override="<reason>"] --actor="<you>"
```

## respond

Record the written answer to a question, request or statutory request. A New Zealand flexible work refusal needs a s 69AAF(2) ground and reasons; an Australian refusal needs a recorded discussion first and reasons; a privacy refusal needs reasons.

```bash
node scripts/cases.mjs respond <ref> --decision=<approved|varied|refused|granted|partial|provided|answered> [--ground=<reorganise|recruit|quality|performance|insufficient-work|structural-change|cost|customer-demand|collective-agreement>] [--reasons="<why>"] --actor="<you>"
```

## close

Close a case. Refused without a decision (or --withdrawn with the reason), with an allegation still open, before the person is told the outcome, or for a disclosure before the discloser is updated.

```bash
node scripts/cases.mjs close <ref> [--withdrawn="<why>"] --actor="<you>"
```

## withdraw-warning

Withdraw a warning before it expires, with the reason.

```bash
node scripts/cases.mjs withdraw-warning <ref> --reason="<why>" --actor="<you>"
```

## set

Change a house rule: acknowledge_days, answer_days, investigation_days, response_days, stale_days, privacy_au_days, warning_verbal_months, warning_written_months or warning_final_months.

```bash
node scripts/cases.mjs set <setting> <value> --actor="<you>"
```

## log

Add a note to a case's activity log.

```bash
node scripts/cases.mjs log <ref> --note="<note>" --actor="<you>"
```

## add-holiday

Add a holiday (for example your region's anniversary day) to the working-day calendar.

```bash
node scripts/cases.mjs add-holiday --date=<YYYY-MM-DD> --name="<name>" [--country=NZ] --actor="<you>"
```

## draft-invite

Draft the letter inviting an employee to a disciplinary or performance meeting: each allegation word for word, the information relied on, the date to respond by, the right to a support person, and the most serious outcome being considered. Written to drafts/, never sent.

```bash
node scripts/cases.mjs draft-invite <ref> [--consequence="<most serious outcome being considered>"]
```

## draft-outcome

Draft the outcome letter: findings with reasons, the response considered, the decision, any warning and its expiry, and in New Zealand the 90-day grievance window. A protected disclosure letter names no one. Written to drafts/, never sent.

```bash
node scripts/cases.mjs draft-outcome <ref>
```

## draft-response

Draft the written response to a request: the decision, and for a refusal the ground and reasons the law asks for (s 69AAE and s 69AAF in New Zealand, s 65A or s 76A in Australia, the right to complain to the Privacy Commissioner). Written to drafts/, never sent.

```bash
node scripts/cases.mjs draft-response <ref>
```

## draft-chronology

Write the case file: a chronology of every step, interview, piece of evidence, finding and decision, with deadlines and open problems. Written to drafts/.

```bash
node scripts/cases.mjs draft-chronology <ref>
```

## weekly-review

Write the Monday review to drafts/ from attention, the next 14 days of deadlines, challenge windows, compliance, workload and warnings expiring.

```bash
node scripts/cases.mjs weekly-review
```

## import

Bring employees, then cases, across from Salesforce report exports (comma-separated). Dry run first. Repeat rows are skipped and one bad row stops the whole file.

```bash
node scripts/cases.mjs import salesforce <file.csv> --kind=<people|cases> [--country=<NZ|AU>] [--map="<Heading>:<field>"] --dry-run --actor="<you>"
```

## export

Export every record to one JSON file the business owns.

```bash
node scripts/cases.mjs export [--out=<file>]
```

## Kinds of case

`question`, `request`, `flexible-work`, `parental-leave-extension` (Australia), `privacy-access`, `statement-of-reasons` (New Zealand), `complaint`, `grievance`, `disclosure`, `investigation`, `disciplinary`, `performance`.

## Outcomes

- Questions and requests: `answered`.
- Flexible work: `approved` or `refused` in New Zealand; `approved`, `varied` or `refused` in Australia. Parental leave extension: the same as Australian flexible work.
- Privacy access: `granted`, `partial` or `refused`. Statement of reasons: `provided`.
- Complaints, grievances and disclosures: `upheld`, `not-upheld`, `resolved`, `referred` or `no-action`.
- Investigations, disciplinary and performance: `no-action`, `advice`, `coaching`, `referred`, `verbal-warning`, `written-warning`, `final-warning`, `demotion` or `dismissal`.
