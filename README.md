# Court Proceedings Management System (CPMS)

An enterprise-grade, full-stack digital court management and proceedings platform designed to eliminate manual backlogs, streamline legal workflows, automate hearing scheduling, securely store digital evidence, and deliver certified judicial orders.

---

## Key Modules & Features

The platform implements all five core judicial modules in full alignment with the CPMS architectural specifications:

1. **Authentication & Role-Based Access Control:**
   - Dynamic 5-Role Portal: **Administrator**, **Judge**, **Lawyer**, **Court Staff**, and **Client**.
   - Enforced role isolation: switching roles requires returning to the public homepage (`⮌ Homepage`).
2. **Case Management & Proceedings:**
   - 12-state verified lifecycle workflow: Lawyer filing → Registry verification → Admin judge assignment → Judge hearings & judgment.
   - Comprehensive audit trail, state transition validation, and docket tracking.
3. **Hearing Scheduling & Management:**
   - Courtroom allocation, conflict prevention, hearing rescheduling, and bench notes.
4. **Evidence Management Vault:**
   - Secure digital evidence upload, SHA-256 integrity verification, and Firestore/Firebase storage integration.
5. **Notifications & Analytical Reports:**
   - Real-time role-based notification dispatch and analytical court metrics.
6. **AI Case Summary Assistant (Assessment 8.3):**
   - Dual-engine legal NLP (LexRank / TextRank graph centrality + legal entity extraction + Google Gemini API cloud fallback).
   - Generates procedural summaries, extracts statutes/parties/claim amounts directly into filings.
7. **Modern Design System & Dark Mode:**
   - CSS variables architecture supporting instant Dark/Light mode toggling with `localStorage` persistence.
   - Centered, fully responsive modal dialogs without clipping across viewports.

---

## Role Credentials

| Role | Name | Email | Password | Role Scope |
|------|------|-------|----------|------------|
| **Lawyer** | Adv. Arjun Mehta | `lawyer.mehta@bar.org` | `lawyer123` | E-filing, pleadings drafting, evidence uploading, client tracking |
| **Court Staff** | Suresh Babu | `staff.babu@court.gov.in` | `staff123` | Registry scrutiny, case verification/rejection, defect tracking |
| **Admin** | Priya Sharma | `admin@court.gov.in` | `admin123` | Judge bench allocation, user management, court audit reports |
| **Judge** | Hon. Rajesh Kumar | `judge.kumar@court.gov.in` | `judge123` | Presiding over bench, scheduling/conducting hearings, issuing judgments |
| **Client** | Ramesh Gupta | `client.ramesh@gmail.com` | `client123` | Litigant portal: real-time state stepper, hearing dates, order download |

---

## Quickstart & Launch Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the CPMS Server
```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8080 --reload
```
Open your browser at:
- **Web Portal:** `http://127.0.0.1:8080/`
- **Interactive Swagger API Docs:** `http://127.0.0.1:8080/docs`
- **Firebase Status Inspection:** `http://127.0.0.1:8080/api/firebase/status`
- **Firestore Schema Export:** `http://127.0.0.1:8080/api/firebase/export`

---

## Running the Automated Test Suites (Assessment 8.1)

### Backend REST API & State Machine Pytest Suite
```bash
python -m pytest tests/test_api_module.py -v
```
*(6/6 passing in ~1.3s)*

### End-to-End Browser UI Selenium Suite
```bash
python -m pytest tests/test_selenium_e2e.py -v
```
*(6/6 passing in ~29s with visual screenshots recorded in `tests/screenshots/`)*

---

## Project Structure

```
cpms-portal/
├── backend/
│   ├── ai_assistant.py        # LexRank / TextRank / Gemini AI summarization engine
│   ├── app.py                 # FastAPI application, REST endpoints, static mounting
│   ├── cpms_database.db       # SQLite database replica
│   ├── database.py            # SQLite schema initialization and seed data
│   ├── firebase_sync.py       # Firestore schema converter & sync status
│   └── state_machine.py       # 12-state judicial lifecycle rules and transitions
├── frontend/
│   ├── index.html             # Single-page web portal & dynamic 5-role homepage
│   ├── css/
│   │   ├── styles.css         # Light/Dark mode tokens, modal sizing, layout
│   │   └── components.css     # Buttons, cards, badges, inputs
│   └── js/
│       ├── ai_assistant_ui.js # AI modal integration & autofill
│       ├── api.js             # Fetch wrappers and error handling
│       ├── auth.js            # Authentication, 1-click role logins, theme switch
│       ├── case_management.js # Case filing, table rendering, verification
│       ├── evidence_portal.js # Evidence upload and hash verification
│       ├── hearing_scheduler.js# Hearing calendar and bench notes
│       └── notifications_reports.js # Notification dispatch and metrics
├── docs/
│   ├── ASSESSMENT_8_1_TEST_REPORT.md      # Full manual/automated testing report
│   ├── ASSESSMENT_8_2_UI_DESIGN.md        # UI design principles & components
│   ├── ASSESSMENT_8_3_AI_INTEGRATION.md   # AI feature architecture & results
│   └── TRACEABILITY_MATRIX.md             # UML architecture traceability matrix
├── tests/
│   ├── screenshots/           # Selenium visual execution captures
│   ├── test_api_module.py     # Pytest API validation suite
│   └── test_selenium_e2e.py   # Selenium E2E browser automation suite
├── requirements.txt           # Project dependencies
└── README.md
```
