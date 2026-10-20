---
description: "Show what needs a person today: statutory deadlines missed, refusals without what the law asks for, responses due this week, fairness gaps, grievance windows still open, cases with no handler or gone quiet, and warnings about to expire."
---

# attention

Show what needs a person today: statutory deadlines missed, refusals without what the law asks for, responses due this week, fairness gaps, grievance windows still open, cases with no handler or gone quiet, and warnings about to expire.

Run `node scripts/cases.mjs attention`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with anything against the law or due in the next 3 days. Suggest the one next step for each line (usually /respond, /acknowledge, /step or /assign).
