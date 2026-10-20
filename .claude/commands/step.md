---
description: "Record a process step: acknowledged, concerns-notified, information-provided, support-person-offered, response-invited (with --due), response-received, meeting-held, discussed, interim-measure, referred, outcome-told or discloser-updated."
---

# step

Record a process step: acknowledged, concerns-notified, information-provided, support-person-offered, response-invited (with --due), response-received, meeting-held, discussed, interim-measure, referred, outcome-told or discloser-updated.

Run `node scripts/cases.mjs step <ref> --kind=<step> [--date=<YYYY-MM-DD>] [--due=<YYYY-MM-DD>] [--detail="<what>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm, then show any fairness gaps still open on the case.
