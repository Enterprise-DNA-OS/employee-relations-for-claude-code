---
description: "Before an adverse outcome: what the record shows about a fair process (concerns put, information given, support person offered, time to respond, findings), and whether decide would accept it."
---

# fairness

Before an adverse outcome: what the record shows about a fair process (concerns put, information given, support person offered, time to respond, findings), and whether decide would accept it.

Run `node scripts/cases.mjs fairness <ref>`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say plainly whether the outcome would be accepted, and list each gap with its source. A hard gap cannot be overridden.
