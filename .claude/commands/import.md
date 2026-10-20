---
description: "Bring employees, then cases, across from Salesforce report exports (comma-separated). Dry run first. Repeat rows are skipped and one bad row stops the whole file."
---

# import

Bring employees, then cases, across from Salesforce report exports (comma-separated). Dry run first. Repeat rows are skipped and one bad row stops the whole file.

Run `node scripts/cases.mjs import salesforce <file.csv> --kind=<people|cases> [--country=<NZ|AU>] [--map="<Heading>:<field>"] --dry-run --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the dry-run counts, then ask before running without --dry-run.
