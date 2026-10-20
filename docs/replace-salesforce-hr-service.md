# Moving off Salesforce HR Service

The switch is two exports and two imports. Do a dry run of each first. Nothing is lost on the Salesforce side: keep your subscription until you are happy with what came across.

## 1. Export from Salesforce

In Salesforce, build two reports and export each with **Export, Details Only, Comma Delimited (.csv)**:

1. **Employees.** Report type Employees. Columns: Employee Number, First Name, Last Name, Email, Job Title, Department, Manager, Work Country, State, Start Date, Employee Status.
2. **HR cases.** Report type Cases, filtered to your HR case record type or queue. Columns: Case Number, Subject, Type, Status, Priority, Employee Number (or the employee or contact name), Case Owner, Date/Time Opened, Date/Time Closed, Description.

## 2. Import, people first

```bash
node scripts/cases.mjs import salesforce employees.csv --kind=people --actor="Your name" --dry-run
node scripts/cases.mjs import salesforce employees.csv --kind=people --actor="Your name"
node scripts/cases.mjs import salesforce cases.csv --kind=cases --country=NZ --actor="Your name" --dry-run
node scripts/cases.mjs import salesforce cases.csv --kind=cases --country=NZ --actor="Your name"
```

`examples/salesforce/` has a small file of each shape to try first.

### What each import reads

| Field | Headings it accepts |
|---|---|
| People: code | Employee Number, Employee ID |
| People: name | Full Name, Employee Name, Name, or First Name and Last Name |
| People: email, job title, team | Email, Work Email; Job Title, Title, Job Profile; Department, Team, Organisation |
| People: manager | Manager, Manager Name (matched by name or code after every row is in) |
| People: country and state | Country, Work Country, Location Country (New Zealand or Australia, or `--country`); State, State/Province, Work State |
| People: start date, status | Start Date, Employment Start Date, Hire Date; Employee Status, Status (terminated or inactive comes in as left) |
| Cases: number, subject, description | Case Number, Subject, Description |
| Cases: type | Type, Case Type, Topic, Category |
| Cases: employee | Employee Number, Contact Name, Employee Name (matched by code, name or email) |
| Cases: owner | Case Owner, Owner Name (matched to a person by name) |
| Cases: dates and status | Date/Time Opened, Opened Date, Created Date; Date/Time Closed, Closed Date; Status (closed or resolved) |

Headings that differ in your org: `--map="Staff No:code,Line Manager:manager"`.

Dates in `21/10/2026` or `2026-10-21` form both work. Repeat rows (same Employee Number or Case Number) are skipped, so you can import a newer export over the top. One bad row stops the whole file and nothing is kept.

### How case types become kinds

| Type or subject mentions | Becomes |
|---|---|
| flex | `flexible-work` |
| parental | `parental-leave-extension` (Australia; a request in New Zealand) |
| privacy, personnel file | `privacy-access` |
| grievance | `grievance` |
| complaint, bullying, harass | `complaint` |
| whistle, disclosure, speak up | `disclosure` |
| investigation | `investigation` |
| disciplinary, misconduct | `disciplinary` |
| performance | `performance` |
| request, change, correction | `request` |
| anything else | `question` |

Every imported open request gets its statutory deadline straight away, so a flexible work request already past its month shows on `/attention` on the first day.

## What does not come across

- **Conversations, emails and attachments** on the case feed. Keep the export, or save the files to your HR drive and record each one with `/evidence`.
- **Allegations, findings, interviews and process steps.** Salesforce holds them as free text, if at all. Add them for open conduct cases with `/allegation` and `/step` before any decision, so the fairness check has the record it needs.
- **Protected disclosures.** Bring these across by hand with `/open-case --kind=disclosure`, so the discloser is withheld from the start. Do not import a speak-up queue that names the discloser in the subject or description.
- **The employee portal, knowledge articles and the employee agent.** There is no portal here. Employees email or talk to HR; HR logs the case. Enterprise DNA builds a request form or a chat on the same database if you want one.
- **Slack and Teams notifications.** Not here. `/attention` each morning replaces them, or Enterprise DNA connects them.

## After the switch

1. `/attention` and `/deadlines`: what is already late.
2. `/fairness` on every open conduct case.
3. `/set` your own house rules (acknowledging, answering, warning periods).
4. Fill in `CLAUDE.md` (who this is for) and `brand.json` (your name and logo on every letter and document).
