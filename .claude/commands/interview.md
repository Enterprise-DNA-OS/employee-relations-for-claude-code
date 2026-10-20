---
description: "Record an interview: who, their role, the date, any support person, where the notes are, and whether they are signed."
---

# interview

Record an interview: who, their role, the date, any support person, where the notes are, and whether they are signed.

Run `node scripts/cases.mjs interview <ref> --role=<complainant|respondent|witness|employee|discloser> --person="<name>" [--name="<someone outside the business>"] [--support="<who>"] [--notes="<where>"] [--signed] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
