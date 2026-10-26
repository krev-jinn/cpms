/**
 * CPMS Hearing Scheduling Module (Module 3)
 * Implements: Hearing Calendar, Courtroom Allocation, Scheduling, Rescheduling,
 * and Recording Proceedings with State Machine Branching.
 */

class HearingScheduler {
  constructor() {
    this.hearings = [];
  }

  async init() {
    await this.loadHearings();
    this.setupEventListeners();
  }

  async loadHearings() {
    const user = auth.currentUser;
    const judgeId = (user && user.role === "Judge" && user.judge_id) ? user.judge_id : null;

    try {
      const res = await api.listHearings(null, judgeId);
      this.hearings = res.hearings || [];
      this.renderHearingsTable();
    } catch (err) {
      showToast(`Error loading hearings: ${err.message}`, "error");
    }
  }

  renderHearingsTable() {
    const tbody = document.getElementById("hearings-table-body");
    if (!tbody) return;

    if (this.hearings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">No hearings scheduled for current roster.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.hearings.map(h => {
      let actionBtns = `<button class="btn btn-outline btn-sm" onclick="caseManager.viewCaseDetails(${h.case_id})">View Case</button>`;
      
      const role = auth.currentUser ? auth.currentUser.role : "";
      if (role === "Judge" || role === "Admin") {
        if (h.status === "SCHEDULED" || h.status === "RESCHEDULED") {
          actionBtns = `
            <button class="btn btn-primary btn-sm" onclick="hearingScheduler.openConductModal(${h.hearing_id}, ${h.case_id})">Conduct</button>
            <button class="btn btn-outline btn-sm" onclick="hearingScheduler.openRescheduleModal(${h.hearing_id})">Reschedule</button>
            <button class="btn btn-outline btn-sm" onclick="caseManager.viewCaseDetails(${h.case_id})">Case</button>
          `;
        }
      }

      return `
        <tr>
          <td><strong>H-${String(h.hearing_id).padStart(4, '0')}</strong></td>
          <td><strong>CPMS-${String(h.case_id).padStart(4, '0')}</strong>: ${escapeHtml(h.case_title)}</td>
          <td><span style="font-weight:600; color:var(--primary-navy);">${h.hearing_date}</span> at ${h.hearing_time}</td>
          <td>${escapeHtml(h.venue)}</td>
          <td>${escapeHtml(h.judge_name)}</td>
          <td><span class="status-pill status-${h.status.toLowerCase()}">${h.status}</span></td>
          <td>${actionBtns}</td>
        </tr>
      `;
    }).join("");
  }

  openScheduleModal(caseId) {
    document.getElementById("schedule-case-id").value = caseId;
    closeModal("case-detail-modal");
    openModal("schedule-hearing-modal");
  }

  async handleScheduleSubmit(e) {
    e.preventDefault();
    const caseId = parseInt(document.getElementById("schedule-case-id").value);
    const date = document.getElementById("schedule-date").value;
    const time = document.getElementById("schedule-time").value;
    const venue = document.getElementById("schedule-venue").value;
    const remarks = document.getElementById("schedule-remarks").value;

    if (!date || !time || !venue) {
      showToast("Please provide Hearing Date, Time, and Courtroom Venue.", "warning");
      return;
    }

    try {
      const res = await api.scheduleHearing(caseId, {
        hearing_date: date,
        hearing_time: time,
        venue: venue,
        remarks: remarks
      });

      showToast(res.message, "success");
      document.getElementById("schedule-hearing-form").reset();
      closeModal("schedule-hearing-modal");
      await this.loadHearings();
      if (window.caseManager) await window.caseManager.loadCases();
    } catch (err) {
      showToast(`Scheduling failed: ${err.message}`, "error");
    }
  }

  openRescheduleModal(hearingId) {
    document.getElementById("reschedule-hearing-id").value = hearingId;
    openModal("reschedule-hearing-modal");
  }

  async handleRescheduleSubmit(e) {
    e.preventDefault();
    const hearingId = parseInt(document.getElementById("reschedule-hearing-id").value);
    const date = document.getElementById("reschedule-date").value;
    const time = document.getElementById("reschedule-time").value;
    const venue = document.getElementById("reschedule-venue").value;
    const remarks = document.getElementById("reschedule-remarks").value;

    if (!date || !time || !venue || !remarks) {
      showToast("All fields including cause for adjournment are mandatory.", "warning");
      return;
    }

    try {
      const res = await api.rescheduleHearing(hearingId, {
        new_hearing_date: date,
        new_hearing_time: time,
        venue: venue,
        remarks: remarks
      });

      showToast(res.message, "success");
      document.getElementById("reschedule-hearing-form").reset();
      closeModal("reschedule-hearing-modal");
      await this.loadHearings();
      if (window.caseManager) await window.caseManager.loadCases();
    } catch (err) {
      showToast(`Reschedule failed: ${err.message}`, "error");
    }
  }

  openConductModal(hearingId, caseId) {
    document.getElementById("conduct-hearing-id").value = hearingId;
    document.getElementById("conduct-case-id").value = caseId;
    openModal("conduct-hearing-modal");
  }

  async handleConductSubmit(e) {
    e.preventDefault();
    const hearingId = parseInt(document.getElementById("conduct-hearing-id").value);
    const notes = document.getElementById("conduct-notes").value;
    const nextStep = document.getElementById("conduct-next-step").value;

    if (!notes || notes.trim().length < 15) {
      showToast("Please enter detailed proceedings minutes (min 15 characters).", "warning");
      return;
    }

    try {
      const res = await api.conductHearing(hearingId, {
        proceedings_notes: notes,
        next_step: nextStep
      });

      showToast(res.message, "success");
      document.getElementById("conduct-hearing-form").reset();
      closeModal("conduct-hearing-modal");
      await this.loadHearings();
      if (window.caseManager) await window.caseManager.loadCases();
    } catch (err) {
      showToast(`Conduct recording failed: ${err.message}`, "error");
    }
  }

  setupEventListeners() {
    const scheduleForm = document.getElementById("schedule-hearing-form");
    if (scheduleForm) scheduleForm.addEventListener("submit", (e) => this.handleScheduleSubmit(e));

    const rescheduleForm = document.getElementById("reschedule-hearing-form");
    if (rescheduleForm) rescheduleForm.addEventListener("submit", (e) => this.handleRescheduleSubmit(e));

    const conductForm = document.getElementById("conduct-hearing-form");
    if (conductForm) conductForm.addEventListener("submit", (e) => this.handleConductSubmit(e));
  }
}

const hearingScheduler = new HearingScheduler();
