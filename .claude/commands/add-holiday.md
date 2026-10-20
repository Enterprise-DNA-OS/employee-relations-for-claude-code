---
description: "Add a holiday (for example your region's anniversary day) to the working-day calendar."
---

# add-holiday

Add a holiday (for example your region's anniversary day) to the working-day calendar.

Run `node scripts/cases.mjs add-holiday --date=<YYYY-MM-DD> --name="<name>" [--country=NZ] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm, and name the deadlines that move.
