---
description: "Add a note to a case's activity log."
---

# log

Add a note to a case's activity log.

Run `node scripts/cases.mjs log <ref> --note="<note>" --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
