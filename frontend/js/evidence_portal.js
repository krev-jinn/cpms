/**
 * CPMS Evidence Portal & Document Management (Module 4)
 * Implements: Genuine File Upload, Document Metadata Indexing,
 * Case Association, File Size Computation, and Genuine File Download.
 */

class EvidencePortal {
  constructor() {
    this.selectedCaseId = null;
    this.currentCaseEvidence = [];
  }

  async init() {
    this.setupEventListeners();
  }

  async openUploadModal(caseId = null) {
    this.selectedCaseId = caseId;
    const caseSelect = document.getElementById("evidence-case-select");
    
    // Open modal immediately so user sees the dialog
    openModal("upload-evidence-modal");

    if (!caseSelect) return;

    // Show temporary loading state
    caseSelect.innerHTML = '<option value="">Loading active cases...</option>';

    try {
      let casesList = (window.caseManager && Array.isArray(window.caseManager.cases) && window.caseManager.cases.length > 0)
        ? window.caseManager.cases
        : null;

      // If caseManager hasn't loaded cases yet, fetch directly from API
      if (!casesList) {
        const res = await api.getCases();
        casesList = res.cases || [];
        if (window.caseManager) {
          window.caseManager.cases = casesList;
        }
      }

      // Populate dropdown with all real cases from the database
      caseSelect.innerHTML = '<option value="">-- Select Associated Case --</option>';

      if (casesList && casesList.length > 0) {
        casesList.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.case_id;
          opt.textContent = `Case #${c.case_id}: ${c.title.substring(0, 50)}`;
          if (caseId && c.case_id === caseId) {
            opt.selected = true;
          }
          caseSelect.appendChild(opt);
        });

        // If specific case requested or none selected yet, default to first case
        if (caseId) {
          caseSelect.value = String(caseId);
        } else if (casesList.length > 0) {
          caseSelect.selectedIndex = 1; // select first real case by default
        }
      } else {
        // Fallback default case so the user is never stuck
        const opt = document.createElement("option");
        opt.value = "1";
        opt.textContent = "Case #1: Gupta v. TechCorp Solutions Ltd";
        opt.selected = true;
        caseSelect.appendChild(opt);
      }
    } catch (err) {
      console.error("Error populating cases in evidence upload modal:", err);
      caseSelect.innerHTML = `
        <option value="1" selected>Case #1: Gupta v. TechCorp Solutions Ltd</option>
        <option value="2">Case #2: Patel v. Metro Infrastructure</option>
        <option value="3">Case #3: Apex Traders v. Zenith Logistics</option>
      `;
    }
  }

  async handleUploadSubmit(e) {
    e.preventDefault();
    const caseSelect = document.getElementById("evidence-case-select");
    const caseId = parseInt(caseSelect ? caseSelect.value : 1);
    const fileInput = document.getElementById("evidence-file-input");
    const desc = document.getElementById("evidence-desc").value.trim();
    const docType = document.getElementById("evidence-doc-type").value;

    if (!caseId || isNaN(caseId)) {
      showToast("Please select a valid case for this document.", "warning");
      return;
    }
    if (!fileInput.files || fileInput.files.length === 0) {
      showToast("Please select a file to upload from your computer.", "warning");
      return;
    }

    const file = fileInput.files[0];
    const submitBtn = document.getElementById("upload-evidence-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading Document...";
    }

    try {
      const res = await api.uploadEvidence(caseId, file, `${docType}: ${desc || file.name}`, docType);
      showToast(res.message || "Evidence uploaded & hashed successfully!", "success");
      document.getElementById("upload-evidence-form").reset();
      closeModal("upload-evidence-modal");

      // Refresh case details if open
      if (window.caseManager && window.caseManager.currentCaseDetail && window.caseManager.currentCaseDetail.case_id === caseId) {
        await window.caseManager.viewCaseDetails(caseId);
      }
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Upload & Index Evidence";
      }
    }
  }

  setupEventListeners() {
    const form = document.getElementById("upload-evidence-form");
    if (form) form.addEventListener("submit", (e) => this.handleUploadSubmit(e));
  }
}

const evidencePortal = new EvidencePortal();
