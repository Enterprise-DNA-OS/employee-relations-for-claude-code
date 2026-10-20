---
description: "Add an employee: code, name, country (NZ or AU), Australian state, email, job title, team, manager, start date, and --hr for the HR team."
---

# add-person

Add an employee: code, name, country (NZ or AU), Australian state, email, job title, team, manager, start date, and --hr for the HR team.

Run `node scripts/cases.mjs add-person --code=<code> --name="<name>" --country=<NZ|AU> [--state=<NSW>] [--title="<job title>"] [--team="<team>"] [--manager="<name>"] [--hr] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
