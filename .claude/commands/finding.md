---
description: "Record the finding on one allegation, with the reasons. On a conduct case, refused until the employee has heard the allegation and had the chance to respond."
---

# finding

Record the finding on one allegation, with the reasons. On a conduct case, refused until the employee has heard the allegation and had the chance to respond.

Run `node scripts/cases.mjs finding <ref> --n=<number> --finding=<substantiated|partly-substantiated|not-substantiated|unable-to-determine> --reasons="<why>" --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm. Never write the reasons yourself: they are the decision-maker's.
