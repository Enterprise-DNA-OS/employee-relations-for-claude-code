# Rules and sources

`/compliance` checks the records against these rules. Each row says where the rule comes from, what a breach looks like in the data, and where it is checked. Laws are checked as law; guidance is reported as guidance; house rules are the employer's own limits, changed with `set`, and are never reported as law.

Nothing here is legal advice. It records the rules the operator has asked the system to enforce. If a rule changes, update this page and the check together (`/customise`), then run `npm test`. Employment law changes often in both countries: check the current consolidated Act before relying on a row.

## Law: New Zealand

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A flexible working request is decided and the employee told in writing as soon as possible, and no later than 1 month after it is received | Employment Relations Act 2000 s 69AAE | A `flexible-work` case in NZ with no decision a month after `received_on` | `v_deadlines`; `/attention`, `/deadlines`, `/compliance` |
| A flexible working request may be refused only on one of the grounds in s 69AAF(2) (or must be refused under s 69AAF(3) when inconsistent with a collective agreement), and the refusal states the ground and the reasons | Employment Relations Act 2000 s 69AAE and s 69AAF | A refusal with no ground or no reasons | `respond` refuses; `v_case_problems` |
| An employee asked for a written statement of the reasons for dismissal gets it within 14 days of the request (the request is made within 60 days of the dismissal or of learning of it) | Employment Relations Act 2000 s 120 | A `statement-of-reasons` case with no answer 14 days after `received_on` | `v_deadlines` |
| A personal grievance is raised within 90 days of the action, or of it coming to the employee's notice, whichever is later; 12 months for sexual harassment (from 13 June 2023). Later, the employer may consent or the Authority may grant leave | Employment Relations Act 2000 s 114(1), (3), (4) and (7) | A grievance whose `received_on` is outside the window from `occurred_on` (noted, not a breach by the employer) | `v_case_problems` (note) |
| After an adverse decision, the employee may raise a personal grievance within 90 days | Employment Relations Act 2000 s 114(1) | Not a breach. The window shows until it closes | `v_windows`; `/deadlines`, `/attention` |
| Whether a dismissal or action was justifiable is judged by whether the employer sufficiently investigated, raised the concerns with the employee, gave a reasonable opportunity to respond, and genuinely considered the explanation | Employment Relations Act 2000 s 103A(3)(a) to (d) | An adverse outcome with no `concerns-notified`, no `response-invited`, the response time not passed and no response, or an allegation without a finding | `v_fairness_gaps`; `decide` refuses; `finding` refuses before the employee has responded |
| An employer proposing a decision likely to affect an employee's continued employment gives them access to the relevant information and an opportunity to comment before deciding | Employment Relations Act 2000 s 4(1A)(c) | An adverse outcome with no `information-provided` | `v_fairness_gaps` (needs `--override` with a reason) |
| An agency decides an access request and tells the requester within 20 working days. A working day excludes weekends, the listed public holidays (Mondayised) and 25 December to 15 January | Privacy Act 2020 s 44 and the definition of working day in s 7 | A NZ `privacy-access` case with no decision by the 20th working day | `v_deadlines` using `add_working_days(..., 'privacy')` |
| A refusal or partial release tells the requester the reason and their right to complain to the Privacy Commissioner | Privacy Act 2020 Part 4 (notice of a decision on a request) | A partial or refused decision with no reasons | `respond` requires `--reasons`; `draft-response` names the right to complain |

## Guidance: New Zealand

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| Within 20 working days of receiving a protected disclosure the receiver should acknowledge it, consider whether it warrants investigation, check whether it was made elsewhere, deal with it, and tell the discloser | Protected Disclosures (Protection of Whistleblowers) Act 2022 s 13 ("should": guidance) | A NZ `disclosure` with no decision and no `discloser-updated` step by the 20th working day, counted as the Legislation Act 2019 s 13 defines a working day (25 December to 2 January excluded) | `v_deadlines` (guidance); `close` refuses until the discloser is updated |
| The receiver uses best endeavours to keep the discloser's identity confidential | Protected Disclosures Act 2022 s 17 | Not in the data. The system withholds the discloser from every output | `v_cases`, `case`, `person`, drafts, views, documents |

## Law: Australia

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| An employer gives a written response to a request for a flexible working arrangement within 21 days | Fair Work Act 2009 (Cth) s 65A | An AU `flexible-work` case with no decision 21 days after `received_on` | `v_deadlines` |
| A request may be refused only after discussing it with the employee and genuinely trying to reach agreement, on reasonable business grounds, with the reasons and how the grounds apply set out in writing | Fair Work Act 2009 (Cth) s 65A | A refusal with no `discussed` step on or before the decision, or no reasons | `respond` refuses; `v_case_problems` |
| An employer gives a written response to a request to extend unpaid parental leave within 21 days, refusing only on reasonable business grounds after discussion | Fair Work Act 2009 (Cth) s 76A | An AU `parental-leave-extension` with no decision after 21 days, or refused without a discussion or reasons | `v_deadlines`; `respond` refuses |
| In deciding whether a dismissal was harsh, unjust or unreasonable, the Commission considers whether there was a valid reason, whether the employee was notified of it and given an opportunity to respond, and any unreasonable refusal to allow a support person | Fair Work Act 2009 (Cth) s 387(a) to (d) | As for s 103A above; a missing support person offer needs `--override` with a reason | `v_fairness_gaps`; `decide` |
| An unfair dismissal or general protections dismissal application is made within 21 days after the dismissal takes effect | Fair Work Act 2009 (Cth) s 394(2), s 366(1) | Not a breach. The window shows until it closes | `v_windows` |

Australian employee records held by a private sector employer are generally exempt from the Privacy Act 1988 (Cth) (s 7B(3)), so an Australian access request is answered against a house rule (`privacy_au_days`), not a statutory deadline.

Sources, checked 20 October 2026:

- Employment Relations Act 2000 (NZ): https://www.legislation.govt.nz/act/public/2000/0024/latest/ (ss 4, 69AAE, 69AAF, 103A, 114, 120)
- Employment Relations (Extended Time for Personal Grievance for Sexual Harassment) Amendment Act 2023: https://legislation.govt.nz/act/public/2023/28/en/latest/
- Privacy Act 2020 (NZ): https://www.legislation.govt.nz/act/public/2020/0031/latest/ (ss 7 and 44, Part 4)
- Protected Disclosures (Protection of Whistleblowers) Act 2022 (NZ): https://www.legislation.govt.nz/act/public/2022/0020/latest/ (ss 13, 17)
- Legislation Act 2019 (NZ) s 13, working day: https://www.legislation.govt.nz/act/public/2019/0058/latest/
- Fair Work Act 2009 (Cth): https://www.legislation.gov.au/C2009A00028/latest/text (ss 65A, 76A, 366, 387, 394)
- Fair Work Ombudsman, extending unpaid parental leave: https://www.fairwork.gov.au/leave/parental-leave/during-parental-leave/extending-parental-leave

## House rules (change them with `set`)

| Setting | Default | What it checks | Why |
|---|---|---|---|
| `acknowledge_days` | 3 | Days to acknowledge a complaint, grievance or disclosure | Silence after someone raises a concern is the most common complaint about HR |
| `answer_days` | 5 | Days to answer a question or a non-statutory request | Your service standard |
| `investigation_days` | 42 | Days from receipt to a decision on a complaint, grievance, disclosure or conduct case | Delay is itself unfair to both sides; set your own |
| `response_days` | 5 | Days given to respond to concerns, when the step does not set its own date | A reasonable opportunity to respond; give more for complex matters |
| `stale_days` | 14 | An open case untouched for longer is flagged | Cases go quiet |
| `privacy_au_days` | 30 | Days to answer an Australian employee's request to see their file | Your own limit (see above) |
| `warning_verbal_months`, `warning_written_months`, `warning_final_months` | 6, 12, 12 | How long a warning stays live | Most policies and agreements set a period; put yours here |

Every open case has a handler, and an outcome is told to the person before the case closes. These are house rules too.

A soft fairness gap can be passed with `--override="<reason>"` on `decide`. The reason is stored on the case, in the activity log and in `/compliance`. A hard gap (concerns not put, no opportunity to respond) cannot be overridden.
