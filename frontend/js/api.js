/**
 * CPMS API Client
 * Connects the Web UI to the authoritative Backend REST API
 * Defined in Component Diagram: UI API -> REST API
 */

const API_BASE = "/api";

class CPMSApiClient {
  constructor() {
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem("cpms_active_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cpms_active_user");
    }
  }

  getCurrentUser() {
    if (!this.currentUser) {
      const stored = localStorage.getItem("cpms_active_user");
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch (e) {
          this.currentUser = null;
        }
      }
    }
    return this.currentUser;
  }

  getHeaders(isMultipart = false) {
    const headers = {};
    if (!isMultipart) {
      headers["Content-Type"] = "application/json";
    }
    const user = this.getCurrentUser();
    if (user) {
      headers["X-User-Role"] = user.role;
      headers["X-User-ID"] = String(user.user_id);
      headers["X-User-Name"] = user.name;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...this.getHeaders(options.isMultipart), ...options.headers };
    
    const config = {
      method: options.method || "GET",
      headers: headers,
    };

    if (options.body) {
      config.body = options.isMultipart ? options.body : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || `HTTP Error ${response.status}: ${response.statusText}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || "GET"}] ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth & Roles
  async login(email, password) {
    const res = await this.request("/auth/login", {
      method: "POST",
      body: { email, password }
    });
    this.setCurrentUser(res.user);
    return res.user;
  }

  async getUsers(role = null) {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    return this.request(`/users${query}`);
  }

  async getJudges() {
    return this.request("/judges");
  }

  async getClients() {
    return this.request("/clients");
  }

  // Cases
  async fileCase(payload) {
    return this.request("/cases/file", {
      method: "POST",
      body: payload
    });
  }

  async listCases(params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.search) q.append("search", params.search);
    if (params.client_id) q.append("client_id", params.client_id);
    if (params.lawyer_id) q.append("lawyer_id", params.lawyer_id);
    if (params.judge_id) q.append("judge_id", params.judge_id);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return this.request(`/cases${queryStr}`);
  }

  async getCaseDetails(caseId) {
    return this.request(`/cases/${caseId}`);
  }

  async verifyCase(caseId, action, remarks = "") {
    return this.request(`/cases/${caseId}/verify`, {
      method: "POST",
      body: { action, remarks }
    });
  }

  async resubmitCase(caseId, descriptionUpdate = "") {
    const formData = new FormData();
    if (descriptionUpdate) formData.append("description_update", descriptionUpdate);
    return this.request(`/cases/${caseId}/resubmit`, {
      method: "POST",
      body: formData,
      isMultipart: true
    });
  }

  async assignJudge(caseId, judgeId) {
    return this.request(`/cases/${caseId}/assign-judge`, {
      method: "POST",
      body: { judge_id: judgeId }
    });
  }

  async transitionCase(caseId, trigger, remarks = "") {
    return this.request(`/cases/${caseId}/transition`, {
      method: "POST",
      body: { trigger, remarks }
    });
  }

  // Hearings
  async scheduleHearing(caseId, payload) {
    return this.request(`/cases/${caseId}/hearings/schedule`, {
      method: "POST",
      body: payload
    });
  }

  async rescheduleHearing(hearingId, payload) {
    return this.request(`/hearings/${hearingId}/reschedule`, {
      method: "POST",
      body: payload
    });
  }

  async conductHearing(hearingId, payload) {
    return this.request(`/hearings/${hearingId}/conduct`, {
      method: "POST",
      body: payload
    });
  }

  async listHearings(caseId = null, judgeId = null) {
    const q = new URLSearchParams();
    if (caseId) q.append("case_id", caseId);
    if (judgeId) q.append("judge_id", judgeId);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return this.request(`/hearings${queryStr}`);
  }

  // Evidence
  async uploadEvidence(caseId, file, description = "", documentType = "Pleading") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);
    formData.append("document_type", documentType);
    return this.request(`/cases/${caseId}/evidence/upload`, {
      method: "POST",
      body: formData,
      isMultipart: true
    });
  }

  async listCaseEvidence(caseId) {
    return this.request(`/cases/${caseId}/evidence`);
  }

  getEvidenceDownloadUrl(evidenceId) {
    return `${API_BASE}/evidence/${evidenceId}/download`;
  }

  // Judgements & Close
  async issueJudgement(caseId, payload) {
    return this.request(`/cases/${caseId}/judgement`, {
      method: "POST",
      body: payload
    });
  }

  async closeCase(caseId) {
    return this.request(`/cases/${caseId}/close`, {
      method: "POST"
    });
  }

  // Notifications
  async listNotifications(role = null, userId = null) {
    const q = new URLSearchParams();
    if (role) q.append("role", role);
    if (userId) q.append("user_id", userId);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return this.request(`/notifications${queryStr}`);
  }

  async markNotificationRead(notifId) {
    return this.request(`/notifications/${notifId}/read`, {
      method: "POST"
    });
  }

  // Reports
  async getSystemSummary() {
    return this.request("/reports/summary");
  }

  // AI Feature
  async summarizeCase(caseText, sentenceCount = 3, algorithm = "lexrank", apiKey = null) {
    return this.request("/ai/summarize", {
      method: "POST",
      body: {
        case_text: caseText,
        sentence_count: sentenceCount,
        algorithm: algorithm,
        api_key: apiKey
      }
    });
  }
}

const api = new CPMSApiClient();
