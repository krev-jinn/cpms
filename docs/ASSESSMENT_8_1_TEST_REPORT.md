# Assessment 8.1: Software Testing Comprehensive Report

**Project Title:** Court Proceedings Management System (CPMS)  
**Selected Module:** Case Management Module  
**Student Name:** Pranayaa C  
**Registration Number:** 24BYB0189  
**Team Members:** Neethisha AB, Madhumitha R  
**Course Code & Title:** BCSE301P – Software Engineering Lab  
**Institution:** School of Computer Science Engineering and Information Systems, Vellore Institute of Technology (VIT)  
**Faculty In-Charge:** Prof. Asha N / Dr. Asha N  
**Date of Testing & Submission:** October 2026 / 05.08.2026  

---

## 1. Selected Module

The **Case Management Module** was selected as the focal module for comprehensive manual and automated testing. It forms the core operational backbone of the Court Proceedings Management System (CPMS), responsible for:
- Electronic Case Filing (E-Filing by Lawyers)
- Registry Scrutiny and Verification (by Court Staff)
- Defect Notification, Case Rejection, and Resubmission after rectification
- Official Case Registration and Unique Case ID Generation
- Presiding Judge Assignment (by Admin)
- Multi-state Tracking strictly adhering to the 12-state State Transition Diagram
- Case Details inspection, Audit Trail logging, and Notification dispatching.

---

## 2. Test Scenarios Identified

| Scenario ID | Test Scenario Description | Objective |
|-------------|---------------------------|-----------|
| **TS_CM_01** | Case Filing Input Validation | Verify that the system enforces field constraints (valid client selection, title length >= 5 chars, description >= 20 chars). |
| **TS_CM_02** | Successful Case Filing & Initial State Transition | Verify that a valid case submission persists into the database and transitions to `Under Verification`. |
| **TS_CM_03** | Registry Scrutiny Verification & Defect Return | Verify that Court Staff can reject an incomplete case with remarks, transitioning state to `Case Rejected`. |
| **TS_CM_04** | Case Correction and Resubmission | Verify that Lawyers can rectify defects and resubmit a rejected case back to `Under Verification`. |
| **TS_CM_05** | Case Admission and Registration | Verify that Court Staff can approve a compliant case, transitioning state to `Case Registered`. |
| **TS_CM_06** | Presiding Judge Assignment | Verify that Admin can assign a qualified Judge from the roster, transitioning state to `Judge Assigned`. |
| **TS_CM_07** | State Transition Access Control Guard | Verify that unauthorized roles cannot trigger illegal state mutations (e.g. Lawyers cannot assign judges). |
| **TS_CM_08** | Digital Evidence Upload & Attachment | Verify genuine multipart document upload, server-side storage, SHA-256 calculation, and byte-level retrieval. |
| **TS_CM_09** | Hearing Progression & Operative Order Issuance | Verify scheduling, rescheduling, proceedings conduct, and final judgment recording. |
| **TS_CM_10** | End-to-End Browser UI Interaction & VTOP Gateway | Verify that the user interface correctly responds to 5-role VTOP cards, role switching, and displays dynamic states. |

---

## 3. Test Cases Specification (Inputs and Expected Outputs)

| Test Case ID | Test Scenario | Input Data | Execution Type | Expected Output |
|--------------|---------------|------------|----------------|-----------------|
| **TC_CM_01** | TS_CM_01 | Title: `"Abc"` (< 5 chars), Description: `"Valid text"` | Automated & Manual | HTTP 422: `"Validation Error: Case title must be at least 5 characters."` |
| **TC_CM_02** | TS_CM_01 | Title: `"Valid Case Title"`, Description: `"Short"` (< 20 chars) | Automated & Manual | HTTP 422: `"Validation Error: Case description must provide sufficient factual details (at least 20 characters)."` |
| **TC_CM_03** | TS_CM_02 | Client ID: `1`, Title: `"Automated Test Matter v. State Agency"`, Description: `"Complete pleadings filed..."` | Automated & Manual | HTTP 200: Case created with persistent ID, Status: `'Under Verification'`, Audit log created. |
| **TC_CM_04** | TS_CM_03 | Action: `"Invalid/Incomplete"`, Remarks: `"Deficient valuation under Court Fees Act."` | Automated & Manual | HTTP 200: Status updated to `'Case Rejected'`, Remarks saved, Notification sent to Lawyer. |
| **TC_CM_05** | TS_CM_04 | Case ID: Target, Description: `"Corrected valuation deficit and deposited stamp duty."` | Automated & Manual | HTTP 200: Status transitions back to `'Under Verification'`, rejection remarks cleared. |
| **TC_CM_06** | TS_CM_05 | Action: `"Valid Case"`, Remarks: `"Pleadings verified compliant under Order VII."` | Automated & Manual | HTTP 200: Status transitions to `'Case Registered'`, Notification sent to Admin. |
| **TC_CM_07** | TS_CM_06 | Case ID: Target, Judge ID: `1` (Hon. Rajesh Kumar) | Automated & Manual | HTTP 200: `cases.judge_id = 1`, Status transitions to `'Judge Assigned'`. |
| **TC_CM_08** | TS_CM_07 | Role: `"Lawyer"`, Action: Assign Judge | Automated | HTTP 400/403: Rejection with authorization error message. |
| **TC_CM_09** | TS_CM_08 | Multipart file: `test_evidence_doc.txt` (byte payload), Description: `"Contract Exhibit"` | Automated & Manual | HTTP 200: File saved to disk `uploads/`, record indexed in `evidence` table, exact bytes downloadable. |
| **TC_CM_10** | TS_CM_09 | Decision: `"Allowed"`, Remarks: `"Suit decreed in favour of petitioner."` | Automated & Manual | HTTP 200: Status transitions to `'Judgement Issued'`, physical order written to disk. |
| **TC_CM_11** | TS_CM_10 | Headless Chrome/Edge Browser: VTOP Gateway 5 cards, Role switching, Case filing form, AI Assistant | Automated (Selenium) | UI renders all controls, successfully files case, updates table, and displays AI summaries. |

---

## 4. Testing Procedure and Tools Used

### Testing Procedure:
1. **Unit & API Testing:** Verified FastAPI backend route handlers, Pydantic input schemas, and database CRUD operations in isolation.
2. **State Transition Verification:** Tested valid and invalid lifecycle transitions against `state_machine.py` to ensure adherence to the UML State Transition Diagram.
3. **Automated End-to-End Browser Testing:** Developed Selenium WebDriver test scripts simulating actual user interaction sequences on Chrome and Microsoft Edge.
4. **Manual Exploratory Testing:** Executed multi-role user journeys through the web portal across Lawyer, Court Staff, Admin, Judge, and Client accounts.

### Tools Used:
- **Pytest 9.1.1:** Core Python test execution framework and assertion runner.
- **HTTPX 0.28.1:** Asynchronous and synchronous HTTP client for REST API verification.
- **Selenium WebDriver 4.51.0:** Headless browser automation engine for UI interaction testing.
- **Google Chrome / Microsoft Edge Headless:** Browser rendering engine with full DOM execution.
- **SQLite 3:** Transactional SQL database engine with foreign key constraint verification.

---

## 5. Test Execution Results: Expected vs Actual

| Test Case ID | Expected Result | Actual Result | Status |
|--------------|-----------------|---------------|--------|
| **TC_CM_01** | Return HTTP 422 with title length error message | HTTP 422 with exact message: `Case title must be at least 5 characters` | **PASS** |
| **TC_CM_02** | Return HTTP 422 with description length error message | HTTP 422 with exact message: `Case description must provide sufficient factual details` | **PASS** |
| **TC_CM_03** | Case saved to database, status set to `Under Verification` | Case ID returned (e.g. `CASE-2026-0007`), status set to `Under Verification` in database | **PASS** |
| **TC_CM_04** | Status transitions to `Case Rejected`, remarks recorded | Status updated to `Case Rejected`, remarks persisted in `cases` table | **PASS** |
| **TC_CM_05** | Status transitions from `Case Rejected` back to `Under Verification` | Re-verification accepted, state transitioned to `Under Verification` | **PASS** |
| **TC_CM_06** | Status transitions to `Case Registered`, notification sent | Status updated to `Case Registered`, notification recorded for Admin | **PASS** |
| **TC_CM_07** | Judge ID assigned, status transitions to `Judge Assigned` | `judge_id = 1` persisted, status updated to `Judge Assigned` | **PASS** |
| **TC_CM_08** | Unauthorized transition blocked with HTTP 403/400 | Rejection returned with permission denied error | **PASS** |
| **TC_CM_09** | Evidence file saved to disk, SHA-256 hash calculated | File stored in `backend/uploads/`, hash recorded in `evidence` table | **PASS** |
| **TC_CM_10** | Final judgment issued, status updated to `Judgement Issued` | Judgment text written to physical file, status updated | **PASS** |
| **TC_CM_11** | VTOP Gateway renders 5 cards, one-click login opens dashboard, filing succeeds | VTOP cards rendered, Lawyer authenticated, case registered in table, AI summary generated | **PASS** |

---

## 6. Defects Identified, Root Causes & Fixes Applied

### Defect 1: Port Refusal on API Pytest Runner
- **Defect ID:** `DEF-01`
- **Severity:** High
- **Description:** Pytest suite failed with `httpx.ConnectError: [WinError 10061]` when running against `http://127.0.0.1:8080/api`.
- **Root Cause:** The backend server process was not running before pytest execution.
- **Fix Applied:** Automated server startup as a daemon process before test execution.
- **Retest Result:** **PASSED** (All 6 API tests passed in 1.50s).

### Defect 2: Form Select Constraint in E2E Browser Testing
- **Defect ID:** `DEF-02`
- **Severity:** Medium
- **Description:** Selenium browser test `test_tc_ui_04_case_filing_form` failed with `AssertionError` because the filed case did not appear in the registry table.
- **Root Cause:** `<select id="file-case-client-select">` had the HTML5 `required` attribute. In the automated script, only title and description were entered without selecting a client option from the dropdown, triggering HTML5 validation blocking form submission.
- **Fix Applied:** Updated the Selenium test script to select a valid client (`selectedIndex = 1`) and trigger the `change` event before form submission.
- **Retest Result:** **PASSED** (Form submitted, case persisted and verified in table in 2.0s).

### Defect 3: Element ID Mismatch in Reports Test
- **Defect ID:** `DEF-03`
- **Severity:** Minor
- **Description:** Selenium test `test_tc_ui_06_reports_and_analytics` threw `NoSuchElementException: [id="rep-total-cases"]`.
- **Root Cause:** The test script searched for `rep-total-cases` while the HTML element ID in `reports-view` was `report-total-cases`.
- **Fix Applied:** Updated the test selector in `test_selenium_e2e.py` to `report-total-cases`.
- **Retest Result:** **PASSED** (Reports total verified successfully).

---

## 7. Automated Test Execution Evidence

### Pytest Backend Suite Execution Log:
```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.1.1, pluggy-1.7.0 -- C:\Python314\python.exe
rootdir: C:\Users\HP\.gemini\antigravity\scratch\cpms-portal
plugins: anyio-4.15.1
collected 6 items

tests/test_api_module.py::test_tc_api_01_auth_roles PASSED               [ 16%]
tests/test_api_module.py::test_tc_api_02_case_filing_validation PASSED   [ 33%]
tests/test_api_module.py::test_tc_api_03_case_lifecycle_workflow PASSED  [ 50%]
tests/test_api_module.py::test_tc_api_04_evidence_upload PASSED          [ 66%]
tests/test_api_module.py::test_tc_api_05_ai_summarizer PASSED            [ 83%]
tests/test_api_module.py::test_tc_api_06_reports_summary PASSED          [100%]

============================== 6 passed in 1.50s ==============================
```

### Selenium Headless Browser E2E Suite Execution Log:
```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.1.1, pluggy-1.7.0 -- C:\Python314\python.exe
rootdir: C:\Users\HP\.gemini\antigravity\scratch\cpms-portal
plugins: anyio-4.15.1
collected 6 items

tests/test_selenium_e2e.py::test_tc_ui_01_vtop_gateway_and_branding PASSED [ 16%]
tests/test_selenium_e2e.py::test_tc_ui_02_login_and_dashboard_transition PASSED [ 33%]
tests/test_selenium_e2e.py::test_tc_ui_03_role_switching PASSED          [ 50%]
tests/test_selenium_e2e.py::test_tc_ui_04_case_filing_form PASSED        [ 66%]
tests/test_selenium_e2e.py::test_tc_ui_05_ai_summarizer PASSED           [ 83%]
tests/test_selenium_e2e.py::test_tc_ui_06_reports_and_analytics PASSED   [100%]

============================= 6 passed in 23.58s ==============================
```

### Generated Visual Proofs (Saved on Disk):
1. `tests/screenshots/01_vtop_login_gateway.png` (VIT VTOP-style 5 Role Login Cards & Spotlight)
2. `tests/screenshots/02_case_management_dashboard.png` (Case Registry Dashboard & Header Profile)
3. `tests/screenshots/03_role_switching.png` (Dynamic Multi-Role Persona Switch)
4. `tests/screenshots/04_case_filing_form.png` (E-Filing Input Form with Client Selection)
5. `tests/screenshots/05_ai_summary_assistant.png` (Assessment 8.3 AI Summary & Extracted Entities)
6. `tests/screenshots/06_reports_and_analytics.png` (System Metrics & Judicial Workload Breakdown)

---

## 8. Conclusion

All 12 automated test cases across backend REST APIs and frontend Selenium browser interaction executed successfully with a **100% pass rate** (6/6 API tests, 6/6 Browser E2E tests). The Case Management module demonstrates complete consistency with the authoritative UML State Transition Diagram, strict input validation, real database persistence, and transparent multi-role access control.
