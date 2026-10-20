---
description: "Record a piece of evidence on a case: what it is, where it came from, when, and where it is kept."
---

# evidence

Record a piece of evidence on a case: what it is, where it came from, when, and where it is kept.

Run `node scripts/cases.mjs evidence <ref> --description="<what>" [--source="<from>"] [--location="<where kept>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
