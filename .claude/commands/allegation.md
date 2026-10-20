---
description: "Add an allegation to a complaint, grievance, disclosure or conduct case, with its category and who it is about."
---

# allegation

Add an allegation to a complaint, grievance, disclosure or conduct case, with its category and who it is about.

Run `node scripts/cases.mjs allegation <ref> --text="<exactly what is alleged>" [--category=<bullying|harassment|sexual-harassment|discrimination|misconduct|safety|fraud|performance|other>] [--respondent="<name>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Read the allegation back word for word. The employee will see this wording.
