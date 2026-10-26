/**
 * CPMS Notifications & Reports Module (Module 5)
 * Implements: Notification Bell, Dropdown Alerts, Role Filtering,
 * System Summary Reports, and Real Data Export (CSV/JSON).
 */

class NotificationAndReportManager {
  constructor() {
    this.notifications = [];
    this.summaryData = null;
  }

  async init() {
    await this.loadNotifications();
    this.setupEventListeners();
  }

  async loadNotifications() {
    const user = auth.currentUser;
    const role = user ? user.role : null;
    const userId = user ? user.user_id : null;

    try {
      const res = await api.listNotifications(role, userId);
      this.notifications = res.notifications || [];
      this.renderNotificationBell(res.unread_count || 0);
      this.renderNotificationList();
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }

  renderNotificationBell(unreadCount) {
    const badge = document.getElementById("notif-unread-count");
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }
  }

  renderNotificationList() {
    const list = document.getElementById("notif-dropdown-list");
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `<li style="padding:20px; text-align:center; color:#94a3b8; font-size:12px;">No notifications for your role.</li>`;
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <li class="notif-item ${n.is_read ? '' : 'unread'}" onclick="notifManager.handleItemClick(${n.notification_id}, ${n.case_id})">
        <div style="font-weight:${n.is_read ? '500' : '700'}; color:var(--primary-navy);">${escapeHtml(n.message)}</div>
        <div class="notif-time">${n.date.replace('T', ' ').substring(0, 16)} &bull; Recipient: ${n.recipient_role}</div>
      </li>
    `).join("");
  }

  async handleItemClick(notifId, caseId) {
    try {
      await api.markNotificationRead(notifId);
      await this.loadNotifications();
      if (caseId && window.caseManager) {
        document.getElementById("notif-dropdown").classList.remove("active");
        await window.caseManager.viewCaseDetails(caseId);
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  }

  async loadReports() {
    try {
      const res = await api.getSystemSummary();
      this.summaryData = res;
      this.renderReportsView(res);
    } catch (err) {
      showToast(`Failed to generate reports: ${err.message}`, "error");
    }
  }

  renderReportsView(data) {
    const totalCasesEl = document.getElementById("report-total-cases");
    const totalHearingsEl = document.getElementById("report-total-hearings");
    const totalJudgementsEl = document.getElementById("report-total-judgements");
    const totalEvidenceEl = document.getElementById("report-total-evidence");

    if (totalCasesEl) totalCasesEl.textContent = data.total_cases;
    if (totalHearingsEl) totalHearingsEl.textContent = `${data.hearings.completed} / ${data.hearings.total} Completed`;
    if (totalJudgementsEl) totalJudgementsEl.textContent = data.total_judgements_issued;
    if (totalEvidenceEl) totalEvidenceEl.textContent = data.total_evidence_files;

    // Status breakdown bars
    const statusContainer = document.getElementById("report-status-breakdown");
    if (statusContainer) {
      const entries = Object.entries(data.cases_by_status || {});
      statusContainer.innerHTML = entries.map(([statusName, count]) => {
        const percent = Math.round((count / Math.max(data.total_cases, 1)) * 100);
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px;">
              <span style="font-weight:600;">${statusName}</span>
              <span style="color:#64748b;">${count} cases (${percent}%)</span>
            </div>
            <div style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
              <div style="width:${percent}%; height:100%; background:var(--primary-mid); border-radius:4px;"></div>
            </div>
          </div>
        `;
      }).join("");
    }

    // Judges workload
    const judgeTbody = document.getElementById("report-judge-workload-tbody");
    if (judgeTbody) {
      judgeTbody.innerHTML = data.judges_workload.map(j => `
        <tr>
          <td><strong>${escapeHtml(j.name)}</strong></td>
          <td>${j.assigned_cases} active cases</td>
          <td><span class="status-pill status-registered">Active Roster</span></td>
        </tr>
      `).join("");
    }
  }

  exportReportCSV() {
    if (!this.summaryData) return;
    let csv = "Category,Metric,Value\n";
    csv += `Cases,Total Registered Cases,${this.summaryData.total_cases}\n`;
    csv += `Hearings,Total Hearings,${this.summaryData.hearings.total}\n`;
    csv += `Hearings,Completed Hearings,${this.summaryData.hearings.completed}\n`;
    csv += `Evidence,Total Documents Uploaded,${this.summaryData.total_evidence_files}\n`;
    csv += `Judgments,Final Judgments Issued,${this.summaryData.total_judgements_issued}\n`;
    
    Object.entries(this.summaryData.cases_by_status).forEach(([st, cnt]) => {
      csv += `Case Status,${st},${cnt}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CPMS_Court_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Official CPMS report exported to CSV successfully.", "success");
  }

  setupEventListeners() {
    const bellBtn = document.getElementById("notif-bell-btn");
    const dropdown = document.getElementById("notif-dropdown");
    
    if (bellBtn && dropdown) {
      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
      });

      document.addEventListener("click", () => {
        dropdown.classList.remove("active");
      });

      dropdown.addEventListener("click", (e) => e.stopPropagation());
    }

    const exportBtn = document.getElementById("export-report-csv-btn");
    if (exportBtn) exportBtn.addEventListener("click", () => this.exportReportCSV());
  }
}

const notifManager = new NotificationAndReportManager();
