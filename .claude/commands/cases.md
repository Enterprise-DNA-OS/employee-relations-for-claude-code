---
description: "Every open case (or --all), with who it is about, who raised it, the handler, its age and the next thing due. Filter by --kind, --status, --handler or --person."
---

# cases

Every open case (or --all), with who it is about, who raised it, the handler, its age and the next thing due. Filter by --kind, --status, --handler or --person.

Run `node scripts/cases.mjs cases [--kind=<kind>] [--handler=<name>] [--all]`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Table, oldest first. A protected disclosure shows "withheld" for who raised it; never try to find out who.
