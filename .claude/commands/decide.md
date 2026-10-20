---
description: "Record the outcome of a complaint, grievance, disclosure or conduct case. An adverse outcome (warning, demotion, dismissal) is refused unless the concerns were put in writing and the employee had the chance to respond; other gaps need --override with a reason, which is kept. A warning is recorded with its expiry."
---

# decide

Record the outcome of a complaint, grievance, disclosure or conduct case. An adverse outcome (warning, demotion, dismissal) is refused unless the concerns were put in writing and the employee had the chance to respond; other gaps need --override with a reason, which is kept. A warning is recorded with its expiry.

Run `node scripts/cases.mjs decide <ref> --outcome=<outcome> --reasons="<the decision-maker's reasons>" [--override="<reason>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Report the decision, any warning and its expiry, and the employee's challenge window. Never invent the reasons or the override.
