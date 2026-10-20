---
description: "Close a case. Refused without a decision (or --withdrawn with the reason), with an allegation still open, before the person is told the outcome, or for a disclosure before the discloser is updated."
---

# close

Close a case. Refused without a decision (or --withdrawn with the reason), with an allegation still open, before the person is told the outcome, or for a disclosure before the discloser is updated.

Run `node scripts/cases.mjs close <ref> [--withdrawn="<why>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm in one line.
