"""
CPMS Automated Test Suite (Assessment 8.1)
Backend API & State Transition Automated Verification using Pytest & HTTPX
"""

import os
import pytest
import httpx

BASE_URL = "http://127.0.0.1:8080/api"

@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        yield c

def test_tc_api_01_auth_roles(client):
    """TC_API_01: Verify authentication and role extraction for all 5 roles."""
    roles = [
        ("admin@court.gov.in", "admin123", "Admin"),
        ("judge.kumar@court.gov.in", "judge123", "Judge"),
        ("lawyer.mehta@bar.org", "lawyer123", "Lawyer"),
        ("client.ramesh@gmail.com", "client123", "Client"),
        ("staff.babu@court.gov.in", "staff123", "Court Staff"),
    ]
    for email, pwd, expected_role in roles:
        resp = client.post("/auth/login", json={"email": email, "password": pwd})
        assert resp.status_code == 200, f"Login failed for {email}"
        data = resp.json()
        assert data["status"] == "success"
        assert data["user"]["role"] == expected_role

    # Negative test: invalid password
    bad_resp = client.post("/auth/login", json={"email": "admin@court.gov.in", "password": "wrong"})
    assert bad_resp.status_code == 401

def test_tc_api_02_case_filing_validation(client):
    """TC_API_02: Verify input validation on Case Filing."""
    headers = {"X-User-Role": "Lawyer", "X-User-ID": "4", "X-User-Name": "Adv. Arjun Mehta"}
    
    # Negative test: title too short
    bad_title = client.post("/cases/file", headers=headers, json={
        "client_id": 1,
        "title": "Abc",
        "description": "Valid description with sufficient details about commercial dispute."
    })
    assert bad_title.status_code == 422
    assert "Case title must be at least 5 characters" in bad_title.json()["detail"]

    # Negative test: description too short
    bad_desc = client.post("/cases/file", headers=headers, json={
        "client_id": 1,
        "title": "Proper Case Title for Filing",
        "description": "Short"
    })
    assert bad_desc.status_code == 422
    assert "at least 20 characters" in bad_desc.json()["detail"]

def test_tc_api_03_case_lifecycle_workflow(client):
    """TC_API_03: End-to-end state transition workflow testing."""
    lawyer_headers = {"X-User-Role": "Lawyer", "X-User-ID": "4", "X-User-Name": "Adv. Arjun Mehta"}
    staff_headers = {"X-User-Role": "Court Staff", "X-User-ID": "8", "X-User-Name": "Suresh Babu"}
    admin_headers = {"X-User-Role": "Admin", "X-User-ID": "1", "X-User-Name": "Priya Sharma"}
    judge_headers = {"X-User-Role": "Judge", "X-User-ID": "2", "X-User-Name": "Hon. Rajesh Kumar"}

    # 1. File Case (Lawyer) -> automatically transitions to 'Under Verification'
    file_resp = client.post("/cases/file", headers=lawyer_headers, json={
        "client_id": 1,
        "title": "Automated Test Matter v. State Agency - Injunction & Damages",
        "description": "Pleadings filed to test the complete judicial workflow from registration to order issuance.",
        "filing_date": "2026-10-26"
    })
    assert file_resp.status_code == 200
    case_data = file_resp.json()
    case_id = case_data["case_id"]
    assert case_data["current_status"] == "Under Verification"

    # 2. State Guard Negative Test: Lawyer cannot assign judge
    illegal_resp = client.post(f"/cases/{case_id}/assign-judge", headers=lawyer_headers, json={"judge_id": 1})
    assert illegal_resp.status_code == 400 or illegal_resp.status_code == 403

    # 3. Court Staff Scrutiny Rejection & Resubmission cycle (Page 10 State Diagram branch)
    reject_resp = client.post(f"/cases/{case_id}/verify", headers=staff_headers, json={
        "action": "Invalid/Incomplete",
        "remarks": "Valuation of suit deficient under Court Fees Act."
    })
    assert reject_resp.status_code == 200
    assert reject_resp.json()["new_status"] == "Case Rejected"

    # Lawyer Resubmits Case
    resubmit_resp = client.post(f"/cases/{case_id}/resubmit", headers=lawyer_headers, data={
        "description_update": "Corrected valuation deficit and deposited stamp duty receipts under Order VII."
    })
    assert resubmit_resp.status_code == 200
    assert resubmit_resp.json()["new_status"] == "Under Verification"

    # 4. Court Staff verifies & admits -> 'Case Registered'
    admit_resp = client.post(f"/cases/{case_id}/verify", headers=staff_headers, json={
        "action": "Valid Case",
        "remarks": "Pleadings and jurisdiction verified compliant."
    })
    assert admit_resp.status_code == 200
    assert admit_resp.json()["new_status"] == "Case Registered"

    # 5. Admin assigns Judge -> 'Judge Assigned'
    assign_resp = client.post(f"/cases/{case_id}/assign-judge", headers=admin_headers, json={"judge_id": 1})
    assert assign_resp.status_code == 200
    assert assign_resp.json()["new_status"] == "Judge Assigned"

    # 6. Judge schedules Hearing -> 'Hearing Scheduled'
    sched_resp = client.post(f"/cases/{case_id}/hearings/schedule", headers=judge_headers, json={
        "hearing_date": "2026-11-15",
        "hearing_time": "11:00",
        "venue": "Courtroom 3 - Commercial Bench",
        "remarks": "Preliminary appearance for framing of issues."
    })
    assert sched_resp.status_code == 200
    hearing_id = sched_resp.json()["hearing_id"]
    assert sched_resp.json()["new_case_status"] == "Hearing Scheduled"

    # 7. Judge reschedules Hearing -> 'Hearing Rescheduled'
    resched_resp = client.post(f"/hearings/{hearing_id}/reschedule", headers=judge_headers, json={
        "new_hearing_date": "2026-11-20",
        "new_hearing_time": "14:30",
        "venue": "Courtroom 3 - Commercial Bench",
        "remarks": "Adjourned upon joint request for inspection."
    })
    assert resched_resp.status_code == 200
    assert resched_resp.json()["new_status"] == "Hearing Rescheduled"

    # 8. Judge conducts Hearing -> branch to 'Case Under Review'
    conduct_resp = client.post(f"/hearings/{hearing_id}/conduct", headers=judge_headers, json={
        "proceedings_notes": "Arguments concluded by both sides. Written submissions filed.",
        "next_step": "Proceed to Review"
    })
    assert conduct_resp.status_code == 200
    assert conduct_resp.json()["new_status"] == "Case Under Review"

    # 9. Judge issues Final Judgment -> 'Judgement Issued'
    judge_order_resp = client.post(f"/cases/{case_id}/judgement", headers=judge_headers, json={
        "decision": "Allowed",
        "remarks": "Suit decreed in favour of petitioner. Mandatory injunction granted."
    })
    assert judge_order_resp.status_code == 200
    assert judge_order_resp.json()["new_status"] == "Judgement Issued"

    # 10. Admin formally closes and archives -> 'Case Closed'
    close_resp = client.post(f"/cases/{case_id}/close", headers=admin_headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["new_status"] == "Case Closed"

def test_tc_api_04_evidence_upload(client):
    """TC_API_04: Verify genuine file upload and download."""
    lawyer_headers = {"X-User-Role": "Lawyer", "X-User-ID": "4", "X-User-Name": "Adv. Arjun Mehta"}
    
    file_content = b"GENUINE COURT EVIDENCE: Commercial Agreement between Gupta and TechCorp dated Jan 2024."
    files = {"file": ("test_evidence_doc.txt", file_content, "text/plain")}
    data = {"description": "Executed contract exhibit", "document_type": "Master Contract"}

    upload_resp = client.post("/cases/1/evidence/upload", headers=lawyer_headers, files=files, data=data)
    assert upload_resp.status_code == 200
    ev_data = upload_resp.json()
    assert ev_data["status"] == "success"
    ev_id = ev_data["evidence_id"]

    # Verify download returns exact bytes
    dl_resp = client.get(f"/evidence/{ev_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.content == file_content

def test_tc_api_05_ai_summarizer(client):
    """TC_API_05: Verify Assessment 8.3 genuine AI NLP extraction and summarization."""
    legal_text = (
        "The plaintiff Ramesh Gupta filed a commercial suit against TechCorp Solutions Ltd under Section 73 of the Indian Contract Act, 1872. "
        "The plaintiff entered into an enterprise software development agreement on 15th January 2024 with a total contract value of Rs. 50,00,000. "
        "The plaintiff remitted an advance consideration of Rs. 25,00,000 via RTGS on 20th January 2024. "
        "The defendant failed to deliver the milestone software modules by the agreed deadline of 30th June 2024. "
        "The plaintiff seeks a decree for refund of Rs. 25 lakhs with 18% interest and compensation."
    )
    resp = client.post("/ai/summarize", json={
        "case_text": legal_text,
        "sentence_count": 2,
        "algorithm": "lexrank"
    })
    assert resp.status_code == 200
    result = resp.json()
    assert result["status"] == "success"
    assert "LexRank" in result["algorithm"]
    assert len(result["executive_summary"]) > 20
    assert result["extracted_entities"]["parties"]["plaintiff"] == "Ramesh Gupta"
    assert "Rs. 25,00,000" in result["extracted_entities"]["monetary_claims"] or "Rs. 50,00,000" in result["extracted_entities"]["monetary_claims"]
    assert "proof of actual pecuniary loss" in result["recommendation"].lower()

def test_tc_api_06_reports_summary(client):
    """TC_API_06: Verify real metrics calculation from database."""
    resp = client.get("/reports/summary")
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["total_cases"] >= 4
    assert "hearings" in summary
    assert "judges_workload" in summary
    assert len(summary["judges_workload"]) >= 2
