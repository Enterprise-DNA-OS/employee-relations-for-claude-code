<h1 align="center">Employee Relations for Claude Code</h1>

<p align="center">
  <strong>The open-source HR case desk that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Salesforce HR Service data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=salesforce-hr-service">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/salesforce-hr-service?utm_source=github&utm_medium=readme&utm_campaign=salesforce-hr-service">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#bring-your-salesforce-hr-service-data">Instead of Salesforce HR Service</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Employee Relations for Claude Code does the job you pay Salesforce HR Service for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Salesforce HR Service dashboard cannot.

Salesforce lists Agentforce HR Service at AU$21 per employee per month for its employee agents and AU$70 per HR user per month for the HR Service Desk Enterprise Edition, billed annually ([salesforce.com/service/hr-service-management/pricing](https://www.salesforce.com/service/hr-service-management/pricing/), checked 20 October 2026). That is AU$252 a year for every employee on the payroll, before the HR team's own seats. Here the database is yours, and a new hire costs nothing.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=salesforce-hr-service).

It covers the HR case desk of a New Zealand or Australian employer with a small HR team, or an HR consultancy running casework for several: questions and requests, the statutory requests with deadlines in law (flexible work, parental leave extensions, privacy access, statements of reasons), complaints, personal grievances, protected disclosures, investigations, disciplinary and performance matters, and the warnings that come out of them. Every deadline is worked out from the rule that sets it, in working days where the Act says so, and an adverse outcome is refused until the record shows the employee heard the concerns and had the chance to respond (Employment Relations Act 2000 s 103A(3); Fair Work Act 2009 s 387). A protected disclosure never shows who made it, anywhere.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/employee-relations-for-claude-code.git
cd employee-relations-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/fairness C-1008`, `/deadlines` and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Statutory deadlines missed, refusals without what the law asks for, responses due this week, fairness gaps, grievance windows still open, cases with no handler or gone quiet, warnings about to expire |
| `/deadlines` | Every dated obligation in the next 30 days, with the rule and source, plus challenge windows after adverse decisions |
| `/open-case` | Open any kind of case and see the deadlines it starts |
| `/fairness` | Before a warning or dismissal: what the record shows about a fair process, and whether the outcome would be accepted |
| `/decide` | Record an outcome. An adverse outcome is refused without the concerns put and a chance to respond; other gaps need a reason, which is kept |
| `/respond` | Answer a request. A refusal carries the ground and reasons the law asks for |
| `/compliance` | Every case checked against the rules in [docs/compliance.md](docs/compliance.md), law first, with sources |
| `/warnings` | Every warning in force, soonest to expire first |
| `/draft-invite` | The letter inviting an employee to a disciplinary meeting, allegations word for word |
| `/draft-outcome` | The outcome letter, with findings, the warning and its expiry |
| `/draft-response` | The written response to a flexible work, parental leave, privacy or statement of reasons request |
| `/draft-chronology` | The case file: every step, interview, piece of evidence, finding and decision in order |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/insights` | The ten questions below |

The working commands: `/add-person`, `/person-status`, `/assign`, `/acknowledge`, `/step`, `/allegation`, `/finding`, `/interview`, `/evidence`, `/close`, `/withdraw-warning`, `/set`, `/log`, `/add-holiday`. The reads: `/cases`, `/case`, `/people`, `/person`, `/workload`, `/activity`, `/holidays`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 41 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or reference works when it is unique; when it is not, the command lists the candidates and stops.

## The rules it keeps

- **Statutory deadlines.** New Zealand flexible work requests decided in writing within one month (s 69AAE), statements of reasons for dismissal within 14 days (s 120), privacy access requests within 20 working days with 25 December to 15 January not counted (Privacy Act 2020 s 44 and s 7), protected disclosures dealt with within 20 working days (Protected Disclosures Act 2022 s 13, guidance). Australian flexible work and parental leave extension requests answered in writing within 21 days (Fair Work Act 2009 s 65A, s 76A).
- **Refusals.** A New Zealand flexible work refusal needs one of the eight grounds in s 69AAF(2) and the reasons. An Australian refusal needs a discussion with the employee on record first, and the reasons.
- **Fair process before an adverse outcome.** No warning, demotion or dismissal until the concerns were put in writing and the employee had the chance to respond: this cannot be overridden. Information not given, no support person offered, or an allegation without a finding needs `--override` with a reason, which stays on the case and in `/compliance`.
- **Grievance windows.** A New Zealand grievance raised outside 90 days (12 months for sexual harassment, s 114) is noted. After an adverse decision, the employee's window to raise a grievance (90 days) or apply to the Fair Work Commission (21 days, s 394) shows until it closes.
- **Confidentiality.** A protected disclosure never shows who made it: not in a list, a case, a person's history, a letter, a view or a document.

The software records and checks; people decide. It is not legal advice, and it sends nothing.

## Ten questions answered from your records

`/insights` runs all ten today.

1. How many days from receipt to decision, by kind of case, over the last 12 months?
2. Which statutory deadlines were missed or met late, by rule?
3. Which managers have the most complaints, grievances and investigations in their team over 12 months?
4. Who holds more than one live warning?
5. How often are allegations substantiated, by category?
6. Which flexible work requests were refused, on what grounds, and in which team?
7. Which HR handlers carry the most open cases, and how old is the oldest?
8. Who is named as a respondent in more than one case?
9. Which adverse decisions were made with a fairness step overridden or missing?
10. Who raised a complaint or grievance and then became the subject of a disciplinary or performance case within 6 months?

## Your first hour: ten things to ask for

1. What needs my attention today?
2. Which requests are due this week, and which have we already missed?
3. Priya has asked to work from home two days a week. Open it and tell me when we must answer by.
4. Can we issue Daniel a final warning yet? What is missing?
5. Draft the letter inviting Leon to a meeting about both allegations.
6. We talked Emily's 9.30 am start through and can offer 9 am. Record it and draft the letter.
7. Who has more than one live warning, and when do they expire?
8. Has anyone been disciplined within six months of raising a complaint?
9. Put our business name and logo on the case files and letters.
10. Add a field for the employment agreement each person is on through `/customise`.

## Bring your Salesforce HR Service data

Export your employees and your HR cases from Salesforce reports as comma-separated files, then import them in that order, dry run first:

```bash
node scripts/cases.mjs import salesforce employees.csv --kind=people --actor="Your name" --dry-run
node scripts/cases.mjs import salesforce cases.csv --kind=cases --country=NZ --actor="Your name" --dry-run
```

The [switching guide](docs/replace-salesforce-hr-service.md) covers the headings each import reads, `--map` for reports with other headings, how case types become kinds, and what does not come across. Imports are atomic: repeat rows are skipped and one bad row stops the whole file. Every imported request gets its statutory deadline on day one.

## Verification

`npm test` runs every command on a temporary database with the demo employer: migrations, repeatable seed data, strict dates, working days over Labour Day and both summer close-downs, every statutory deadline, the grievance windows (90 days and 12 months), refusals with and without the ground or discussion, the fairness gate (hard gaps refused, soft gaps only with a reason that is kept), findings refused before the employee has responded, warnings and their expiry, closing rules, the protected disclosure kept out of every list, case, person, letter, view and document, Salesforce imports with dry run, repeats, mapping and rollback, drafts, export, the append-only activity log, database checks, views, documents and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Architecture

```
employee-relations-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Employee Relations for Claude Code for your business, migrates your Salesforce HR Service data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=salesforce-hr-service)
- Read more: [enterprisedna.co/omni/instead-of/salesforce-hr-service](https://enterprisedna.co/omni/instead-of/salesforce-hr-service?utm_source=github&utm_medium=readme&utm_campaign=salesforce-hr-service)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
