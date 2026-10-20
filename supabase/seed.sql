-- A fictional employer for the demo and the tests: Harbourline Distribution, about 300 staff,
-- warehouses in Auckland, Sydney and Melbourne, three people in HR.
-- Every date is relative to today, so the demo always has something overdue, due soon and stale.
-- Safe to run twice: it does nothing once C-1001 exists.

insert into settings (key, value, note) values
  ('acknowledge_days', '3', 'Days to acknowledge a complaint, grievance or disclosure'),
  ('answer_days', '5', 'Days to answer an HR question or request'),
  ('investigation_days', '42', 'Days from receipt to a decision on a complaint, grievance, disclosure or investigation'),
  ('response_days', '5', 'Days given to an employee to respond to concerns, unless set on the step'),
  ('stale_days', '14', 'An open case untouched for longer than this is flagged'),
  ('privacy_au_days', '30', 'Days to answer an Australian employee''s request to see their file'),
  ('warning_verbal_months', '6', 'How long a verbal warning stays live'),
  ('warning_written_months', '12', 'How long a written warning stays live'),
  ('warning_final_months', '12', 'How long a final warning stays live')
on conflict (key) do nothing;

insert into holidays (country, day, name) values
  ('NZ', '2026-01-01', 'New Year''s Day'), ('NZ', '2026-01-02', 'Day after New Year''s Day'),
  ('NZ', '2026-02-06', 'Waitangi Day'), ('NZ', '2026-04-03', 'Good Friday'), ('NZ', '2026-04-06', 'Easter Monday'),
  ('NZ', '2026-04-27', 'Anzac Day (observed)'), ('NZ', '2026-06-01', 'King''s Birthday'), ('NZ', '2026-07-10', 'Matariki'),
  ('NZ', '2026-10-26', 'Labour Day'), ('NZ', '2026-12-25', 'Christmas Day'), ('NZ', '2026-12-28', 'Boxing Day (observed)'),
  ('NZ', '2027-01-01', 'New Year''s Day'), ('NZ', '2027-01-04', 'Day after New Year''s Day (observed)'),
  ('NZ', '2027-02-08', 'Waitangi Day (observed)'), ('NZ', '2027-03-26', 'Good Friday'), ('NZ', '2027-03-29', 'Easter Monday'),
  ('NZ', '2027-04-26', 'Anzac Day (observed)'), ('NZ', '2027-06-07', 'King''s Birthday'), ('NZ', '2027-06-25', 'Matariki'),
  ('NZ', '2027-10-25', 'Labour Day'), ('NZ', '2027-12-27', 'Christmas Day (observed)'), ('NZ', '2027-12-28', 'Boxing Day (observed)')
on conflict do nothing;

do $$
declare
  t date := current_date;
begin
  if exists (select 1 from cases where ref = 'C-1001') then return; end if;

  -- People. HR first, then managers, then staff.
  insert into people (code, name, email, job_title, team, country, state, started_on, hr) values
    ('P-001', 'Anna Whitlock', 'anna.whitlock@harbourline.example', 'Head of People', 'People', 'NZ', null, t - 2100, true),
    ('P-002', 'Jared Lim', 'jared.lim@harbourline.example', 'HR Advisor', 'People', 'AU', 'NSW', t - 900, true),
    ('P-003', 'Mele Fifita', 'mele.fifita@harbourline.example', 'HR Advisor', 'People', 'NZ', null, t - 700, true),
    ('P-010', 'Craig Bennett', 'craig.bennett@harbourline.example', 'Warehouse Manager', 'Auckland Warehouse', 'NZ', null, t - 3000, false),
    ('P-011', 'Sarah O''Neill', 'sarah.oneill@harbourline.example', 'Operations Manager', 'Sydney Warehouse', 'AU', 'NSW', t - 2400, false),
    ('P-012', 'Tama Ruawai', 'tama.ruawai@harbourline.example', 'Sales Manager', 'Sales NZ', 'NZ', null, t - 1800, false),
    ('P-013', 'Rebecca Moore', 'rebecca.moore@harbourline.example', 'Finance Manager', 'Finance', 'NZ', null, t - 1500, false),
    ('P-014', 'Ben Hartley', 'ben.hartley@harbourline.example', 'Depot Manager', 'Melbourne Depot', 'AU', 'VIC', t - 1300, false);
  insert into people (code, name, email, job_title, team, country, state, started_on, manager_id)
  select x.code, x.name, x.email, x.job_title, x.team, x.country, x.state, t - x.days, (select id from people where code = x.mgr)
    from (values
      ('P-020', 'Hemi Walker', 'hemi.walker@harbourline.example', 'Forklift Operator', 'Auckland Warehouse', 'NZ', null, 1400, 'P-010'),
      ('P-021', 'Grace Thompson', 'grace.thompson@harbourline.example', 'Storeperson', 'Auckland Warehouse', 'NZ', null, 600, 'P-010'),
      ('P-022', 'Leon Fraser', 'leon.fraser@harbourline.example', 'Team Leader', 'Auckland Warehouse', 'NZ', null, 2200, 'P-010'),
      ('P-023', 'Priya Nair', 'priya.nair@harbourline.example', 'Customer Service Lead', 'Sales NZ', 'NZ', null, 1100, 'P-012'),
      ('P-024', 'Sam Tuilagi', 'sam.tuilagi@harbourline.example', 'Account Manager', 'Sales NZ', 'NZ', null, 950, 'P-012'),
      ('P-025', 'Olivia Chen', 'olivia.chen@harbourline.example', 'Accounts Payable Officer', 'Finance', 'NZ', null, 500, 'P-013'),
      ('P-027', 'Aroha Ngata', 'aroha.ngata@harbourline.example', 'Warehouse Administrator', 'Auckland Warehouse', 'NZ', null, 800, 'P-010'),
      ('P-030', 'Daniel Russo', 'daniel.russo@harbourline.example', 'Picker', 'Sydney Warehouse', 'AU', 'NSW', 1000, 'P-011'),
      ('P-031', 'Aisha Karim', 'aisha.karim@harbourline.example', 'Customer Service Officer', 'Sydney Warehouse', 'AU', 'NSW', 650, 'P-011'),
      ('P-032', 'Jack Morrison', 'jack.morrison@harbourline.example', 'Driver', 'Melbourne Depot', 'AU', 'VIC', 1200, 'P-014'),
      ('P-033', 'Emily Park', 'emily.park@harbourline.example', 'Depot Administrator', 'Melbourne Depot', 'AU', 'VIC', 400, 'P-014'),
      ('P-035', 'Lachlan Brooks', 'lachlan.brooks@harbourline.example', 'Driver', 'Melbourne Depot', 'AU', 'VIC', 700, 'P-014')
    ) as x(code, name, email, job_title, team, country, state, days, mgr);
  insert into people (code, name, email, job_title, team, country, started_on, left_on, status, manager_id)
  values ('P-026', 'Mark Dunn', null, 'Storeperson', 'Auckland Warehouse', 'NZ', t - 1600, t - 40, 'left', (select id from people where code = 'P-010'));

  -- Cases.
  insert into cases (ref, kind, title, person_id, raised_by_id, handler_id, country, received_on, occurred_on, sexual_harassment, protected,
                     status, priority, summary, acknowledged_on, decision, decision_on, ground_code, reasons, override, outcome_told_on, closed_on)
  select x.ref, x.kind, x.title, (select id from people where code = x.person), (select id from people where code = x.raised_by),
         (select id from people where code = x.handler), x.country, t - x.received, case when x.occurred is null then null else t - x.occurred end,
         x.sh, x.prot, x.status, x.priority, x.summary, case when x.ack is null then null else t - x.ack end, x.decision,
         case when x.decided is null then null else t - x.decided end, x.ground, x.reasons, x.override,
         case when x.told is null then null else t - x.told end, case when x.closed is null then null else t - x.closed end
    from (values
      ('C-1001', 'flexible-work', 'Work from home Wednesdays and Fridays', 'P-023', 'P-023', 'P-003', 'NZ', 35, null::int, false, false, 'open', 'normal',
        'Wants two home days a week to cut a 90-minute commute. Phones can be diverted.', 34, null, null::int, null, null, null, null::int, null::int),
      ('C-1002', 'flexible-work', 'Compressed hours, four ten-hour days', 'P-031', 'P-031', 'P-002', 'AU', 30, null, false, false, 'decided', 'normal',
        'Asked to work Monday to Thursday, 7 am to 5.30 pm.', 29, 'refused', 12, null,
        'The customer service desk must be staffed Friday 8 am to 5 pm and no one else on the team is trained on the Coles account.', null, 12, null),
      ('C-1003', 'flexible-work', 'Start at 9.30 am for school drop-off', 'P-033', 'P-033', 'P-002', 'AU', 10, null, false, false, 'open', 'normal',
        'Wants to start at 9.30 am and finish at 6 pm, Monday to Friday.', 9, null, null, null, null, null, null, null),
      ('C-1004', 'parental-leave-extension', 'Extend unpaid parental leave by 6 months', 'P-032', 'P-032', 'P-002', 'AU', 18, null, false, false, 'open', 'normal',
        'First 12 months end next month. Asks for a further 6 months.', 17, null, null, null, null, null, null, null),
      ('C-1005', 'privacy-access', 'Copy of my personnel file', 'P-021', 'P-021', 'P-003', 'NZ', 24, null, false, false, 'open', 'normal',
        'Asked for everything held about her, including notes from the bullying investigation.', 23, null, null, null, null, null, null, null),
      ('C-1006', 'statement-of-reasons', 'Statement of reasons for dismissal', 'P-026', 'P-026', 'P-001', 'NZ', 16, null, false, false, 'open', 'high',
        'Former employee''s lawyer asked for the reasons for dismissal in writing.', 15, null, null, null, null, null, null, null),
      ('C-1007', 'investigation', 'Bullying complaint against team leader', 'P-022', 'P-021', 'P-001', 'NZ', 30, null, false, false, 'investigating', 'high',
        'Grace says Leon shouted at her on the floor in front of the team and gave her the worst shifts after she raised a safety issue.', 29, null, null, null, null, null, null, null),
      ('C-1008', 'disciplinary', 'Operated a reach truck without a licence', 'P-030', null, 'P-002', 'AU', 7, null, false, false, 'investigating', 'high',
        'CCTV shows Daniel moving pallets on the reach truck in aisle 14. He holds no high risk work licence.', null, null, null, null, null, null, null, null),
      ('C-1009', 'disclosure', 'Supplier invoices approved outside policy', 'P-013', 'P-025', 'P-001', 'NZ', 26, null, false, true, 'investigating', 'high',
        'Invoices from one freight supplier approved over the delegation limit and split to stay under it.', 25, null, null, null, null, null, null, null),
      ('C-1010', 'grievance', 'Unjustified disadvantage: commission plan change', 'P-024', 'P-024', 'P-003', 'NZ', 8, 110, false, false, 'open', 'normal',
        'Says the new commission plan cut his earnings without consultation.', null, null, null, null, null, null, null, null),
      ('C-1011', 'grievance', 'Sexual harassment by a team leader', 'P-022', 'P-027', 'P-001', 'NZ', 20, 200, true, false, 'investigating', 'high',
        'Aroha says Leon made repeated comments about her appearance and sent messages after hours last summer.', 19, null, null, null, null, null, null, null),
      ('C-1012', 'performance', 'Late deliveries and missed run sheets', 'P-035', null, 'P-002', 'AU', 90, null, false, false, 'closed', 'normal',
        'Eleven late deliveries in six weeks, run sheets not completed.', null, 'written-warning', 60, null,
        'Lachlan accepted the run sheets were not done and gave no reason the late deliveries were outside his control.', null, 60, 58),
      ('C-1013', 'disciplinary', 'Forklift near miss, speeding in the yard', 'P-020', null, 'P-003', 'NZ', 215, null, false, false, 'closed', 'normal',
        'Hemi drove a laden forklift through the pedestrian zone at speed; a storeperson stepped back to avoid it.', null, 'final-warning', 200, null,
        'Hemi accepted he was going too fast and had a written warning for the same thing four months earlier.', 'He declined a support person at the meeting but it was not offered in the letter', 200, 199),
      ('C-1014', 'disciplinary', 'Theft of stock', 'P-026', null, 'P-001', 'NZ', 70, null, false, false, 'closed', 'high',
        'Two cartons of power tools found in his car after a stock count.', null, 'dismissal', 45,
        null, 'The CCTV and the stock count match the cartons in his car. His explanation that a friend left them there does not fit the footage.', null, 44, 40),
      ('C-1015', 'question', 'How much annual leave do I have left', 'P-020', 'P-020', 'P-003', 'NZ', 9, null, false, false, 'open', 'low',
        'Wants to book three weeks in January.', null, null, null, null, null, null, null, null),
      ('C-1016', 'request', 'Payslip correction for overtime', 'P-030', 'P-030', null, 'AU', 2, null, false, false, 'open', 'normal',
        'Says four hours of Saturday overtime are missing from the last pay.', null, null, null, null, null, null, null, null),
      ('C-1017', 'complaint', 'Unfair rostering by the operations manager', 'P-011', 'P-030', 'P-002', 'AU', 50, null, false, false, 'closed', 'normal',
        'Daniel says Sarah gives the weekend overtime to the same three pickers.', 49, 'not-upheld', 20, null,
        'Overtime records for 13 weeks show it spread across 11 pickers; Daniel was offered 6 shifts and took 2.', null, 18, 18),
      ('C-1018', 'disciplinary', 'Speeding in the yard (earlier)', 'P-020', null, 'P-003', 'NZ', 355, null, false, false, 'closed', 'normal',
        'Yard camera shows the forklift over 10 km/h in the loading bay.', null, 'written-warning', 340, null,
        'Hemi accepted the speed and said he was behind on loads.', null, 340, 338)
    ) as x(ref, kind, title, person, raised_by, handler, country, received, occurred, sh, prot, status, priority, summary, ack, decision, decided, ground, reasons, override, told, closed);
  perform setval('case_ref_seq', 1018);

  -- Allegations and findings.
  insert into allegations (case_id, n, category, text, respondent_id, finding, finding_on, finding_reasons)
  select (select id from cases where ref = x.ref), x.n, x.category, x.text, (select id from people where code = x.resp), x.finding,
         case when x.found is null then null else t - x.found end, x.why
    from (values
      ('C-1007', 1, 'bullying', 'Shouted at Grace on the warehouse floor in front of the team', 'P-022', 'substantiated', 8::int, 'Two witnesses heard it; Leon accepts he raised his voice.'),
      ('C-1007', 2, 'bullying', 'Rostered Grace on the least wanted shifts after she raised a safety issue', 'P-022', 'open', null, null),
      ('C-1008', 1, 'safety', 'Operated a reach truck without a high risk work licence', 'P-030', 'open', null, null),
      ('C-1009', 1, 'fraud', 'Approved freight invoices over the delegation limit and split them to stay under it', 'P-013', 'open', null, null),
      ('C-1011', 1, 'sexual-harassment', 'Repeated comments about Aroha''s appearance', 'P-022', 'open', null, null),
      ('C-1011', 2, 'sexual-harassment', 'Messages sent after hours', 'P-022', 'open', null, null),
      ('C-1012', 1, 'performance', 'Eleven late deliveries in six weeks', 'P-035', 'substantiated', 62, 'Run sheets and customer complaints match.'),
      ('C-1013', 1, 'safety', 'Drove a laden forklift through the pedestrian zone at speed', 'P-020', 'substantiated', 201, 'CCTV and the storeperson''s account.'),
      ('C-1014', 1, 'misconduct', 'Removed two cartons of power tools without paying', 'P-026', 'substantiated', 46, 'CCTV, the stock count and the cartons in his car.'),
      ('C-1017', 1, 'other', 'Weekend overtime given to the same three pickers', 'P-011', 'not-substantiated', 21, 'Overtime spread across 11 pickers over 13 weeks.'),
      ('C-1018', 1, 'safety', 'Forklift over the 10 km/h yard limit', 'P-020', 'substantiated', 341, 'Yard camera speed overlay.')
    ) as x(ref, n, category, text, resp, finding, found, why);

  -- Process steps.
  insert into steps (case_id, kind, on_date, due_on, detail, actor)
  select (select id from cases where ref = x.ref), x.kind, t - x.on_days, case when x.due is null then null else t - x.due end, x.detail, 'seed'
    from (values
      ('C-1001', 'acknowledged', 34, null::int, 'Email to Priya confirming the request was received'),
      ('C-1002', 'acknowledged', 29, null, null),
      ('C-1003', 'acknowledged', 9, null, null),
      ('C-1003', 'discussed', 3, null, 'Met Emily and Ben; trying a 9 am start as a middle ground'),
      ('C-1004', 'acknowledged', 17, null, null),
      ('C-1005', 'acknowledged', 23, null, null),
      ('C-1006', 'acknowledged', 15, null, 'Replied to the lawyer'),
      ('C-1007', 'acknowledged', 29, null, null),
      ('C-1007', 'interim-measure', 28, null, 'Grace moved to the day shift under a different team leader'),
      ('C-1007', 'concerns-notified', 20, null, 'Letter to Leon setting out both allegations'),
      ('C-1007', 'information-provided', 20, null, 'Grace''s statement and the roster for 8 weeks'),
      ('C-1007', 'support-person-offered', 20, null, null),
      ('C-1007', 'response-invited', 20, 13, null),
      ('C-1007', 'response-received', 12, null, 'Leon''s written response; accepts raising his voice, denies the rostering'),
      ('C-1007', 'meeting-held', 12, null, 'Leon with his union delegate'),
      ('C-1008', 'concerns-notified', 6, null, 'Letter to Daniel with the CCTV still'),
      ('C-1008', 'information-provided', 6, null, 'CCTV still and the licence register'),
      ('C-1008', 'response-invited', 6, -1, null),
      ('C-1009', 'acknowledged', 25, null, 'Acknowledged in person; confirmed the discloser''s name stays confidential'),
      ('C-1011', 'acknowledged', 19, null, null),
      ('C-1012', 'concerns-notified', 75, null, null), ('C-1012', 'information-provided', 75, null, 'Run sheets and complaint log'),
      ('C-1012', 'support-person-offered', 75, null, null), ('C-1012', 'response-invited', 75, 68, null),
      ('C-1012', 'response-received', 66, null, null), ('C-1012', 'meeting-held', 66, null, null), ('C-1012', 'outcome-told', 60, null, null),
      ('C-1013', 'concerns-notified', 210, null, null), ('C-1013', 'information-provided', 210, null, 'CCTV clip'),
      ('C-1013', 'response-invited', 210, 205, null), ('C-1013', 'response-received', 204, null, null), ('C-1013', 'outcome-told', 200, null, null),
      ('C-1014', 'concerns-notified', 60, null, null), ('C-1014', 'information-provided', 60, null, 'CCTV and stock count'),
      ('C-1014', 'support-person-offered', 60, null, null), ('C-1014', 'response-invited', 60, 53, null),
      ('C-1014', 'response-received', 52, null, null), ('C-1014', 'meeting-held', 52, null, 'Mark with his brother as support person'),
      ('C-1014', 'outcome-told', 44, null, null),
      ('C-1017', 'acknowledged', 49, null, null), ('C-1017', 'outcome-told', 18, null, null),
      ('C-1018', 'concerns-notified', 350, null, null), ('C-1018', 'information-provided', 350, null, null),
      ('C-1018', 'support-person-offered', 350, null, null), ('C-1018', 'response-invited', 350, 345, null),
      ('C-1018', 'response-received', 344, null, null), ('C-1018', 'outcome-told', 340, null, null)
    ) as x(ref, kind, on_days, due, detail);

  insert into interviews (case_id, person_id, role, held_on, support_person, notes_location, signed)
  select (select id from cases where ref = x.ref), (select id from people where code = x.who), x.role, t - x.d, x.sp, x.loc, x.signed
    from (values
      ('C-1007', 'P-021', 'complainant', 26, 'Her sister', 'HR drive / C-1007 / interview-grace.docx', true),
      ('C-1007', 'P-020', 'witness', 22, null, 'HR drive / C-1007 / interview-hemi.docx', true),
      ('C-1007', 'P-027', 'witness', 22, null, 'HR drive / C-1007 / interview-aroha.docx', false),
      ('C-1007', 'P-022', 'respondent', 12, 'Union delegate', 'HR drive / C-1007 / interview-leon.docx', false),
      ('C-1009', 'P-025', 'discloser', 24, null, 'Locked folder / C-1009', true),
      ('C-1011', 'P-027', 'complainant', 15, 'Her mother', 'HR drive / C-1011 / interview-aroha.docx', true)
    ) as x(ref, who, role, d, sp, loc, signed);

  insert into evidence (case_id, n, description, source, received_on, location)
  select (select id from cases where ref = x.ref), x.n, x.descr, x.src, t - x.d, x.loc
    from (values
      ('C-1007', 1, 'Rosters for the 8 weeks before and after the safety report', 'Rostering system export', 27, 'HR drive / C-1007 / rosters.xlsx'),
      ('C-1007', 2, 'Grace''s safety report about the blocked fire exit', 'Health and safety register', 27, 'HR drive / C-1007 / safety-report.pdf'),
      ('C-1008', 1, 'CCTV still, aisle 14', 'Security', 7, 'HR drive / C-1008 / cctv.png'),
      ('C-1009', 1, 'Seven freight invoices and their approvals', 'Accounts payable system', 24, 'Locked folder / C-1009'),
      ('C-1011', 1, 'Screenshots of the messages', 'Aroha', 15, 'HR drive / C-1011 / messages.pdf'),
      ('C-1014', 1, 'CCTV, dock door 3', 'Security', 62, 'HR drive / C-1014 / cctv.mp4')
    ) as x(ref, n, descr, src, d, loc);

  insert into warnings (case_id, person_id, level, issued_on, expires_on, reason)
  select (select id from cases where ref = x.ref), (select id from people where code = x.who), x.level, t - x.d, (t - x.d + (x.months || ' months')::interval)::date, x.reason
    from (values
      ('C-1012', 'P-035', 'written', 60, 12, 'Late deliveries and missed run sheets'),
      ('C-1013', 'P-020', 'final', 200, 12, 'Forklift speeding through the pedestrian zone'),
      ('C-1018', 'P-020', 'written', 340, 12, 'Forklift over the yard speed limit')
    ) as x(ref, who, level, d, months, reason);

  -- The activity log, so "last touched" means something.
  insert into activity (at, actor, action, ref, detail)
  select now() - (x.d || ' days')::interval, x.actor, x.action, x.ref, x.detail
    from (values
      (34, 'Mele Fifita', 'acknowledge', 'C-1001', 'acknowledged'),
      (12, 'Jared Lim', 'respond', 'C-1002', 'refused'),
      (3, 'Jared Lim', 'step', 'C-1003', 'discussed'),
      (17, 'Jared Lim', 'acknowledge', 'C-1004', 'acknowledged'),
      (23, 'Mele Fifita', 'acknowledge', 'C-1005', 'acknowledged'),
      (15, 'Anna Whitlock', 'acknowledge', 'C-1006', 'acknowledged'),
      (8, 'Anna Whitlock', 'finding', 'C-1007', 'allegation 1 substantiated'),
      (6, 'Jared Lim', 'step', 'C-1008', 'response invited'),
      (24, 'Anna Whitlock', 'interview', 'C-1009', 'discloser interviewed'),
      (8, 'Mele Fifita', 'open-case', 'C-1010', 'grievance received'),
      (15, 'Anna Whitlock', 'interview', 'C-1011', 'complainant interviewed'),
      (9, 'Mele Fifita', 'open-case', 'C-1015', 'question received'),
      (2, 'Jared Lim', 'open-case', 'C-1016', 'request received')
    ) as x(d, actor, action, ref, detail);
end $$;
