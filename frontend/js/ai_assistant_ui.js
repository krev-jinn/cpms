/**
 * CPMS AI Assistant UI Controller (Assessment 8.3)
 * Connects the UI to the genuine AI Case Summary Assistant backend service.
 */

const SAMPLE_LEGAL_BRIEFS = {
  commercial: `The plaintiff Ramesh Gupta filed a commercial suit against TechCorp Solutions Ltd under Section 73 of the Indian Contract Act, 1872. The plaintiff entered into an enterprise software development agreement on 15th January 2024 with a total contract value of Rs. 50,00,000. The plaintiff remitted an advance consideration of Rs. 25,00,000 via RTGS on 20th January 2024. The defendant failed to deliver the milestone software modules by the agreed deadline of 30th June 2024. On 10th August 2024, the defendant unilaterally terminated the contract without returning the advance funds. The plaintiff seeks a decree for refund of Rs. 25 lakhs with 18% interest and compensation of Rs. 10 lakhs for commercial damages.`,

  land: `The petitioner Anita Patel filed a writ petition against the Metro Infrastructure Corporation and the Special Land Acquisition Officer under Article 226 of the Constitution of India and Section 64 of the Right to Fair Compensation and Transparency in Land Acquisition Act, 2013. The respondents compulsorily acquired 2.5 acres of agricultural land in Survey No. 48/2 on 12th February 2023 for an arterial expressway. The collector awarded compensation at Rs. 15,00,000 per acre, which is grossly below the registered commercial market guideline value of Rs. 45,00,000 per acre. The petitioner filed a statutory reference claiming fair market compensation of Rs. 1,12,50,000 along with 30% solatium and 12% additional interest.`,

  cheque: `The complainant Zenith Logistics filed a criminal complaint under Section 138 of the Negotiable Instruments Act, 1881 against Apex Traders. In discharge of legally enforceable freight debt of Rs. 14,50,000, the accused issued cheque number 582910 dated 5th May 2024 drawn on State Bank of India. Upon presentation, the cheque was dishonoured with the bank return memo dated 8th May 2024 stating 'Funds Insufficient'. The complainant served a statutory legal demand notice on 15th May 2024, received by the accused on 18th May 2024. The accused failed to make payment within the mandatory statutory period of 15 days.`,

  arbitration: `The applicant filed an application under Section 11(6) of the Arbitration and Conciliation Act, 1996 seeking the appointment of an independent sole arbitrator. The parties entered into a master construction contract containing Clause 24 as an explicit dispute resolution mechanism. Disputes arose regarding escalation charges amounting to Rs. 85,00,000. The respondent failed to concur on the proposed arbitrator within 30 days from the invocation notice dated 4th April 2024.`
};

class AIAssistantUI {
  constructor() {
    this.lastResult = null;
  }

  init() {
    this.setupEventListeners();
  }

  loadSample(briefKey) {
    const textarea = document.getElementById("ai-input-text");
    if (textarea && SAMPLE_LEGAL_BRIEFS[briefKey]) {
      textarea.value = SAMPLE_LEGAL_BRIEFS[briefKey];
      showToast(`Loaded ${briefKey.toUpperCase()} sample case brief.`, "info");
    }
  }

  async runSummarize() {
    const text = document.getElementById("ai-input-text").value.trim();
    const sentenceCount = parseInt(document.getElementById("ai-sentence-count").value || 3);
    const algorithm = document.getElementById("ai-algorithm").value || "lexrank";
    const apiKey = document.getElementById("ai-api-key").value.trim() || null;

    if (!text || text.length < 15) {
      showToast("Please enter or load case narrative text (min 15 characters).", "warning");
      return;
    }

    const runBtn = document.getElementById("ai-run-btn");
    const outputContainer = document.getElementById("ai-output-container");

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = `<span>Synthesizing Legal Summary...</span>`;
    }

    try {
      const res = await api.summarizeCase(text, sentenceCount, algorithm, apiKey);
      this.lastResult = res;
      this.renderOutput(res);
      showToast(`AI Analysis complete via ${res.algorithm}`, "success");
    } catch (err) {
      showToast(`AI Summarization error: ${err.message}`, "error");
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = `<span>Generate AI Summary</span>`;
      }
    }
  }

  renderOutput(res) {
    const container = document.getElementById("ai-output-container");
    if (!container) return;

    container.style.display = "block";

    const summaryText = res.executive_summary;
    const entities = res.extracted_entities || {};
    const metrics = res.metrics || {};
    const recommendation = res.recommendation || "";

    const actsHtml = (entities.statutory_references || []).map(a => `<span class="entity-tag act">${escapeHtml(a)}</span>`).join("");
    const moneyHtml = (entities.monetary_claims || []).map(m => `<span class="entity-tag monetary">${escapeHtml(m)}</span>`).join("");
    const reliefsHtml = (entities.relief_categories || []).map(r => `<span class="entity-tag">${escapeHtml(r)}</span>`).join("");
    const datesHtml = (entities.relevant_dates || []).map(d => `<span class="entity-tag">${escapeHtml(d)}</span>`).join("");

    container.innerHTML = `
      <div class="ai-output-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <strong style="color:var(--primary-navy); font-size:14px;">Executive Judicial Summary</strong>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Engine: <strong>${escapeHtml(res.algorithm)}</strong> &bull; Compression: <strong>${metrics.compression_ratio || 'N/A'}</strong></div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="aiAssistantUI.copySummary()">Copy</button>
        </div>

        <p style="font-size:13px; line-height:1.6; color:#1e293b; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #e2e8f0;">
          ${escapeHtml(summaryText)}
        </p>

        <div style="margin-top:16px;">
          <label style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Identified Parties</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px; font-size:12.5px;">
            <div style="background:#fff; border:1px solid #e2e8f0; padding:6px 10px; border-radius:4px;">
              <span style="color:#64748b; font-size:11px;">Plaintiff / Petitioner:</span> <strong>${escapeHtml(entities.parties?.plaintiff || 'Unspecified')}</strong>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; padding:6px 10px; border-radius:4px;">
              <span style="color:#64748b; font-size:11px;">Defendant / Respondent:</span> <strong>${escapeHtml(entities.parties?.defendant || 'Unspecified')}</strong>
            </div>
          </div>
        </div>

        <div style="margin-top:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Statutory Citations & Acts</label>
          <div class="entity-tags">${actsHtml || '<span style="font-size:11px; color:#94a3b8;">None detected</span>'}</div>
        </div>

        <div style="margin-top:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Monetary Claims & Consideration</label>
          <div class="entity-tags">${moneyHtml || '<span style="font-size:11px; color:#94a3b8;">Non-monetary</span>'}</div>
        </div>

        <div style="margin-top:12px;">
          <label style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Key Relief Categories</label>
          <div class="entity-tags">${reliefsHtml || '<span style="font-size:11px; color:#94a3b8;">Declaratory</span>'}</div>
        </div>

        ${recommendation ? `
          <div style="margin-top:16px; padding:12px; background:#eff6ff; border-left:4px solid #2563eb; border-radius:4px;">
            <strong style="color:#1e40af; font-size:12px;">Procedural Scrutiny Recommendation:</strong>
            <p style="color:#1e3a8a; font-size:12.5px; margin-top:2px;">${escapeHtml(recommendation)}</p>
          </div>
        ` : ''}

        <div style="margin-top:16px; display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-accent btn-sm" onclick="aiAssistantUI.insertIntoCaseFiling()">Insert Into Case Filing Form</button>
        </div>
      </div>
    `;
  }

  copySummary() {
    if (this.lastResult && this.lastResult.executive_summary) {
      navigator.clipboard.writeText(this.lastResult.executive_summary);
      showToast("Executive summary copied to clipboard.", "info");
    }
  }

  insertIntoCaseFiling() {
    if (!this.lastResult || !this.lastResult.executive_summary) return;
    const descField = document.getElementById("file-case-description");
    if (descField) {
      descField.value = this.lastResult.executive_summary;
      switchView("file-case-view");
      showToast("Summary inserted into Case Pleadings field.", "success");
    }
  }

  setupEventListeners() {
    const runBtn = document.getElementById("ai-run-btn");
    if (runBtn) runBtn.addEventListener("click", () => this.runSummarize());
  }
}

const aiAssistantUI = new AIAssistantUI();
