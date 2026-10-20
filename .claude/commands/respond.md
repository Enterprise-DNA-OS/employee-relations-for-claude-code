---
description: "Record the written answer to a question, request or statutory request. A New Zealand flexible work refusal needs a s 69AAF(2) ground and reasons; an Australian refusal needs a recorded discussion first and reasons; a privacy refusal needs reasons."
---

# respond

Record the written answer to a question, request or statutory request. A New Zealand flexible work refusal needs a s 69AAF(2) ground and reasons; an Australian refusal needs a recorded discussion first and reasons; a privacy refusal needs reasons.

Run `node scripts/cases.mjs respond <ref> --decision=<approved|varied|refused|granted|partial|provided|answered> [--ground=<reorganise|recruit|quality|performance|insufficient-work|structural-change|cost|customer-demand|collective-agreement>] [--reasons="<why>"] --actor="<you>"`. Add `--json` when you need every field. Resolve the person or case by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Report whether the deadline was met, then offer /draft-response.
