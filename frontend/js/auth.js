/**
 * CPMS Authentication and Role Controller
 * Manages 5 documented roles: Admin, Judge, Lawyer, Client, Court Staff
 * Dedicated Homepage Gateway with strict role separation
 */

const PRESET_USERS = {
  "Admin": { email: "admin@court.gov.in", password: "admin123", name: "Priya Sharma", role: "Admin", user_id: 1, designation: "System Administrator" },
  "Judge": { email: "judge.kumar@court.gov.in", password: "judge123", name: "Hon. Rajesh Kumar", role: "Judge", user_id: 2, designation: "Commercial Bench" },
  "Lawyer": { email: "lawyer.mehta@bar.org", password: "lawyer123", name: "Adv. Arjun Mehta", role: "Lawyer", user_id: 4, designation: "Bar ID: D/1429/2018" },
  "Client": { email: "client.ramesh@gmail.com", password: "client123", name: "Ramesh Gupta", role: "Client", user_id: 6, designation: "Litigant (Petitioner)" },
  "Court Staff": { email: "staff.babu@court.gov.in", password: "staff123", name: "Suresh Babu", role: "Court Staff", user_id: 8, designation: "Registry Officer" }
};

class AuthController {
  constructor() {
    this.currentUser = null;
  }

  async init() {
    // Initialize Theme
    const savedTheme = localStorage.getItem("cpms_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeUI(savedTheme);

    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get("role");

    // If explicit role requested via URL parameter
    if (roleParam && PRESET_USERS[roleParam]) {
      await this.loginAs(roleParam);
      return;
    }

    // Default: Show the Dynamic Judicial Homepage Gateway!
    const homepage = document.getElementById("cpms-homepage");
    const appContainer = document.getElementById("app-container");
    if (homepage && appContainer) {
      homepage.style.display = "flex";
      homepage.style.opacity = "1";
      appContainer.style.display = "none";
    }
  }

  async loginAs(roleName) {
    const preset = PRESET_USERS[roleName];
    if (!preset) return;

    try {
      showToast(`Authenticating ${preset.name} (${roleName} Portal)...`, "info");
      
      const user = await api.login(preset.email, preset.password);
      this.currentUser = user;
      
      // Animate transition: fade out homepage, fade in app-container
      const homepage = document.getElementById("cpms-homepage");
      const appContainer = document.getElementById("app-container");
      
      if (homepage && appContainer) {
        homepage.style.opacity = "0";
        setTimeout(() => {
          homepage.style.display = "none";
          appContainer.style.display = "flex";
          appContainer.style.opacity = "0";
          setTimeout(() => {
            appContainer.style.opacity = "1";
          }, 40);
        }, 200);
      }

      this.renderHeaderUser();
      this.enforceRolePermissions();

      // Refresh relevant views
      if (window.caseManager) window.caseManager.loadCases();
      if (window.hearingScheduler) window.hearingScheduler.loadHearings();
      if (window.evidencePortal) window.evidencePortal.loadEvidence();
      if (window.notifManager) window.notifManager.loadNotifications();

      showToast(`Welcome, ${user.name}! ${roleName} Portal active.`, "success");
    } catch (err) {
      showToast(`Login failed: ${err.message}`, "error");
    }
  }

  showHomepage() {
    const homepage = document.getElementById("cpms-homepage");
    const appContainer = document.getElementById("app-container");
    if (homepage && appContainer) {
      appContainer.style.opacity = "0";
      setTimeout(() => {
        appContainer.style.display = "none";
        homepage.style.display = "flex";
        homepage.style.opacity = "0";
        setTimeout(() => {
          homepage.style.opacity = "1";
        }, 40);
      }, 200);
      showToast("Returned to Homepage. Select a role to switch portal.", "info");
    }
  }

  openCustomLogin(prefillRole = "Lawyer") {
    const preset = PRESET_USERS[prefillRole] || PRESET_USERS["Lawyer"];
    const emailInput = document.getElementById("custom-login-email");
    const pwdInput = document.getElementById("custom-login-password");
    if (emailInput) emailInput.value = preset.email;
    if (pwdInput) pwdInput.value = preset.password;
    
    openModal("custom-login-modal");
  }

  async submitCustomLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById("custom-login-email").value.trim();
    const password = document.getElementById("custom-login-password").value.trim();

    try {
      showToast("Authenticating credentials...", "info");
      const user = await api.login(email, password);
      this.currentUser = user;
      closeModal("custom-login-modal");

      const homepage = document.getElementById("cpms-homepage");
      const appContainer = document.getElementById("app-container");
      if (homepage && appContainer) {
        homepage.style.display = "none";
        appContainer.style.display = "flex";
      }

      this.renderHeaderUser();
      this.enforceRolePermissions();

      if (window.caseManager) window.caseManager.loadCases();
      if (window.hearingScheduler) window.hearingScheduler.loadHearings();
      if (window.evidencePortal) window.evidencePortal.loadEvidence();
      if (window.notifManager) window.notifManager.loadNotifications();

      showToast(`Authenticated as: ${user.name} (${user.role})`, "success");
    } catch (err) {
      showToast(`Authentication Error: ${err.message}`, "error");
    }
  }

  renderHeaderUser() {
    const nameEl = document.getElementById("header-user-name");
    const roleEl = document.getElementById("header-user-role");
    const avatarEl = document.getElementById("header-user-avatar");
    
    if (this.currentUser) {
      if (nameEl) nameEl.textContent = this.currentUser.name;
      if (roleEl) roleEl.textContent = `${this.currentUser.role} Portal`;
      if (avatarEl) {
        const initials = this.currentUser.name.split(" ").map(n => n[0]).join("").substring(0, 2);
        avatarEl.textContent = initials;
      }
    }
  }

  enforceRolePermissions() {
    if (!this.currentUser) return;
    const role = this.currentUser.role;

    // Show/hide navigation and action controls according to role
    document.querySelectorAll("[data-require-role]").forEach(el => {
      const allowedRoles = el.getAttribute("data-require-role").split(",").map(r => r.trim());
      if (allowedRoles.includes(role) || allowedRoles.includes("ALL")) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });

    // Update banner message
    const banner = document.getElementById("role-context-banner");
    if (banner) {
      const descMap = {
        "Lawyer": "E-filing active: File new petitions, submit evidence documents, and track client hearing schedules.",
        "Court Staff": "Registry scrutiny active: Review pending filings, verify documents, and admit or return petitions.",
        "Admin": "Administration active: Assign judges to verified cases, oversee court system health, and generate official metrics.",
        "Judge": "Chambers active: Preside over assigned cases, manage hearings, evaluate evidence, and record final judgments.",
        "Client": "Public tracking active: Track status updates for your matter, view upcoming court appearances, and download orders."
      };
      banner.textContent = descMap[role] || "";
    }
  }

  updateThemeUI(theme) {
    const icons = document.querySelectorAll(".theme-toggle-icon");
    const labels = document.querySelectorAll(".theme-toggle-label");
    icons.forEach(i => i.textContent = theme === "dark" ? "☀️" : "🌙");
    labels.forEach(l => l.textContent = theme === "dark" ? "Light Mode" : "Dark Mode");
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("cpms_theme", newTheme);
  if (window.auth) window.auth.updateThemeUI(newTheme);
  showToast(`Switched to ${newTheme === "dark" ? "Dark" : "Light"} theme`, "info");
}

const auth = new AuthController();
