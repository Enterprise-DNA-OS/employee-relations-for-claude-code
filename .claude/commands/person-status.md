---
description: "Mark an employee as left (with the date), or active again. Lists the open cases that are about them or that they handle."
---

# person-status

Mark an employee as left (with the date), or active again. Lists the open cases that are about them or that they handle.

Run `node scripts/cases.mjs person-status <name> --status=<left|active> [--date=<YYYY-MM-DD>] [--reason="<why>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

List the cases that need a new handler or a decision.
