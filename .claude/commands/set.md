---
description: "Change a house rule: acknowledge_days, answer_days, investigation_days, response_days, stale_days, privacy_au_days, warning_verbal_months, warning_written_months or warning_final_months."
---

# set

Change a house rule: acknowledge_days, answer_days, investigation_days, response_days, stale_days, privacy_au_days, warning_verbal_months, warning_written_months or warning_final_months.

Run `node scripts/cases.mjs set <setting> <value> --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm, and say it is a house rule, not law.
