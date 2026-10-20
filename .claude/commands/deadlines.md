---
description: "Every dated obligation due in the next 30 days (or --days=N) and anything overdue, with the rule and its source, plus the challenge windows still open after adverse decisions."
---

# deadlines

Every dated obligation due in the next 30 days (or --days=N) and anything overdue, with the rule and its source, plus the challenge windows still open after adverse decisions.

Run `node scripts/cases.mjs deadlines [--days=30]`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Overdue first, law before house rules. Name the source for each.
