import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "cpms_database.db")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Base User Table (ER Diagram: Role, User_ID, Created_at, Name, Email, Phone, Password)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role VARCHAR(20) NOT NULL CHECK(role IN ('Admin', 'Judge', 'Lawyer', 'Client', 'Court Staff')),
        name VARCHAR(50) NOT NULL,
        email VARCHAR(50) NOT NULL UNIQUE,
        phone VARCHAR(15) NOT NULL,
        password VARCHAR(100) NOT NULL,
        created_at DATETIME NOT NULL
    );
    """)

    # 2. Admin (ER: Admin_ID, User_ID, Department)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        department VARCHAR(50) NOT NULL
    );
    """)

    # 3. Judge (ER: Judge_ID, User_ID, Specialisation, Experience_Years)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS judges (
        judge_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        specialisation VARCHAR(50) NOT NULL,
        experience_years INTEGER NOT NULL
    );
    """)

    # 4. Lawyer (ER: Lawyer_ID, User_ID, FirmName, BarCouncilNo)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lawyers (
        lawyer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        firm_name VARCHAR(50) NOT NULL,
        bar_council_no VARCHAR(20) NOT NULL UNIQUE
    );
    """)

    # 5. Client (ER: Client_ID, User_ID, Address, ContactNo)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clients (
        client_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        address VARCHAR(150) NOT NULL,
        contact_no VARCHAR(15) NOT NULL
    );
    """)

    # 6. CourtStaff (ER: Staff_ID, User_ID, Designation, Department)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS court_staff (
        staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        designation VARCHAR(25) NOT NULL,
        department VARCHAR(25) NOT NULL
    );
    """)

    # 7. Case (ER: Case_ID, Client_ID, Lawyer_ID, Judge_ID, Title, Description, FilingDate, Status)
    # Strictly aligned with State Transition Diagram states
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        case_id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(client_id),
        lawyer_id INTEGER NOT NULL REFERENCES lawyers(lawyer_id),
        judge_id INTEGER REFERENCES judges(judge_id),
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        filing_date DATE NOT NULL,
        status VARCHAR(30) NOT NULL,
        rejection_remarks TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    );
    """)

    # 8. Evidence (ER: Evidence_ID, Case_ID, FileName, FilePath, Uploaded_By, Uploaded_Date, Description)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evidence (
        evidence_id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
        file_name VARCHAR(200) NOT NULL,
        file_path VARCHAR(200) NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(user_id),
        uploaded_date DATETIME NOT NULL,
        description TEXT,
        file_size INTEGER DEFAULT 0
    );
    """)

    # 9. Hearing (ER: Hearing_ID, Case_ID, Conducted_By, HearingDate, HearingTime, Venue, Status, Remarks)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hearings (
        hearing_id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
        conducted_by INTEGER NOT NULL REFERENCES judges(judge_id),
        hearing_date DATE NOT NULL,
        hearing_time TIME NOT NULL,
        venue VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        remarks TEXT
    );
    """)

    # 10. Judgement (ER: Judgement_ID, Case_ID, Decision, JudgementDate, Remarks, PDFPath, IssuedBy)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS judgements (
        judgement_id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL UNIQUE REFERENCES cases(case_id) ON DELETE CASCADE,
        decision TEXT NOT NULL,
        judgement_date DATE NOT NULL,
        remarks TEXT NOT NULL,
        pdf_path VARCHAR(200),
        issued_by INTEGER NOT NULL REFERENCES judges(judge_id)
    );
    """)

    # 11. Notification (ER: Notification_ID, Case_ID, Message, Date, IsRead, RecipientRole)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER REFERENCES cases(case_id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        date DATETIME NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT 0,
        recipient_role VARCHAR(25) NOT NULL,
        recipient_user_id INTEGER REFERENCES users(user_id)
    );
    """)

    # 12. Report (ER: Report_ID, Case_ID, ReportType, GeneratedDate, GeneratedBy, File)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER REFERENCES cases(case_id),
        report_type VARCHAR(50) NOT NULL,
        generated_date DATETIME NOT NULL,
        generated_by INTEGER NOT NULL REFERENCES users(user_id),
        file TEXT NOT NULL
    );
    """)

    # 13. Audit Trail / History (Page 3 Innovation: "Digital Audit Trail: Logs every upload, schedule change, and status update")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS case_history (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
        previous_status VARCHAR(30),
        new_status VARCHAR(30) NOT NULL,
        changed_by_user_id INTEGER REFERENCES users(user_id),
        changed_by_name VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        remarks TEXT,
        timestamp DATETIME NOT NULL
    );
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        return  # Already seeded

    now = datetime.now().isoformat()

    # Seed Users
    users_data = [
        # Admin
        ("Admin", "Priya Sharma", "admin@court.gov.in", "9876500001", "admin123", now),
        # Judges
        ("Judge", "Hon. Rajesh Kumar", "judge.kumar@court.gov.in", "9876500002", "judge123", now),
        ("Judge", "Hon. Deepa Nair", "judge.nair@court.gov.in", "9876500003", "judge123", now),
        # Lawyers
        ("Lawyer", "Adv. Arjun Mehta", "lawyer.mehta@bar.org", "9876500004", "lawyer123", now),
        ("Lawyer", "Adv. Sneha Rao", "lawyer.rao@bar.org", "9876500005", "lawyer123", now),
        # Clients
        ("Client", "Ramesh Gupta", "client.ramesh@gmail.com", "9876500006", "client123", now),
        ("Client", "Anita Patel", "client.anita@gmail.com", "9876500007", "client123", now),
        # Court Staff
        ("Court Staff", "Suresh Babu", "staff.babu@court.gov.in", "9876500008", "staff123", now)
    ]

    cursor.executemany("""
    INSERT INTO users (role, name, email, phone, password, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, users_data)

    # Sub-role records
    cursor.execute("INSERT INTO admins (user_id, department) VALUES (1, 'Central Registry & IT Administration')")
    cursor.execute("INSERT INTO judges (user_id, specialisation, experience_years) VALUES (2, 'Civil, Commercial & Contracts', 18)")
    cursor.execute("INSERT INTO judges (user_id, specialisation, experience_years) VALUES (3, 'Property, Land & Constitutional Law', 14)")
    cursor.execute("INSERT INTO lawyers (user_id, firm_name, bar_council_no) VALUES (4, 'Mehta & Associates Law Offices', 'BAR-DEL-2012-1042')")
    cursor.execute("INSERT INTO lawyers (user_id, firm_name, bar_council_no) VALUES (5, 'Rao Chambers of Dispute Resolution', 'BAR-KAR-2016-0459')")
    cursor.execute("INSERT INTO clients (user_id, address, contact_no) VALUES (6, 'Flat 402, Green Glen Layout, Bellandur, Bengaluru', '9876500006')")
    cursor.execute("INSERT INTO clients (user_id, address, contact_no) VALUES (7, 'No. 18, Anna Salai, T. Nagar, Chennai', '9876500007')")
    cursor.execute("INSERT INTO court_staff (user_id, designation, department) VALUES (8, 'Chief Judicial Registrar', 'Court Registry & Scrutiny')")

    # Seed Cases in various documented states to demonstrate full lifecycle
    # Case 1: Active workflow at 'Hearing Scheduled'
    cursor.execute("""
    INSERT INTO cases (client_id, lawyer_id, judge_id, title, description, filing_date, status, created_at, updated_at)
    VALUES (1, 1, 1, 'Gupta v. TechCorp Solutions Ltd - Breach of Commercial Agreement',
    'Suit for specific performance and damages arising out of software delivery failure and unauthorized termination of enterprise maintenance contract dated 15 Jan 2024.',
    '2026-09-10', 'Hearing Scheduled', ?, ?)
    """, (now, now))
    case1_id = cursor.lastrowid

    # Case 2: In 'Under Verification' awaiting Court Staff review
    cursor.execute("""
    INSERT INTO cases (client_id, lawyer_id, judge_id, title, description, filing_date, status, created_at, updated_at)
    VALUES (2, 2, NULL, 'Patel v. Metro Infrastructure Corp - Land Compensation Dispute',
    'Claim for revised statutory compensation under Land Acquisition Act regarding survey number 48/2 acquired for arterial corridor expansion.',
    '2026-10-20', 'Under Verification', ?, ?)
    """, (now, now))
    case2_id = cursor.lastrowid

    # Case 3: In 'Case Registered' awaiting Judge assignment by Admin
    cursor.execute("""
    INSERT INTO cases (client_id, lawyer_id, judge_id, title, description, filing_date, status, created_at, updated_at)
    VALUES (1, 2, NULL, 'Apex Traders v. Zenith Logistics - Cargo Loss and Indemnity',
    'Action for recovery of commercial shipment value of goods destroyed during transit due to carrier gross negligence.',
    '2026-10-15', 'Case Registered', ?, ?)
    """, (now, now))
    case3_id = cursor.lastrowid

    # Case 4: In 'Judgement Issued'
    cursor.execute("""
    INSERT INTO cases (client_id, lawyer_id, judge_id, title, description, filing_date, status, created_at, updated_at)
    VALUES (2, 1, 2, 'Kaveri Housing Society v. Urban Builders - Completion Certificate Dispute',
    'Petition for direction to deliver occupancy certificates and repair structural drainage defects in residential towers.',
    '2026-07-01', 'Judgement Issued', ?, ?)
    """, (now, now))
    case4_id = cursor.lastrowid

    # Case 1 History
    history_records = [
        (case1_id, None, 'Case Filed', 4, 'Adv. Arjun Mehta', 'Filing', 'Case filed electronically with preliminary pleadings.', '2026-09-10T10:00:00'),
        (case1_id, 'Case Filed', 'Under Verification', 8, 'Suresh Babu', 'Scrutiny', 'Case moved to registry verification queue.', '2026-09-11T09:30:00'),
        (case1_id, 'Under Verification', 'Case Registered', 8, 'Suresh Babu', 'Verification', 'Documents verified and found compliant with court rules.', '2026-09-12T14:15:00'),
        (case1_id, 'Case Registered', 'Judge Assigned', 1, 'Priya Sharma', 'Assignment', 'Assigned to Hon. Rajesh Kumar based on subject matter roster.', '2026-09-13T11:00:00'),
        (case1_id, 'Judge Assigned', 'Hearing Scheduled', 2, 'Hon. Rajesh Kumar', 'Scheduling', 'Initial summons hearing scheduled.', '2026-09-15T16:00:00')
    ]
    cursor.executemany("""
    INSERT INTO case_history (case_id, previous_status, new_status, changed_by_user_id, changed_by_name, action, remarks, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, history_records)

    # Seed Evidence for Case 1
    sample_evidence = [
        (case1_id, 'Master_Services_Agreement_2024.pdf', 'uploads/sample_contract.pdf', 4, '2026-09-10T10:05:00', 'Executed copy of MSA between Gupta and TechCorp with Schedule C SLA terms', 245760),
        (case1_id, 'Payment_Remittance_Receipts.pdf', 'uploads/sample_receipts.pdf', 4, '2026-09-10T10:06:00', 'Bank statements showing RTGS advance transfers of INR 25,00,000', 128400)
    ]
    cursor.executemany("""
    INSERT INTO evidence (case_id, file_name, file_path, uploaded_by, uploaded_date, description, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, sample_evidence)

    # Seed Hearing for Case 1
    cursor.execute("""
    INSERT INTO hearings (case_id, conducted_by, hearing_date, hearing_time, venue, status, remarks)
    VALUES (?, 1, '2026-11-05', '11:30', 'Courtroom 3, High Court Complex', 'SCHEDULED', 'First appearance for framing of issues and admission/denial of documents.')
    """, (case1_id,))

    # Seed Judgement for Case 4
    cursor.execute("""
    INSERT INTO judgements (case_id, decision, judgement_date, remarks, pdf_path, issued_by)
    VALUES (?, 'Allowed', '2026-10-18', 'Petition allowed in part. Respondent builder directed to rectify water seepage and secure occupancy certificates within 60 days.', 'uploads/judgment_case_4.pdf', 2)
    """, (case4_id,))

    # Seed Notifications
    notifications = [
        (case1_id, 'Case Filed: Gupta v. TechCorp Solutions Ltd filed successfully.', '2026-09-10T10:00:00', 1, 'Lawyer', 4),
        (case1_id, 'Case Verified & Registered: Scrutiny cleared by Court Staff.', '2026-09-12T14:15:00', 1, 'Lawyer', 4),
        (case1_id, 'Judge Assigned: Hon. Rajesh Kumar assigned to your case.', '2026-09-13T11:00:00', 1, 'Client', 6),
        (case1_id, 'Hearing Scheduled: Hearing set for 05 Nov 2026 at Courtroom 3.', '2026-09-15T16:00:00', 0, 'ALL', None),
        (case2_id, 'New Case Filed: Patel v. Metro Infrastructure Corp requires verification.', '2026-10-20T09:00:00', 0, 'Court Staff', 8),
        (case3_id, 'Judge Assignment Pending: Apex Traders v. Zenith Logistics ready for assignment.', '2026-10-15T15:00:00', 0, 'Admin', 1)
    ]
    cursor.executemany("""
    INSERT INTO notifications (case_id, message, date, is_read, recipient_role, recipient_user_id)
    VALUES (?, ?, ?, ?, ?, ?)
    """, notifications)

    # Seed Reports
    cursor.execute("""
    INSERT INTO reports (case_id, report_type, generated_date, generated_by, file)
    VALUES (?, 'Case Status Report', '2026-10-22T10:00:00', 1, 'case_status_report_c1.json')
    """, (case1_id,))

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("CPMS Database initialized and pre-seeded successfully!")
