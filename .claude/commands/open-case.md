---
description: "Open a case: a question, request, flexible work request, parental leave extension (AU), privacy access request, statement of reasons (NZ), complaint, grievance, protected disclosure, investigation, disciplinary or performance matter. Shows the deadlines it starts."
---

# open-case

Open a case: a question, request, flexible work request, parental leave extension (AU), privacy access request, statement of reasons (NZ), complaint, grievance, protected disclosure, investigation, disciplinary or performance matter. Shows the deadlines it starts.

Run `node scripts/cases.mjs open-case --kind=<kind> --title="<title>" --person="<who it is about or who asked>" [--raised-by="<who raised it>"] [--handler="<HR person>"] [--received=<YYYY-MM-DD>] [--occurred=<YYYY-MM-DD>] [--sexual-harassment] [--anonymous] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm the reference and read out each deadline it started, with its source. For a New Zealand grievance ask for the date the action happened or came to their notice.
