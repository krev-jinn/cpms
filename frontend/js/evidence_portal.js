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

  openUploadModal(caseId = null) {
    this.selectedCaseId = caseId;
    const caseSelect = document.getElementById("evidence-case-select");
    if (caseSelect && window.caseManager && window.caseManager.cases) {
      caseSelect.innerHTML = '<option value="">-- Select Active Case --</option>';
      window.caseManager.cases.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.case_id;
        opt.textContent = `CPMS-${String(c.case_id).padStart(4, '0')}: ${c.title.substring(0, 45)}...`;
        if (caseId && c.case_id === caseId) opt.selected = true;
        caseSelect.appendChild(opt);
      });
    }
    openModal("upload-evidence-modal");
  }

  async handleUploadSubmit(e) {
    e.preventDefault();
    const caseId = parseInt(document.getElementById("evidence-case-select").value);
    const fileInput = document.getElementById("evidence-file-input");
    const desc = document.getElementById("evidence-desc").value.trim();
    const docType = document.getElementById("evidence-doc-type").value;

    if (!caseId) {
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
      const res = await api.uploadEvidence(caseId, file, `${docType}: ${desc}`, docType);
      showToast(res.message, "success");
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
