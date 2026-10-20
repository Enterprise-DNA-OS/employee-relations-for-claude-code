---
description: "Draft the letter inviting an employee to a disciplinary or performance meeting: each allegation word for word, the information relied on, the date to respond by, the right to a support person, and the most serious outcome being considered. Written to drafts/, never sent."
---

# draft-invite

Draft the letter inviting an employee to a disciplinary or performance meeting: each allegation word for word, the information relied on, the date to respond by, the right to a support person, and the most serious outcome being considered. Written to drafts/, never sent.

Run `node scripts/cases.mjs draft-invite <ref> [--consequence="<most serious outcome being considered>"]`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the file path and list every bracketed item the operator must fill in.
