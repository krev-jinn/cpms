# CPMS Requirements Traceability Matrix (RTM)

## Project Details
- **Project Title:** Court Proceedings Management System (CPMS)
- **Course:** BCSE301P – Software Engineering Lab
- **Institution:** School of Computer Science Engineering and Information Systems, Vellore Institute of Technology (VIT)
- **Author:** Pranayaa C (Reg. No: 24BYB0189)
- **Team Members:** Neethisha AB, Madhumitha R
- **Faculty:** Prof. Asha N

---

## 1. Traceability Matrix

The following matrix maps every architectural diagram and specification from the authoritative merged CPMS document to the software implementation, data models, behavior, and automated test cases.

| # | UML Diagram / Spec Element | Documented Requirement | Web Component / Screen | Data Model Entity / Attributes | Implemented Behavior | Test Case Reference |
|---|----------------------------|------------------------|------------------------|--------------------------------|----------------------|---------------------|
| 1 | **WBS 1 & Product Module 1** | Multi-Role Authentication & Role Permissions (Admin, Judge, Lawyer, Client, Court Staff) | Top App Header, 5-Role Pill Switcher, Navigation menu | `users` (user_id, role, name, email, phone, password), `admins`, `judges`, `lawyers`, `clients`, `court_staff` | Authenticates 5 roles, dynamically exposes role-authorized features and navigation | `TC_API_01`, `TC_UI_01`, `TC_UI_02` |
| 2 | **ER Diagram: USER ISA hierarchy** | Inheritance of base User attributes across 5 sub-roles | User profile badge, User session context | Sub-tables linked via `user_id` FK with specific professional attributes | Stores role-specific attributes (`specialisation`, `bar_council_no`, `address`, `designation`) | `TC_API_01` |
| 3 | **ER Diagram: CASE & LAWYER** | Lawyer files Case (`1` to `0..*`) | `file-case-view` (Electronic Filing Form) | `cases` (case_id, client_id, lawyer_id, title, description, filing_date, status) | Lawyer fills case pleadings; system validates inputs and creates persistent record | `TC_API_02`, `TC_API_03`, `TC_UI_03` |
| 4 | **ER Diagram: CASE & CLIENT** | Client involved in Case (`1` to `0..*`) | Client selector in filing form, Client dashboard | `clients` (client_id, user_id, contact_no, address) | Associates matter with client; enables client to track real-time matter progress | `TC_API_03`, `TC_UI_03` |
| 5 | **State Transition: 'Case Filed' -> 'Under Verification'** | E-filing triggers submission to Registry scrutiny | Case status badge, Scrutiny queue | `cases.status = 'Under Verification'` | Case submitted to Court Staff for verification upon e-filing | `TC_API_03`, `TC_UI_03` |
| 6 | **State Transition: 'Under Verification' -> 'Case Rejected'** | Court Staff identifies defects and returns case | Case detail action buttons, Rejection prompt | `cases.status = 'Case Rejected'`, `cases.rejection_remarks` | Staff logs defect remarks; status updates to 'Case Rejected'; lawyer alerted | `TC_API_03` |
| 7 | **State Transition: 'Case Rejected' -> 'Under Verification'** | Lawyer resubmits case after rectifying defects | `resubmit-case-modal` | `cases.description`, `cases.rejection_remarks = NULL` | Lawyer updates pleadings and resubmits back to scrutiny queue | `TC_API_03` |
| 8 | **State Transition: 'Under Verification' -> 'Case Registered'** | Court Staff admits valid case | Case detail action button ("Admit") | `cases.status = 'Case Registered'` | Staff marks case valid; case officially admitted into court register | `TC_API_03`, `TC_UI_04` |
| 9 | **State Transition: 'Case Registered' -> 'Judge Assigned'** | Admin assigns Judge from roster | `assign-judge-modal` | `cases.judge_id = judges.judge_id`, `cases.status = 'Judge Assigned'` | Admin assigns bench based on roster and specialisation | `TC_API_03` |
| 10 | **State Transition: 'Judge Assigned' -> 'Hearing Scheduled'** | Judge/Staff schedules date, time, venue | `schedule-hearing-modal`, `hearings-view` | `hearings` (hearing_id, case_id, conducted_by, hearing_date, hearing_time, venue, status) | Hearing created; notifications dispatched to lawyer, client, bench | `TC_API_03` |
| 11 | **State Transition: 'Hearing Scheduled' -> 'Hearing Rescheduled'** | Judge adjourns hearing to new date/time/venue | `reschedule-hearing-modal` | `hearings.status = 'RESCHEDULED'`, `cases.status = 'Hearing Rescheduled'` | Updates hearing date, records reason for adjournment, updates calendar | `TC_API_03` |
| 12 | **State Transition: 'Hearing Conducted' & Branching** | Judge presides, records minutes, and selects next procedural stage | `conduct-hearing-modal` | `hearings.status = 'COMPLETED'`, `hearings.remarks` | Records proceedings and advances state to 'Case Under Review', 'Hearing Scheduled', etc. | `TC_API_03` |
| 13 | **ER Diagram: EVIDENCE & State 'Evidence or Documents Upload'** | Lawyer uploads digital evidence files linked to case | `upload-evidence-modal`, Evidence tab | `evidence` (evidence_id, case_id, file_name, file_path, uploaded_by, description, file_size) | Multipart upload to disk (`uploads/`); records metadata and enables downloads | `TC_API_04` |
| 14 | **State Transition: 'Case Under Review' -> 'Judgement Issued'** | Judge pronounces final decision and uploads/generates order | `judgement-modal` | `judgements` (judgement_id, case_id, decision, judgement_date, remarks, pdf_path, issued_by) | Records operative order (Allowed/Dismissed), writes legal order to disk, updates status | `TC_API_03` |
| 15 | **State Transition: 'Judgement Issued' -> 'Case Closed'** | System / Admin formally closes and archives matter | Case details "Close Case" action | `cases.status = 'Case Closed'` | Marks case disposed and finalized in archives | `TC_API_03` |
| 16 | **Digital Audit Trail (Page 3 Spec)** | Real-time audit log of every upload, schedule change, status update | Case details Audit Trail tab | `case_history` (history_id, case_id, previous_status, new_status, changed_by_name, action, timestamp) | Logs timestamped audit records for every state mutation | `TC_API_03` |
| 17 | **ER Diagram: NOTIFICATION** | Alerts triggered upon state changes to relevant roles | Top bell icon, dropdown alert list | `notifications` (notification_id, case_id, message, date, is_read, recipient_role) | Automatically dispatches persistent in-app notifications on workflow events | `TC_API_03`, `TC_UI_01` |
| 18 | **ER Diagram: REPORT** | System activity, disposal rates, and judicial summaries | `reports-view`, CSV export | `reports` (report_id, report_type, generated_date, file) | Dynamically computes metrics from database and exports official CSV files | `TC_API_06`, `TC_UI_05` |
| 19 | **DFD Level 0, 1, 2 Alignment** | Context diagram, 5 decomposed processes, Level 2 Case Management | Full frontend view router and backend REST API (`/api/cases/*`) | All database tables and foreign keys | 1-to-1 operational fidelity with documented DFD data stores and flows | `TC_API_01` to `TC_API_06` |
| 20 | **Sequence Diagram: File and Register Case** | Lawyer -> UI -> Case -> Client -> Court Staff -> Notification -> Database | `file-case-form` -> `POST /api/cases/file` -> validation -> DB save -> notification | `cases`, `clients`, `notifications` | Follows the exact message exchange sequence from Page 24 of PDF | `TC_API_02`, `TC_API_03`, `TC_UI_03` |
| 21 | **Component & Package Diagrams** | Presentation, Application, Evidence & Notifications, Backend Services | `frontend/`, `backend/app.py`, `backend/state_machine.py`, `backend/ai_assistant.py` | SQLite DB, File Storage, REST API | Modular separation of concerns matching UML package definitions | Architecture verification |
| 22 | **Assessment 8.3: AI Integration** | AI Case Summary Assistant summarizing legal facts and extracting entities | `ai-assistant-view`, `POST /api/ai/summarize` | `AICaseSummaryAssistant` (Sumy LexRank/TextRank + NLP entity extraction) | Computes genuine extractive graph centrality summary, extracts parties, citations, reliefs | `TC_API_05`, `TC_UI_04` |
