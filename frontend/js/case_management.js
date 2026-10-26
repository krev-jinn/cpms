/**
 * CPMS Case Management Module (Assessment 8.2 Core Module)
 * Implements: Case Filing, Scrutiny Verification, Case Registration, Status Tracking,
 * State Transition Visualizer, and Case Details View.
 */

class CaseManager {
  constructor() {
    this.cases = [];
    this.clients = [];
    this.judges = [];
    this.currentCaseDetail = null;
    this.activeFilter = "";
    this.searchQuery = "";
  }

  async init() {
    await this.loadClients();
    await this.loadJudges();
    await this.loadCases();
    this.setupEventListeners();
  }

  async loadClients() {
    try {
      const res = await api.getClients();
      this.clients = res.clients || [];
      this.populateClientDropdown();
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }

  async loadJudges() {
    try {
      const res = await api.getJudges();
      this.judges = res.judges || [];
      this.populateJudgeDropdown();
    } catch (err) {
      console.error("Failed to load judges:", err);
    }
  }

  populateClientDropdown() {
    const select = document.getElementById("file-case-client-select");
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Client --</option>';
    this.clients.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.client_id;
      opt.textContent = `${c.name} (${c.contact_no}) - ${c.address.substring(0, 30)}...`;
      select.appendChild(opt);
    });
  }

  populateJudgeDropdown() {
    const select = document.getElementById("assign-judge-select");
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Judge --</option>';
    this.judges.forEach(j => {
      const opt = document.createElement("option");
      opt.value = j.judge_id;
      opt.textContent = `${j.name} (${j.specialisation}, ${j.experience_years} yrs exp)`;
      select.appendChild(opt);
    });
  }

  async loadCases() {
    const user = auth.currentUser;
    const params = {};
    if (this.activeFilter) params.status = this.activeFilter;
    if (this.searchQuery) params.search = this.searchQuery;

    // Role-specific scoping if needed
    if (user && user.role === "Client" && user.client_id) {
      params.client_id = user.client_id;
    }

    try {
      const res = await api.listCases(params);
      this.cases = res.cases || [];
      this.renderCaseTable();
      this.renderMetrics();
    } catch (err) {
      showToast(`Error loading cases: ${err.message}`, "error");
    }
  }

  renderMetrics() {
    const totalEl = document.getElementById("metric-total-cases");
    const activeEl = document.getElementById("metric-active-cases");
    const scrutinyEl = document.getElementById("metric-scrutiny-cases");
    const disposedEl = document.getElementById("metric-disposed-cases");

    if (totalEl) totalEl.textContent = this.cases.length;
    if (activeEl) {
      const activeCount = this.cases.filter(c => !["Case Rejected", "Case Closed", "Judgement Issued"].includes(c.status)).length;
      activeEl.textContent = activeCount;
    }
    if (scrutinyEl) {
      const scrutinyCount = this.cases.filter(c => c.status === "Under Verification" || c.status === "Case Filed").length;
      scrutinyEl.textContent = scrutinyCount;
    }
    if (disposedEl) {
      const disposedCount = this.cases.filter(c => c.status === "Judgement Issued" || c.status === "Case Closed").length;
      disposedEl.textContent = disposedCount;
    }
  }

  renderCaseTable() {
    const tbody = document.getElementById("cases-table-body");
    if (!tbody) return;

    if (this.cases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">No cases found matching current criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.cases.map(c => {
      const statusClass = this.getStatusClass(c.status);
      const judgeDisplay = c.judge_name ? `<span style="font-weight:600;">${c.judge_name}</span>` : `<span style="color:#94a3b8; font-style:italic;">Unassigned</span>`;
      
      // Role specific action button
      let actionBtn = `<button class="btn btn-outline btn-sm" onclick="caseManager.viewCaseDetails(${c.case_id})">View Details</button>`;
      
      if (auth.currentUser && auth.currentUser.role === "Court Staff" && c.status === "Under Verification") {
        actionBtn = `
          <button class="btn btn-success btn-sm" onclick="caseManager.quickVerifyPrompt(${c.case_id}, 'Valid Case')">Admit</button>
          <button class="btn btn-danger btn-sm" onclick="caseManager.quickVerifyPrompt(${c.case_id}, 'Invalid/Incomplete')">Reject</button>
          <button class="btn btn-outline btn-sm" onclick="caseManager.viewCaseDetails(${c.case_id})">Details</button>
        `;
      } else if (auth.currentUser && auth.currentUser.role === "Admin" && c.status === "Case Registered") {
        actionBtn = `
          <button class="btn btn-accent btn-sm" onclick="caseManager.openAssignJudgeModal(${c.case_id})">Assign Judge</button>
          <button class="btn btn-outline btn-sm" onclick="caseManager.viewCaseDetails(${c.case_id})">Details</button>
        `;
      } else if (auth.currentUser && auth.currentUser.role === "Lawyer" && c.status === "Case Rejected") {
        actionBtn = `
          <button class="btn btn-accent btn-sm" onclick="caseManager.openResubmitModal(${c.case_id})">Resubmit</button>
          <button class="btn btn-outline btn-sm" onclick="caseManager.viewCaseDetails(${c.case_id})">Details</button>
        `;
      }

      return `
        <tr>
          <td><strong>CPMS-${String(c.case_id).padStart(4, '0')}</strong></td>
          <td>
            <div style="font-weight:600; color:var(--primary-navy);">${escapeHtml(c.title)}</div>
            <div style="font-size:11.5px; color:#64748b; margin-top:2px;">${escapeHtml(c.description.substring(0, 65))}...</div>
          </td>
          <td>${escapeHtml(c.client_name)}</td>
          <td>${escapeHtml(c.lawyer_name)}</td>
          <td>${judgeDisplay}</td>
          <td><span class="status-pill ${statusClass}">${c.status}</span></td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join("");
  }

  getStatusClass(status) {
    const map = {
      "Case Filed": "status-filed",
      "Under Verification": "status-verification",
      "Case Rejected": "status-rejected",
      "Case Registered": "status-registered",
      "Judge Assigned": "status-assigned",
      "Hearing Scheduled": "status-scheduled",
      "Hearing Rescheduled": "status-rescheduled",
      "Hearing Conducted": "status-conducted",
      "Evidence or Documents Upload": "status-evidence",
      "Case Under Review": "status-review",
      "Judgement Issued": "status-judgement",
      "Case Closed": "status-closed"
    };
    return map[status] || "status-filed";
  }

  async viewCaseDetails(caseId) {
    try {
      const res = await api.getCaseDetails(caseId);
      this.currentCaseDetail = res.case;
      this.renderCaseDetailsModal(res.case);
      openModal("case-detail-modal");
    } catch (err) {
      showToast(`Failed to load case details: ${err.message}`, "error");
    }
  }

  renderCaseDetailsModal(c) {
    const modalTitle = document.getElementById("case-detail-modal-title");
    if (modalTitle) modalTitle.textContent = `Case #${c.case_id}: ${c.title}`;

    // Render Timeline Visualizer (Strictly following State Transition Diagram)
    const timelineContainer = document.getElementById("case-state-timeline");
    if (timelineContainer) {
      const allStates = [
        "Case Filed", "Under Verification", "Case Registered", "Judge Assigned",
        "Hearing Scheduled", "Hearing Conducted", "Case Under Review", "Judgement Issued", "Case Closed"
      ];
      
      let currentIndex = allStates.indexOf(c.status);
      if (c.status === "Hearing Rescheduled") currentIndex = 4;
      if (c.status === "Evidence or Documents Upload") currentIndex = 5;

      timelineContainer.innerHTML = allStates.map((st, idx) => {
        let nodeClass = "";
        if (c.status === "Case Rejected" && idx === 1) {
          nodeClass = "active";
          st = "Case Rejected";
        } else if (idx === currentIndex) {
          nodeClass = "active";
        } else if (currentIndex > -1 && idx < currentIndex) {
          nodeClass = "completed";
        }
        return `
          <div class="step-node ${nodeClass}">
            <div class="step-circle">${idx + 1}</div>
            <div class="step-label">${st}</div>
          </div>
        `;
      }).join("");
    }

    // Basic Info
    const basicEl = document.getElementById("case-detail-basic-info");
    if (basicEl) {
      basicEl.innerHTML = `
        <div class="key-value-list">
          <div class="key-value-item"><label>Case ID</label><span>CPMS-${String(c.case_id).padStart(4, '0')}</span></div>
          <div class="key-value-item"><label>Filing Date</label><span>${c.filing_date}</span></div>
          <div class="key-value-item"><label>Current Status</label><span class="status-pill ${this.getStatusClass(c.status)}">${c.status}</span></div>
          <div class="key-value-item"><label>Assigned Judge</label><span>${c.judge_name || 'Unassigned'}</span></div>
          <div class="key-value-item"><label>Client (Petitioner)</label><span>${c.client_name} (${c.client_phone})</span></div>
          <div class="key-value-item"><label>Representing Lawyer</label><span>${c.lawyer_name} (${c.firm_name})</span></div>
        </div>
        <div style="margin-top:14px;">
          <label style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Pleadings & Facts</label>
          <p style="margin-top:4px; font-size:13px; line-height:1.6; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #e2e8f0;">
            ${escapeHtml(c.description)}
          </p>
        </div>
        ${c.rejection_remarks ? `
          <div style="margin-top:12px; padding:10px 14px; background:#fef2f2; border-left:4px solid #dc2626; border-radius:4px;">
            <strong style="color:#b91c1c; font-size:12px;">Scrutiny Rejection Remarks:</strong>
            <p style="color:#7f1d1d; font-size:12.5px; margin-top:2px;">${escapeHtml(c.rejection_remarks)}</p>
          </div>
        ` : ''}
      `;
    }

    // Evidence tab in modal
    const evListEl = document.getElementById("case-detail-evidence-list");
    if (evListEl) {
      if (c.evidence && c.evidence.length > 0) {
        evListEl.innerHTML = c.evidence.map(e => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:8px; background:#fff;">
            <div>
              <div style="font-weight:600; font-size:13px; color:var(--primary-navy);">${escapeHtml(e.file_name)}</div>
              <div style="font-size:11px; color:#64748b;">${escapeHtml(e.description || 'Pleading Exhibit')} &bull; Uploaded on ${e.uploaded_date.substring(0, 10)} by ${escapeHtml(e.uploader_name)}</div>
            </div>
            <a href="${api.getEvidenceDownloadUrl(e.evidence_id)}" target="_blank" class="btn btn-outline btn-sm">Download</a>
          </div>
        `).join("");
      } else {
        evListEl.innerHTML = `<p style="font-size:12.5px; color:#94a3b8; font-style:italic;">No digital evidence files attached to this case yet.</p>`;
      }
    }

    // Hearings list in modal
    const hListEl = document.getElementById("case-detail-hearings-list");
    if (hListEl) {
      if (c.hearings && c.hearings.length > 0) {
        hListEl.innerHTML = c.hearings.map(h => `
          <div style="padding:10px 12px; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:8px; background:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; font-size:13px; color:var(--primary-navy);">${h.hearing_date} at ${h.hearing_time}</span>
              <span class="status-pill status-${h.status.toLowerCase()}">${h.status}</span>
            </div>
            <div style="font-size:11.5px; color:#64748b; margin-top:3px;"><strong>Venue:</strong> ${escapeHtml(h.venue)} &bull; <strong>Presiding:</strong> ${escapeHtml(h.judge_name)}</div>
            ${h.remarks ? `<div style="font-size:12px; margin-top:4px; color:#334155;"><strong>Proceedings:</strong> ${escapeHtml(h.remarks)}</div>` : ''}
          </div>
        `).join("");
      } else {
        hListEl.innerHTML = `<p style="font-size:12.5px; color:#94a3b8; font-style:italic;">No hearings scheduled yet.</p>`;
      }
    }

    // Judgement in modal
    const jEl = document.getElementById("case-detail-judgement");
    if (jEl) {
      if (c.judgement) {
        jEl.innerHTML = `
          <div style="padding:14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#166534; font-size:14px;">Operative Order: ${c.judgement.decision.toUpperCase()}</strong>
              <span style="font-size:11.5px; color:#15803d;">Date: ${c.judgement.judgement_date}</span>
            </div>
            <p style="font-size:12.5px; color:#14532d; margin-top:8px; line-height:1.5;">${escapeHtml(c.judgement.remarks)}</p>
            <div style="margin-top:10px;">
              <span style="font-size:11px; color:#166534;">Delivered by ${escapeHtml(c.judgement.judge_name)}</span>
            </div>
          </div>
        `;
      } else {
        jEl.innerHTML = `<p style="font-size:12.5px; color:#94a3b8; font-style:italic;">Matter is sub-judice. Judgment not yet delivered.</p>`;
      }
    }

    // Audit trail in modal
    const histEl = document.getElementById("case-detail-audit-trail");
    if (histEl) {
      if (c.history && c.history.length > 0) {
        histEl.innerHTML = c.history.map(item => `
          <li class="audit-item">
            <div class="audit-title">${escapeHtml(item.action)}: <span class="status-pill ${this.getStatusClass(item.new_status)}">${item.new_status}</span></div>
            <div class="audit-meta">By ${escapeHtml(item.changed_by_name || 'System')} &bull; ${item.timestamp.replace('T', ' ').substring(0, 19)}</div>
            ${item.remarks ? `<div class="audit-remarks">${escapeHtml(item.remarks)}</div>` : ''}
          </li>
        `).join("");
      } else {
        histEl.innerHTML = `<li style="font-size:12px; color:#94a3b8;">No audit trail events recorded.</li>`;
      }
    }

    // Dynamic Context Action Button inside Modal footer
    const modalFooterActions = document.getElementById("case-detail-modal-actions");
    if (modalFooterActions) {
      modalFooterActions.innerHTML = "";
      const role = auth.currentUser ? auth.currentUser.role : "";

      if (role === "Court Staff" && c.status === "Under Verification") {
        modalFooterActions.innerHTML = `
          <button class="btn btn-success" onclick="caseManager.quickVerifyPrompt(${c.case_id}, 'Valid Case')">Admit & Register Case</button>
          <button class="btn btn-danger" onclick="caseManager.quickVerifyPrompt(${c.case_id}, 'Invalid/Incomplete')">Reject with Remarks</button>
        `;
      } else if (role === "Admin" && c.status === "Case Registered") {
        modalFooterActions.innerHTML = `
          <button class="btn btn-accent" onclick="caseManager.openAssignJudgeModal(${c.case_id})">Assign Judge</button>
        `;
      } else if (role === "Judge" && (c.status === "Judge Assigned" || c.status === "Hearing Conducted")) {
        modalFooterActions.innerHTML = `
          <button class="btn btn-primary" onclick="hearingScheduler.openScheduleModal(${c.case_id})">Schedule Hearing</button>
          ${c.status === "Hearing Conducted" ? `<button class="btn btn-accent" onclick="caseManager.openJudgementModal(${c.case_id})">Deliver Judgment</button>` : ''}
        `;
      } else if (role === "Judge" && c.status === "Case Under Review") {
        modalFooterActions.innerHTML = `
          <button class="btn btn-accent" onclick="caseManager.openJudgementModal(${c.case_id})">Deliver Final Judgment</button>
        `;
      } else if (role === "Lawyer" && c.status === "Case Rejected") {
        modalFooterActions.innerHTML = `
          <button class="btn btn-accent" onclick="caseManager.openResubmitModal(${c.case_id})">Resubmit Corrected Case</button>
        `;
      } else if (role === "Lawyer" && !["Case Closed", "Judgement Issued"].includes(c.status)) {
        modalFooterActions.innerHTML = `
          <button class="btn btn-outline" onclick="evidencePortal.openUploadModal(${c.case_id})">Upload Evidence Document</button>
        `;
      } else if (role === "Admin" && c.status === "Judgement Issued") {
        modalFooterActions.innerHTML = `
          <button class="btn btn-primary" onclick="caseManager.closeCaseAction(${c.case_id})">Formally Close & Archive Case</button>
        `;
      }
    }
  }

  async quickVerifyPrompt(caseId, action) {
    let remarks = "";
    if (action === "Invalid/Incomplete") {
      remarks = prompt("Enter reasons/defects found for rejecting the filing:");
      if (!remarks || !remarks.trim()) {
        showToast("Rejection requires valid remarks for the filing advocate.", "warning");
        return;
      }
    } else {
      remarks = "Pleadings and jurisdiction verified compliant under Order VII CPC.";
    }

    try {
      const res = await api.verifyCase(caseId, action, remarks);
      showToast(res.message, "success");
      closeModal("case-detail-modal");
      await this.loadCases();
    } catch (err) {
      showToast(`Verification failed: ${err.message}`, "error");
    }
  }

  openAssignJudgeModal(caseId) {
    document.getElementById("assign-judge-case-id").value = caseId;
    closeModal("case-detail-modal");
    openModal("assign-judge-modal");
  }

  async handleAssignJudgeSubmit(e) {
    e.preventDefault();
    const caseId = parseInt(document.getElementById("assign-judge-case-id").value);
    const judgeId = parseInt(document.getElementById("assign-judge-select").value);

    if (!judgeId) {
      showToast("Please select a Judge from the roster.", "warning");
      return;
    }

    try {
      const res = await api.assignJudge(caseId, judgeId);
      showToast(res.message, "success");
      closeModal("assign-judge-modal");
      await this.loadCases();
    } catch (err) {
      showToast(`Judge assignment failed: ${err.message}`, "error");
    }
  }

  openResubmitModal(caseId) {
    document.getElementById("resubmit-case-id").value = caseId;
    closeModal("case-detail-modal");
    openModal("resubmit-case-modal");
  }

  async handleResubmitSubmit(e) {
    e.preventDefault();
    const caseId = parseInt(document.getElementById("resubmit-case-id").value);
    const update = document.getElementById("resubmit-corrections").value;

    if (!update || update.trim().length < 15) {
      showToast("Please explain the corrections made (min 15 chars).", "warning");
      return;
    }

    try {
      const res = await api.resubmitCase(caseId, update);
      showToast(res.message, "success");
      closeModal("resubmit-case-modal");
      await this.loadCases();
    } catch (err) {
      showToast(`Resubmission failed: ${err.message}`, "error");
    }
  }

  openJudgementModal(caseId) {
    document.getElementById("judgement-case-id").value = caseId;
    closeModal("case-detail-modal");
    openModal("judgement-modal");
  }

  async handleJudgementSubmit(e) {
    e.preventDefault();
    const caseId = parseInt(document.getElementById("judgement-case-id").value);
    const decision = document.getElementById("judgement-decision").value;
    const remarks = document.getElementById("judgement-remarks").value;

    if (!decision) {
      showToast("Please select an operative decision.", "warning");
      return;
    }
    if (!remarks || remarks.trim().length < 20) {
      showToast("Please enter detailed legal findings and reasoning (min 20 characters).", "warning");
      return;
    }

    try {
      const res = await api.issueJudgement(caseId, { decision, remarks });
      showToast(res.message, "success");
      closeModal("judgement-modal");
      await this.loadCases();
    } catch (err) {
      showToast(`Failed to record judgment: ${err.message}`, "error");
    }
  }

  async closeCaseAction(caseId) {
    if (!confirm(`Are you sure you want to formally CLOSE and archive Case #${caseId}?`)) return;
    try {
      const res = await api.closeCase(caseId);
      showToast(res.message, "success");
      closeModal("case-detail-modal");
      await this.loadCases();
    } catch (err) {
      showToast(`Failed to close case: ${err.message}`, "error");
    }
  }

  async handleFileCaseSubmit(e) {
    e.preventDefault();
    const clientId = parseInt(document.getElementById("file-case-client-select").value);
    const title = document.getElementById("file-case-title").value.trim();
    const description = document.getElementById("file-case-description").value.trim();
    const filingDate = document.getElementById("file-case-date").value || null;

    // Strict validation
    if (!clientId) {
      showToast("Validation Error: Please select an active client.", "warning");
      return;
    }
    if (title.length < 5) {
      showToast("Validation Error: Title must be at least 5 characters.", "warning");
      return;
    }
    if (description.length < 20) {
      showToast("Validation Error: Pleadings description must provide adequate facts (min 20 characters).", "warning");
      return;
    }

    try {
      const res = await api.fileCase({
        client_id: clientId,
        title: title,
        description: description,
        filing_date: filingDate
      });

      showToast(res.message, "success");
      document.getElementById("file-case-form").reset();
      switchView("cases-view");
      await this.loadCases();
    } catch (err) {
      showToast(`Filing error: ${err.message}`, "error");
    }
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById("case-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.loadCases();
      });
    }

    // Status filter buttons
    const filterPills = document.querySelectorAll(".case-filter-pill");
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.activeFilter = pill.getAttribute("data-filter") || "";
        this.loadCases();
      });
    });

    // Forms
    const fileCaseForm = document.getElementById("file-case-form");
    if (fileCaseForm) fileCaseForm.addEventListener("submit", (e) => this.handleFileCaseSubmit(e));

    const assignJudgeForm = document.getElementById("assign-judge-form");
    if (assignJudgeForm) assignJudgeForm.addEventListener("submit", (e) => this.handleAssignJudgeSubmit(e));

    const resubmitForm = document.getElementById("resubmit-case-form");
    if (resubmitForm) resubmitForm.addEventListener("submit", (e) => this.handleResubmitSubmit(e));

    const judgementForm = document.getElementById("judgement-form");
    if (judgementForm) judgementForm.addEventListener("submit", (e) => this.handleJudgementSubmit(e));
  }
}

const caseManager = new CaseManager();
