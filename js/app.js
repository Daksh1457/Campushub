/**
 * CampusHub 1.0 — Main Application Controller & UI Renderer
 * Adhering strictly to CampusHub_Build_Prompt_2.md:
 * - Hybrid WhatsApp + Instagram Design System
 * - Lands on Sign Up screen by default on initial launch
 * - Zero pre-seeded accounts; supports 10 custom students & 4 custom admins
 * - Interactive Projects, Resources (4 categories with working PDF previews),
 *   Collaboration, Requests (real-time Accept/Decline & chat unlock),
 *   Update Board with Coral notification badges, and Profile with skills manager.
 */

import { store } from './store.js';


class CampusHubApp {
  constructor() {
    this.store = store;
    
    // Check if user is logged in
    const currentUser = store.getCurrentUser();
    this.isLoggedIn = !!currentUser;
    
    // By default per spec: Lands directly on the Sign Up screen if not logged in
    this.currentView = this.isLoggedIn ? 'dashboard' : 'auth';
    this.authMode = 'signup'; // 'signup' | 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'
    
    this.currentProjectTab = 'All';
    this.currentResourceCategory = 'Mid-Sem Papers';
    this.currentRequestTab = 'all';
    
    this.activeModal = null;
    this.modalData = null;
    this.activeChatUserId = null;
    
    this.forgotEmail = '';
    this.mockOtpCode = '1234';
    this.captchaCode = this.generateCaptcha();

    this.isDesktopMode = false;
    this.pendingPdfFile = null;

    this.init();
  }

  init() {
    window.app = this;

    // Subscribe to store updates
    this.store.subscribe(() => {
      const user = this.store.getCurrentUser();
      this.isLoggedIn = !!user;

      this.render();
    });

    // Keyboard shortcuts (Escape closes modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal();
      }
    });

    this.render();
  }

  generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  refreshCaptcha() {
    this.captchaCode = this.generateCaptcha();
    this.render();
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button style="background:none;border:none;color:#fff;cursor:pointer;font-size:14px;margin-left:auto;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  navigate(view, params = {}) {
    if (!this.isLoggedIn && view !== 'auth') {
      this.currentView = 'auth';
    } else {
      this.currentView = view;
    }

    if (params.resourceCategory) {
      this.currentResourceCategory = params.resourceCategory;
    }
    if (params.projectTab) {
      this.currentProjectTab = params.projectTab;
    }

    // If navigating to update board, mark updates as read to clear coral badge
    if (view === 'updateboard') {
      this.store.markUpdatesAsRead();
    }

    this.activeModal = null;
    this.render();

    const screen = document.getElementById('app-screen');
    if (screen) screen.scrollTop = 0;
  }

  openModal(modalName, data = null) {
    this.activeModal = modalName;
    this.modalData = data;
    if (modalName === 'chat_modal' && data) {
      this.activeChatUserId = data;
    }
    this.render();
  }

  closeModal() {
    this.activeModal = null;
    this.modalData = null;
    this.render();
  }

  isDevMode() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('dev') === '1' || localStorage.getItem('devMode') === 'true';
    } catch (e) {
      return false;
    }
  }

  toggleDevMode(forceState) {
    const nextState = forceState !== undefined ? forceState : !this.isDevMode();
    if (nextState) {
      localStorage.setItem('devMode', 'true');
      this.showToast('Developer Mode Enabled (?dev=1)', 'info');
    } else {
      localStorage.removeItem('devMode');
      this.showToast('Developer Mode Disabled', 'info');
    }
    this.updateDevToolbarVisibility();
    this.render();
  }

  updateDevToolbarVisibility() {
    const tb = document.getElementById('dev-toolbar');
    if (tb) {
      tb.style.display = this.isDevMode() ? 'flex' : 'none';
    }
  }

  toggleViewMode() {
    this.isDesktopMode = !this.isDesktopMode;
    const frame = document.getElementById('app-frame');
    const btn = document.getElementById('btn-toggle-frame');
    if (frame) {
      if (this.isDesktopMode) {
        frame.classList.add('desktop-mode');
        if (btn) btn.innerHTML = '💻 Desktop View';
      } else {
        frame.classList.remove('desktop-mode');
        if (btn) btn.innerHTML = '📱 Mobile Frame';
      }
    }
  }

  toggleUserRole() {
    const users = this.store.getRegisteredUsers();
    if (users.length === 0) {
      this.showToast('No registered accounts yet. Please Sign Up an account first.', 'info');
      this.currentView = 'auth';
      this.authMode = 'signup';
      this.render();
      return;
    }

    const current = this.store.getCurrentUser();
    if (!current) {
      this.store.switchUser(users[0].id);
      this.showToast(`Logged in as ${users[0].name} (${users[0].role})`, 'success');
      return;
    }

    const targetRole = current.role === 'student' ? 'admin' : 'student';
    const altUser = users.find(u => u.role === targetRole);

    if (altUser) {
      this.store.switchUser(altUser.id);
      this.showToast(`Switched to ${targetRole.toUpperCase()}: ${altUser.name}`, 'success');
    } else {
      this.showToast(`No registered ${targetRole} account found. You can add one via Sign Up or Accounts Manager.`, 'info');
      this.openModal('accounts_manager');
    }
  }

  // --- Desktop Sidebar Navigation (Fix 1: Desktop >=1024px & Desktop Preview) ---
  renderSidebarNav() {
    const sidebar = document.getElementById('sidebar-nav');
    if (!sidebar) return;

    if (!this.isLoggedIn || this.currentView === 'auth') {
      sidebar.style.display = 'none';
      sidebar.innerHTML = '';
      return;
    }

    // Let CSS display rule govern visibility on desktop
    sidebar.style.display = '';

    const user = this.store.getCurrentUser();
    const current = this.currentView;
    const unreadCount = this.store.getUnreadUpdatesCount();
    const pendingReqs = this.store.getReceivedRequests().length;

    sidebar.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="sidebar-header">
          <div class="ch-logo-mark">CH</div>
          <div>
            <div class="sidebar-brand-name">CampusHub 1.0</div>
            <div class="sidebar-brand-subtitle">${user ? (user.role === 'admin' ? 'Faculty Admin' : 'Student Portal') : 'Portal'}</div>
          </div>
        </div>

        <nav class="sidebar-menu">
          <button class="sidebar-item ${current === 'dashboard' ? 'active' : ''}" onclick="window.app.navigate('dashboard')">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home / Board</span>
          </button>

          <button class="sidebar-item ${current === 'projects' ? 'active' : ''}" onclick="window.app.navigate('projects')">
            <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <span>Projects</span>
          </button>

          <button class="sidebar-item ${current === 'resources' || current === 'resource_sub' ? 'active' : ''}" onclick="window.app.navigate('resources')">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            <span>Study Resources</span>
          </button>

          <button class="sidebar-item ${current === 'collaboration' ? 'active' : ''}" onclick="window.app.navigate('collaboration')">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Collaboration</span>
          </button>

          <button class="sidebar-item ${current === 'updateboard' ? 'active' : ''}" onclick="window.app.navigate('updateboard')">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>Update Board</span>
            ${unreadCount > 0 ? `<span class="sidebar-badge-dot"></span>` : ''}
          </button>

          <button class="sidebar-item ${current === 'requests' ? 'active' : ''}" onclick="window.app.navigate('requests')">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Requests & Chat</span>
            ${pendingReqs > 0 ? `<span class="sidebar-badge-count">${pendingReqs}</span>` : ''}
          </button>

          <button class="sidebar-item ${current === 'profile' ? 'active' : ''}" onclick="window.app.navigate('profile')">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>My Profile</span>
          </button>
        </nav>
      </div>

      <div class="sidebar-footer">
        ${user ? `
          <div class="sidebar-user-card">
            <img src="${user.avatar}" alt="${user.name}" class="user-avatar" style="width:34px;height:34px;" />
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">${user.name}</div>
              <div class="sidebar-user-role">${user.role === 'admin' ? '👑 Admin' : '🎓 Student'}</div>
            </div>
          </div>
          <button class="btn-outline btn-sm" onclick="window.app.handleLogout()" style="width:100%;color:#DC2626;border-color:#FCA5A5;padding:6px 10px;font-size:12px;">
            Log Out
          </button>
        ` : ''}
      </div>
    `;
  }

  // ==========================================
  // VIEW RENDERERS
  // ==========================================


  render() {
    this.updateDevToolbarVisibility();
    this.renderSidebarNav();

    const root = document.getElementById('app-root');
    if (!root) return;


    if (!this.isLoggedIn || this.currentView === 'auth') {
      root.className = 'no-nav';
      root.innerHTML = this.renderAuthView();
    } else {
      root.className = '';
      root.innerHTML = `
        ${this.renderCurrentView()}
        ${this.renderBottomNav()}
      `;
    }


    // Render active modal if any
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.remove();
    }
    if (this.activeModal) {
      const modalEl = document.createElement('div');
      modalEl.id = 'modal-container';
      modalEl.innerHTML = this.renderModal();
      document.body.appendChild(modalEl);
    }
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        return this.renderDashboard();
      case 'projects':
        return this.renderProjects();
      case 'resources':
        return this.renderResources();
      case 'resource_sub':
        return this.renderResourceSubTable();
      case 'collaboration':
        return this.renderCollaboration();
      case 'updateboard':
        return this.renderUpdateBoard();
      case 'profile':
        return this.renderProfile();
      case 'requests':
        return this.renderRequests();
      default:
        return this.renderDashboard();
    }
  }

  // --- 1. Authentication View (Sign Up default per Section 2 & 11) ---
  renderAuthView() {
    const studentCount = this.store.getStudentAccountsCount();
    const adminCount = this.store.getAdminAccountsCount();

    if (this.authMode === 'signup') {
      return `
        <div class="auth-container">
          <div class="auth-header">
            <div class="ch-logo-mark lg">CH</div>
            <h1 class="auth-title">Join CampusHub</h1>
            <p class="auth-subtitle">Create your college account to showcase projects, access resources & collaborate.</p>
          </div>

          <div class="auth-card">
            <form id="signup-form" onsubmit="window.app.handleSignUp(event)">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="su-name" class="form-input" placeholder="e.g. Shiv Patel / Prof. Rajesh Mehta" required />
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">College Email ID</label>
                <input type="email" id="su-email" class="form-input" placeholder="e.g. shiv.patel@svitvasad.ac.in" pattern=".*@svitvasad\.ac\.in" required />
                <span style="font-size:10.5px;color:var(--primary);font-weight:500;">Only @svitvasad.ac.in emails accepted</span>
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Account Role (Cap: 10 Students / 4 Admins)</label>
                <select id="su-role" class="form-select" onchange="window.app.handleRoleChange(this.value)">

                  <option value="student">Student Account (${studentCount}/10 slots used)</option>
                  <option value="admin">Admin / Faculty Account (${adminCount}/4 slots used)</option>
                </select>
              </div>
              <div class="form-group" id="enrollment-group" style="margin-top:10px;">
                <label class="form-label" id="lbl-enrollment">College Enrollment Number</label>
                <input type="text" id="su-enrollment" class="form-input" placeholder="e.g. 210120111045" required />
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Department</label>
                <select id="su-dept" class="form-select">
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="AI & Data Science">AI & Data Science</option>
                </select>
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Password</label>
                <input type="password" id="su-pass" class="form-input" placeholder="••••••••" required />
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Security CAPTCHA</label>
                <div class="captcha-box">
                  <span class="captcha-visual">${this.captchaCode}</span>
                  <button type="button" class="captcha-btn-refresh" onclick="window.app.refreshCaptcha()" title="Refresh CAPTCHA">🔄</button>
                  <input type="text" id="su-captcha" class="form-input" placeholder="Enter CAPTCHA" style="max-width:125px;" required />
                </div>
              </div>

              <button type="submit" class="btn-primary" style="margin-top:16px;">
                Create Account & Enter CampusHub
              </button>
            </form>

            <div style="text-align:center;margin-top:14px;font-size:13px;color:var(--text-muted);">
              Already have an account? 
              <button onclick="window.app.setAuthMode('login')" style="background:none;border:none;color:var(--primary);font-weight:600;cursor:pointer;text-decoration:underline;">
                Log In
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.authMode === 'login') {
      return `
        <div class="auth-container">
          <div class="auth-header">
            <div class="ch-logo-mark lg">CH</div>
            <h1 class="auth-title">Welcome Back</h1>
            <p class="auth-subtitle">Log in to your CampusHub account to continue.</p>
          </div>

          <div class="auth-card">
            <form id="login-form" onsubmit="window.app.handleLogin(event)">
              <div class="form-group">
                <label class="form-label">College Email ID</label>
                <input type="email" id="li-email" class="form-input" placeholder="e.g. shiv.patel@svitvasad.ac.in" pattern=".*@svitvasad\.ac\.in" required />
                <span style="font-size:10.5px;color:var(--primary);font-weight:500;">Only @svitvasad.ac.in emails accepted</span>
              </div>

              <div class="form-group" style="margin-top:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <label class="form-label">Password</label>
                  <button type="button" onclick="window.app.setAuthMode('forgot_email')" style="background:none;border:none;font-size:11.5px;color:var(--primary);cursor:pointer;">
                    Forgot Password?
                  </button>
                </div>
                <input type="password" id="li-pass" class="form-input" placeholder="••••••••" required />
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Security CAPTCHA</label>
                <div class="captcha-box">
                  <span class="captcha-visual">${this.captchaCode}</span>
                  <button type="button" class="captcha-btn-refresh" onclick="window.app.refreshCaptcha()" title="Refresh CAPTCHA">🔄</button>
                  <input type="text" id="li-captcha" class="form-input" placeholder="Enter code" style="max-width:125px;" required />
                </div>
              </div>

              <button type="submit" class="btn-primary" style="margin-top:16px;">
                Log In to CampusHub
              </button>
            </form>

            <div style="text-align:center;margin-top:14px;font-size:13px;color:var(--text-muted);">
              Don't have an account? 
              <button onclick="window.app.setAuthMode('signup')" style="background:none;border:none;color:var(--primary);font-weight:600;cursor:pointer;text-decoration:underline;">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.authMode === 'forgot_email') {
      return `
        <div class="auth-container">
          <div class="auth-header">
            <div class="ch-logo-mark lg">CH</div>
            <h1 class="auth-title">Reset Password</h1>
            <p class="auth-subtitle">Enter your registered college email to receive a password reset OTP.</p>
          </div>

          <div class="auth-card">
            <form onsubmit="window.app.handleForgotEmail(event)">
              <div class="form-group">
                <label class="form-label">College Email ID</label>
                <input type="email" id="fp-email" class="form-input" placeholder="e.g. shiv.patel@svitvasad.ac.in" required />
              </div>

              <button type="submit" class="btn-primary" style="margin-top:16px;">
                Send Verification OTP
              </button>
            </form>

            <div style="text-align:center;margin-top:14px;">
              <button onclick="window.app.setAuthMode('login')" class="btn-outline btn-sm">
                ← Back to Log In
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.authMode === 'forgot_otp') {
      return `
        <div class="auth-container">
          <div class="auth-header">
            <div class="ch-logo-mark lg">CH</div>
            <h1 class="auth-title">Enter OTP Code</h1>
            <p class="auth-subtitle">OTP sent to <strong>${this.forgotEmail}</strong>.<br/><span style="color:var(--primary);font-weight:600;">(Demo OTP: 1234)</span></p>
          </div>

          <div class="auth-card">
            <form onsubmit="window.app.handleForgotOtp(event)">
              <div class="form-group">
                <label class="form-label">4-Digit Security OTP</label>
                <input type="text" id="fp-otp" class="form-input" placeholder="1234" maxlength="4" style="text-align:center;font-size:18px;letter-spacing:6px;font-weight:700;" required />
              </div>

              <button type="submit" class="btn-primary" style="margin-top:16px;">
                Verify OTP & Continue
              </button>
            </form>

            <div style="text-align:center;margin-top:14px;">
              <button onclick="window.app.setAuthMode('forgot_email')" class="btn-outline btn-sm">
                ← Change Email
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.authMode === 'forgot_reset') {
      return `
        <div class="auth-container">
          <div class="auth-header">
            <div class="ch-logo-mark lg">CH</div>
            <h1 class="auth-title">Set New Password</h1>
            <p class="auth-subtitle">Choose a new password for your account.</p>
          </div>

          <div class="auth-card">
            <form onsubmit="window.app.handleForgotReset(event)">
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input type="password" id="fp-newpass" class="form-input" placeholder="••••••••" required />
              </div>

              <div class="form-group" style="margin-top:10px;">
                <label class="form-label">Confirm New Password</label>
                <input type="password" id="fp-confirmpass" class="form-input" placeholder="••••••••" required />
              </div>

              <button type="submit" class="btn-primary" style="margin-top:16px;">
                Reset Password & Log In
              </button>
            </form>
          </div>
        </div>
      `;
    }

    return '';
  }

  setAuthMode(mode) {
    this.authMode = mode;
    this.refreshCaptcha();
  }

  handleRoleChange(role) {

    const group = document.getElementById('enrollment-group');
    const input = document.getElementById('su-enrollment');
    if (role === 'admin') {
      if (group) group.style.display = 'none';
      if (input) {
        input.required = false;
        input.value = '';
      }
    } else {
      if (group) group.style.display = 'flex';
      if (input) {
        input.required = true;
        input.placeholder = 'e.g. 210120111045';
      }
    }
  }

  handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('su-name')?.value;
    const email = document.getElementById('su-email')?.value;
    const role = this.selectedSignUpRole || 'student';
    const enrollment = document.getElementById('su-enrollment')?.value || '';
    const department = document.getElementById('su-dept')?.value;
    const password = document.getElementById('su-pass')?.value;
    const captcha = document.getElementById('su-captcha')?.value;

    // Validate college email domain
    const EMAIL_DOMAIN = '@svitvasad.ac.in';
    if (!email || !email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
      this.showToast(`Only college emails ending with ${EMAIL_DOMAIN} are allowed.`, 'error');
      return;
    }

    if (!captcha || captcha.toUpperCase() !== this.captchaCode.toUpperCase()) {
      this.showToast('Invalid CAPTCHA code. Please try again.', 'error');
      this.refreshCaptcha();
      return;
    }

    const res = await this.store.registerUser({
      name,
      email,
      role,
      enrollment,
      department,
      password
    });

    if (res.success) {
      this.showToast(`Account created successfully! Welcome, ${res.user.name}`, 'success');
      this.isLoggedIn = true;
      this.currentView = 'dashboard';
      this.render();
    } else {
      this.showToast(res.message, 'error');
      this.refreshCaptcha();
    }
  }

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('li-email')?.value;
    const password = document.getElementById('li-pass')?.value;
    const captcha = document.getElementById('li-captcha')?.value;

    // Validate college email domain
    const EMAIL_DOMAIN = '@svitvasad.ac.in';
    if (!email || !email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
      this.showToast(`Only college emails ending with ${EMAIL_DOMAIN} are allowed.`, 'error');
      return;
    }

    if (!captcha || captcha.toUpperCase() !== this.captchaCode.toUpperCase()) {
      this.showToast('Invalid CAPTCHA code. Please try again.', 'error');
      this.refreshCaptcha();
      return;
    }

    const res = await this.store.login(email, password);
    if (res.success) {
      this.showToast(`Welcome back, ${res.user.name}!`, 'success');
      this.isLoggedIn = true;
      this.currentView = 'dashboard';
      this.render();
    } else {
      this.showToast(res.message, 'error');
      this.refreshCaptcha();
    }
  }

  handleForgotEmail(e) {
    e.preventDefault();
    const email = document.getElementById('fp-email')?.value;
    if (!email) return;

    // Validate college email domain
    const EMAIL_DOMAIN = '@svitvasad.ac.in';
    if (!email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
      this.showToast(`Only college emails ending with ${EMAIL_DOMAIN} are allowed.`, 'error');
      return;
    }

    this.forgotEmail = email.trim();
    this.authMode = 'forgot_otp';
    this.showToast(`Verification code sent to ${this.forgotEmail}. Use 1234 for demo.`, 'info');
    this.render();
  }

  handleForgotOtp(e) {
    e.preventDefault();
    const otp = document.getElementById('fp-otp')?.value;
    if (otp === '1234' || otp === this.mockOtpCode) {
      this.authMode = 'forgot_reset';
      this.showToast('OTP verified successfully. Please set a new password.', 'success');
      this.render();
    } else {
      this.showToast('Invalid OTP. Please enter 1234.', 'error');
    }
  }

  handleForgotReset(e) {
    e.preventDefault();
    const newPass = document.getElementById('fp-newpass')?.value;
    const confirmPass = document.getElementById('fp-confirmpass')?.value;

    if (newPass !== confirmPass) {
      this.showToast('Passwords do not match. Please re-enter.', 'error');
      return;
    }

    const res = this.store.resetPassword(this.forgotEmail, newPass);
    if (res.success) {
      this.showToast('Password reset successfully! Please log in.', 'success');
      this.authMode = 'login';
      this.render();
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // --- 2. Dashboard View (Section 3 per Spec) ---
  renderDashboard() {
    const user = this.store.getCurrentUser();
    const unreadCount = this.store.getUnreadUpdatesCount();
    const pendingReqs = this.store.getReceivedRequests().length;

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <div class="ch-logo-mark">CH</div>
          <div>
            <h2 class="section-title">CampusHub</h2>
            <div class="section-subtitle">${user ? user.name : 'Student Portal'} • ${user ? user.department : 'GTU'}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="header-action-btn" onclick="window.app.navigate('updateboard')" title="Notifications / Update Board">
            🔔
            ${unreadCount > 0 ? `<span class="coral-badge-dot"></span>` : ''}
          </button>
          <button class="header-action-btn" onclick="window.app.openModal('accounts_manager')" title="Manage Accounts">
            👥
          </button>
        </div>
      </div>

      <div class="content-body">
        <!-- Welcome Hero Banner -->
        <div style="background:var(--mint-light);border:1px solid var(--mint-border);border-radius:var(--radius-lg);padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${user ? user.avatar : ''}" alt="${user ? user.name : 'User'}" class="user-avatar" style="width:48px;height:48px;" />
            <div>
              <div style="font-size:15px;font-weight:700;color:var(--text-main);">${user ? user.name : 'Welcome'}</div>
              <div style="font-size:12px;color:var(--text-muted);">${user ? user.enrollment : ''} • ${user ? user.role.toUpperCase() : ''}</div>
            </div>
          </div>
          <button class="btn-outline btn-sm" onclick="window.app.navigate('profile')">
            Profile →
          </button>
        </div>

        <!-- Quick Access Section Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">Campus Modules</span>
          <span style="font-size:11.5px;color:var(--text-muted);">Instant Access</span>
        </div>

        <!-- 6 Quick Access Tiles with Mint Icon Backgrounds -->
        <div class="dashboard-grid">
          <!-- 1. Projects Tile -->
          <div class="tile-card" onclick="window.app.navigate('projects')">
            <div class="tile-icon-box">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div>
              <div class="tile-title">Projects Showcase</div>
              <div class="tile-desc">Hardware, Software & Hybrid engineering innovations.</div>
            </div>
          </div>

          <!-- 2. Resources Tile -->
          <div class="tile-card" onclick="window.app.navigate('resources')">
            <div class="tile-icon-box">
              <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div>
              <div class="tile-title">Study Resources</div>
              <div class="tile-desc">Mid-Sem, GTU PYQs, handwritten notes & reference books.</div>
            </div>
          </div>

          <!-- 3. Collaboration Tile -->
          <div class="tile-card" onclick="window.app.navigate('collaboration')">
            <div class="tile-icon-box">
              <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2"/></svg>
            </div>
            <div>
              <div class="tile-title">Collaboration Board</div>
              <div class="tile-desc">Post teammate requirements and connect on projects.</div>
            </div>
          </div>

          <!-- 4. Update Board Tile -->
          <div class="tile-card" onclick="window.app.navigate('updateboard')">
            <div class="tile-icon-box" style="position:relative;">
              <svg viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${unreadCount > 0 ? `<span class="coral-badge-dot" style="top:2px;right:2px;"></span>` : ''}
            </div>
            <div>
              <div class="tile-title">Update Board</div>
              <div class="tile-desc">Hackathons, workshops & official campus notifications.</div>
            </div>
          </div>

          <!-- 5. Requests & Chat Tile -->
          <div class="tile-card" onclick="window.app.navigate('requests')">
            <div class="tile-icon-box" style="position:relative;">
              <svg viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/></svg>
              ${pendingReqs > 0 ? `<span class="coral-badge-count" style="top:-2px;right:-2px;">${pendingReqs}</span>` : ''}
            </div>
            <div>
              <div class="tile-title">Requests & Chat</div>
              <div class="tile-desc">Incoming collaboration invites and 1:1 WhatsApp chats.</div>
            </div>
          </div>

          <!-- 6. Profile Tile -->
          <div class="tile-card" onclick="window.app.navigate('profile')">
            <div class="tile-icon-box">
              <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
            </div>
            <div>
              <div class="tile-title">Student Profile</div>
              <div class="tile-desc">Custom skill tags, bio and showcased portfolio grid.</div>
            </div>
          </div>
        </div>

        <!-- Recent Campus Update Card (Instagram Feed Preview) -->
        <div style="margin-top:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">Latest Campus Notice</span>
            <button onclick="window.app.navigate('updateboard')" style="background:none;border:none;color:var(--primary);font-size:12px;font-weight:600;cursor:pointer;">See Feed →</button>
          </div>
          ${this.renderUpdatePreviewCard()}
        </div>
      </div>
    `;
  }

  renderUpdatePreviewCard() {
    const updates = this.store.getUpdates();
    if (!updates || updates.length === 0) {
      return `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12.5px;background:var(--surface-alt);border-radius:var(--radius-md);">No campus updates posted yet.</div>`;
    }

    const latest = updates[0];
    return `
      <div class="collab-card" style="border-left:3.5px solid var(--primary);cursor:pointer;" onclick="window.app.navigate('updateboard')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;font-weight:600;color:var(--primary);background:var(--mint);padding:2px 8px;border-radius:var(--radius-full);">${latest.category}</span>
          <span style="font-size:11px;color:var(--text-muted);">${latest.timestamp}</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--text-main);">${latest.title}</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.35;">${latest.message.slice(0, 120)}...</div>
      </div>
    `;
  }

  // --- 3. Projects Module (Section 4 per Spec) ---
  renderProjects() {
    const isAdmin = this.store.isAdmin();
    const projects = this.store.getProjects(this.currentProjectTab);
    const tabs = ['Hardware', 'Software', 'Hybrid', 'All'];

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('dashboard')" title="Back to Home">←</button>
          <div>
            <h2 class="section-title">Projects</h2>
            <div class="section-subtitle">Student innovations & capstone builds</div>
          </div>
        </div>
        ${isAdmin ? `
          <button class="btn-primary btn-sm" onclick="window.app.openModal('upload_project')" style="padding:6px 12px;font-size:12px;">
            + Upload Project
          </button>
        ` : ''}
      </div>

      <div class="content-body">
        <!-- 4 Tabs Segmented Control -->
        <div class="tab-segmented">
          ${tabs.map(tab => `
            <button class="tab-btn ${this.currentProjectTab === tab ? 'active' : ''}" onclick="window.app.setProjectTab('${tab}')">
              ${tab}
            </button>
          `).join('')}
        </div>

        <!-- Project Cards List / Grid -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${projects.length === 0 ? `
            <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">
              No projects found in this category.
            </div>
          ` : projects.map(p => `
            <div class="project-card">
              <div class="project-img-box">
                <img src="${p.image}" alt="${p.name}" class="project-img" loading="lazy" />
                <span class="project-badge">${p.category}</span>
              </div>
              <div class="project-body">
                <h3 class="project-title">${p.name}</h3>
                <p class="project-desc">${p.description}</p>
                <div class="project-meta-box">
                  <span class="project-meta-label">Components & Stack:</span>
                  <span>${p.components}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11.5px;color:var(--text-muted);">
                  <span>By ${p.author} (${p.authorDept || 'Engineering'})</span>

                  <button class="btn-outline btn-sm" onclick='window.app.openModal("project_details", ${JSON.stringify(p).replace(/'/g, "&apos;")})'>
                    Details
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setProjectTab(tab) {
    this.currentProjectTab = tab;
    this.render();
  }

  // --- 4. Resources Module (Section 5 per Spec) ---
  renderResources() {
    const isAdmin = this.store.isAdmin();
    const categories = [
      { name: 'Mid-Sem Papers', desc: 'Solved mid-semester exam question papers', icon: '📝', count: 3 },
      { name: 'GTU PYQs', desc: 'University previous year 70-mark papers', icon: '🎓', count: 3 },
      { name: 'Handwritten Notes', desc: 'Topper classroom notes & summary guides', icon: '✍️', count: 2 },
      { name: 'Reference Books', desc: 'Core textbook PDFs and reference chapters', icon: '📚', count: 2 }
    ];

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('dashboard')" title="Back to Home">←</button>
          <div>
            <h2 class="section-title">Academic Resources</h2>
            <div class="section-subtitle">GTU papers, notes & reference material</div>
          </div>
        </div>
        ${isAdmin ? `
          <button class="btn-primary btn-sm" onclick="window.app.openModal('upload_resource')" style="padding:6px 12px;font-size:12px;">
            + Upload Resource
          </button>
        ` : ''}
      </div>

      <div class="content-body">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:2px;">
          Select a category to view and open study resources:
        </div>

        <!-- 4 Category Grid -->
        <div class="resource-cat-grid">
          ${categories.map(cat => `
            <div class="resource-cat-card" onclick="window.app.navigate('resource_sub', { resourceCategory: '${cat.name}' })">
              <span style="font-size:24px;">${cat.icon}</span>
              <div>
                <div style="font-size:14px;font-weight:700;color:var(--text-main);">${cat.name}</div>
                <div style="font-size:11.5px;color:var(--text-muted);line-height:1.35;margin-top:2px;">${cat.desc}</div>
              </div>
              <span style="font-size:11px;font-weight:600;color:var(--primary);margin-top:auto;">View Table →</span>
            </div>
          `).join('')}
        </div>

        <!-- Quick Subject Table preview of selected category -->
        <div style="margin-top:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">${this.currentResourceCategory}</span>
            <span style="font-size:11px;color:var(--text-muted);">Open Access Enabled</span>
          </div>
          ${this.renderResourceTable(this.currentResourceCategory)}
        </div>
      </div>
    `;
  }

  renderResourceSubTable() {
    const isAdmin = this.store.isAdmin();
    const categories = ['Mid-Sem Papers', 'GTU PYQs', 'Handwritten Notes', 'Reference Books'];

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('resources')" title="Back to Resources">←</button>
          <div>
            <h2 class="section-title">${this.currentResourceCategory}</h2>
            <div class="section-subtitle">Academic resource table with Open Access</div>
          </div>
        </div>
        ${isAdmin ? `
          <button class="btn-primary btn-sm" onclick="window.app.openModal('upload_resource')" style="padding:6px 12px;font-size:12px;">
            + Upload
          </button>
        ` : ''}
      </div>

      <div class="content-body">
        <!-- Category Segmented Switcher -->
        <div class="tab-segmented" style="overflow-x:auto;">
          ${categories.map(c => `
            <button class="tab-btn ${this.currentResourceCategory === c ? 'active' : ''}" onclick="window.app.switchResourceCategory('${c}')">
              ${c}
            </button>
          `).join('')}
        </div>

        <div style="margin-top:8px;">
          ${this.renderResourceTable(this.currentResourceCategory)}
        </div>
      </div>
    `;
  }

  switchResourceCategory(cat) {
    this.currentResourceCategory = cat;
    this.render();
  }

  renderResourceTable(category) {
    const list = this.store.getResources(category);
    const isAdmin = this.store.isAdmin();

    if (list.length === 0) {
      return `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12.5px;">No resources uploaded for this category.</div>`;
    }

    return `
      <div class="resource-table-container">
        <table class="resource-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Code</th>
              <th>Semester</th>
              <th>Year</th>
              <th style="text-align:center;">Open Access</th>
              ${isAdmin ? `<th style="text-align:center;width:40px;">Admin</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${list.map(r => `
              <tr>
                <td style="font-weight:600;">
                  ${r.subjectName}
                  ${r.fileData ? `<span style="display:inline-block;font-size:9.5px;background:var(--mint);color:var(--primary);padding:1px 6px;border-radius:4px;margin-left:4px;font-weight:600;vertical-align:middle;">PDF</span>` : ''}
                </td>
                <td><code style="background:var(--mint);color:var(--primary);padding:2px 5px;border-radius:4px;font-size:11px;">${r.subjectCode}</code></td>
                <td>${r.semester}</td>
                <td>${r.year}</td>

                <td style="text-align:center;">
                  <button class="btn-secondary btn-sm" onclick='window.app.openModal("pdf_viewer", ${JSON.stringify(r).replace(/'/g, "&apos;")})' style="padding:4px 10px;font-size:11px;">
                    📄 Open
                  </button>
                </td>
                ${isAdmin ? `
                  <td style="text-align:center;">
                    <button class="btn-outline btn-sm" onclick="if(confirm('Delete resource ${r.subjectName}?')){window.app.handleDeleteResource('${r.id}');}" style="color:#DC2626;padding:3px 7px;font-size:11px;" title="Delete Resource">
                      🗑
                    </button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- 5. Collaboration Module (Section 6 per Spec) ---
  renderCollaboration() {
    const posts = this.store.getCollabPosts();
    const currentUser = this.store.getCurrentUser();

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('dashboard')" title="Back to Home">←</button>
          <div>
            <h2 class="section-title">Collaboration Board</h2>
            <div class="section-subtitle">Find teammates & capstone partners</div>
          </div>
        </div>
        <button class="btn-primary btn-sm" onclick="window.app.openModal('add_collab_post')" style="padding:6px 12px;font-size:12px;">
          + Add Post
        </button>
      </div>

      <div class="content-body">
        <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:2px;">
          Looking for collaborators? Post your requirements or request to join an active team.
        </div>

        <!-- Post Feed (Instagram/Card Style) -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${posts.length === 0 ? `
            <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">
              No collaboration posts available yet. Be the first to add one!
            </div>
          ` : posts.map(post => {
            const isMyPost = currentUser && post.authorId === currentUser.id;
            return `
              <div class="collab-card">
                <div class="collab-header">
                  <img src="${post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" alt="${post.authorName}" class="user-avatar" />
                  <div class="collab-user-info">
                    <div class="collab-user-name">${post.authorName} ${isMyPost ? '<span style="font-size:10px;background:var(--mint);color:var(--primary);padding:1px 6px;border-radius:4px;margin-left:4px;">You</span>' : ''}</div>
                    <div class="collab-user-dept">posted by ${post.authorName} • ${post.authorDept || 'Engineering'} • ${post.timestamp}</div>
                  </div>
                </div>

                <div class="collab-role-tag">
                  🎯 Needs: ${post.roleNeeded}
                </div>

                <div style="font-size:14.5px;font-weight:700;color:var(--text-main);">${post.title}</div>
                <div style="font-size:13px;color:var(--text-muted);line-height:1.4;">${post.description}</div>

                <div class="skills-wrap">
                  ${(post.tags || []).map(t => `<span class="skill-pill" style="background:var(--mint);color:var(--primary);font-size:11px;border:1px solid var(--mint-border);">${t}</span>`).join('')}
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;border-top:1px solid var(--border-light);padding-top:10px;">
                  <span style="font-size:11.5px;color:var(--text-muted);">${post.requestsCount || 0} Request(s)</span>
                  ${isMyPost ? `
                    <span style="font-size:12px;color:var(--primary);font-weight:600;">Your active post</span>

                  ` : `
                    <button class="btn-primary btn-sm" onclick='window.app.openModal("send_request", ${JSON.stringify(post).replace(/'/g, "&apos;")})'>
                      Request to Join →
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // --- 6. Update Board Module (Section 7 per Spec) ---
  renderUpdateBoard() {
    const isAdmin = this.store.isAdmin();
    const updates = this.store.getUpdates();

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('dashboard')" title="Back to Home">←</button>
          <div>
            <h2 class="section-title">Update Board</h2>
            <div class="section-subtitle">Official campus announcements & events</div>
          </div>
        </div>
        ${isAdmin ? `
          <button class="btn-primary btn-sm" onclick="window.app.openModal('post_update')" style="padding:6px 12px;font-size:12px;">
            + Post Update
          </button>
        ` : ''}
      </div>

      <div class="content-body">
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${updates.length === 0 ? `
            <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">
              No updates posted yet.
            </div>
          ` : updates.map(u => `
            <div class="collab-card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span class="role-badge admin" style="font-size:10.5px;">${u.author}</span>
                  <span style="font-size:11px;background:var(--mint);color:var(--primary);padding:2px 8px;border-radius:var(--radius-full);font-weight:600;">${u.category}</span>
                </div>
                <span style="font-size:11.5px;color:var(--text-muted);">${u.timestamp}</span>
              </div>

              <h3 style="font-size:15px;font-weight:700;color:var(--text-main);margin-top:2px;">${u.title}</h3>
              <p style="font-size:13px;color:var(--text-main);line-height:1.45;">${u.message}</p>

              ${u.image ? `
                <div style="width:100%;max-height:220px;border-radius:var(--radius-md);overflow:hidden;margin-top:4px;">
                  <img src="${u.image}" alt="${u.title}" style="width:100%;height:100%;object-fit:cover;" />
                </div>
              ` : ''}

              ${u.link ? `
                <div style="margin-top:4px;">
                  <a href="${u.link}" target="_blank" rel="noreferrer" class="btn-outline btn-sm" style="display:inline-flex;text-decoration:none;">
                    Official Link / Portal ↗
                  </a>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 7. Profile Module (Section 8 per Spec) ---
  renderProfile() {
    const user = this.store.getCurrentUser();
    if (!user) return ``;

    const skills = user.skills || [];
    const myProjects = this.store.getProjects('All').filter(p => p.author.toLowerCase().includes(user.name.toLowerCase()));

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('dashboard')" title="Back to Home">←</button>
          <div>
            <h2 class="section-title">Profile</h2>
            <div class="section-subtitle">${user.role === 'admin' ? 'Faculty Admin' : 'Student'} Profile</div>
          </div>
        </div>
        <button class="btn-outline btn-sm" onclick="window.app.openModal('edit_profile')">
          Edit Profile
        </button>
      </div>


      <div class="app-screen">
        <!-- Centered Profile Header on Mint Band -->
        <div class="profile-hero">
          <div class="profile-avatar-wrap">
            <img src="${user.avatar}" alt="${user.name}" class="user-avatar lg" />
          </div>
          <h2 class="profile-name">${user.name}</h2>
          <div class="profile-meta-text">Enrollment: <strong>${user.enrollment}</strong></div>
          <div class="profile-meta-text">Department: <strong>${user.department}</strong> (${user.semester || 'Semester 6'})</div>
          <span class="role-badge ${user.role === 'admin' ? 'admin' : ''}" style="margin-top:2px;">
            ${user.role === 'admin' ? '👑 Admin / Faculty' : '🎓 Verified Student'}
          </span>
          <p style="font-size:12.5px;color:var(--text-muted);max-width:320px;margin-top:4px;line-height:1.35;">${user.bio || 'GTU Engineering Student'}</p>
        </div>

        <div class="content-body">
          <!-- Skills Section with Chips Manager -->
          <div class="collab-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">Skills & Expertise</span>
              <span style="font-size:11px;color:var(--text-muted);">${skills.length} Skill Tags</span>
            </div>

            <div class="skills-wrap" id="profile-skills-list">
              ${skills.length === 0 ? `
                <span style="font-size:12px;color:var(--text-muted);">No skills added yet. Add some below!</span>
              ` : skills.map(skill => `
                <span class="skill-pill removable">
                  ${skill}
                  <button class="skill-delete-btn" onclick="window.app.handleRemoveSkill('${skill}')" title="Remove skill">×</button>
                </span>
              `).join('')}
            </div>

            <!-- Add Skill Input -->
            <form onsubmit="window.app.handleAddSkill(event)" style="display:flex;gap:8px;margin-top:6px;">
              <input type="text" id="new-skill-input" class="form-input" placeholder="e.g. React.js, Arduino, UI/UX" style="padding:6px 10px;font-size:12px;" required />
              <button type="submit" class="btn-primary btn-sm" style="white-space:nowrap;">
                + Add Tag
              </button>
            </form>
          </div>

          <!-- Showcased Projects Grid (Instagram Grid Style) -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <h3 class="profile-grid-header">Showcased Projects</h3>
              <button class="btn-outline btn-sm" onclick="window.app.navigate('projects')" style="font-size:11.5px;">
                Explore All →
              </button>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;">
              ${myProjects.length === 0 ? `
                <div style="text-align:center;padding:24px;background:var(--surface-alt);border-radius:var(--radius-md);color:var(--text-muted);font-size:12px;">
                  No projects showcased under this account yet.
                </div>
              ` : myProjects.map(p => `
                <div class="project-card" style="border:1px solid var(--mint-border);">
                  <div class="project-body" style="padding:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                      <h4 style="font-size:13.5px;font-weight:700;color:var(--text-main);">${p.name}</h4>
                      <span class="project-badge" style="position:static;font-size:10px;">${p.category}</span>
                    </div>
                    <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">${p.description.slice(0, 95)}...</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Logout Button -->
          <div style="text-align:center;margin-top:10px;">
            <button class="btn-outline btn-sm" onclick="window.app.handleLogout()" style="color:#DC2626;border-color:#FCA5A5;">
              Log Out of Account
            </button>
          </div>
        </div>

      </div>
    `;
  }

  handleAddSkill(e) {
    e.preventDefault();
    const input = document.getElementById('new-skill-input');
    if (!input || !input.value.trim()) return;

    this.store.addSkill(input.value.trim());
    input.value = '';
    this.showToast('Skill tag added!', 'success');
  }

  handleRemoveSkill(skill) {
    this.store.removeSkill(skill);
    this.showToast(`Removed skill tag: ${skill}`, 'info');
  }

  handleLogout() {
    this.store.logout();
    this.isLoggedIn = false;
    this.currentView = 'auth';
    this.authMode = 'login';
    this.showToast('Logged out successfully.', 'info');
    this.render();
  }

  // --- 8. Requests Module (Section 9 per Spec) ---
  renderRequests() {
    const sentReqs = this.store.getSentRequests();
    const receivedReqs = this.store.getReceivedRequests();
    const acceptedConnections = this.store.getAcceptedConnections();
    const currentUser = this.store.getCurrentUser();

    return `
      <!-- Mint Header Band (#E1F5EE) -->
      <div class="section-header-band">
        <div class="section-header-info">
          <button class="header-action-btn" onclick="window.app.navigate('dashboard')" title="Back to Home">←</button>
          <div>
            <h2 class="section-title">Requests & Connections</h2>
            <div class="section-subtitle">Peer collaboration invites & active chats</div>
          </div>
        </div>
        <button class="btn-outline btn-sm" onclick="window.app.navigate('collaboration')">
          + Explore Posts
        </button>
      </div>

      <div class="content-body">
        <!-- 1. Received Requests (Pending with Accept / Decline) -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">Incoming Requests (${receivedReqs.length})</span>
            <span style="font-size:11px;color:var(--text-muted);">Action Required</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            ${receivedReqs.length === 0 ? `
              <div style="text-align:center;padding:20px;background:var(--surface-alt);border-radius:var(--radius-md);color:var(--text-muted);font-size:12px;">
                No pending incoming collaboration requests.
              </div>
            ` : receivedReqs.map(req => `
              <div class="request-card pending">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${req.fromUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" alt="${req.fromUser.name}" class="user-avatar" />
                  <div style="flex:1;">
                    <div style="font-size:13.5px;font-weight:700;color:var(--text-main);">${req.fromUser.name}</div>
                    <div style="font-size:11.5px;color:var(--text-muted);">${req.fromUser.department || 'Engineering'} • ${req.fromUser.enrollment}</div>
                  </div>
                  <span style="font-size:11px;color:var(--text-muted);">${req.timestamp}</span>
                </div>

                <div style="font-size:12.5px;font-weight:600;color:var(--primary);">${req.title}</div>
                <div style="font-size:12.5px;color:var(--text-muted);background:var(--mint-light);padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--mint-border);line-height:1.35;">
                  "${req.note}"
                </div>

                <div class="request-actions" style="margin-top:4px;">
                  <button class="btn-primary btn-sm" onclick="window.app.handleAcceptRequest('${req.id}')" style="flex:1;">
                    ✓ Accept & Unlock Chat
                  </button>
                  <button class="btn-outline btn-sm" onclick="window.app.handleDeclineRequest('${req.id}')" style="flex:1;color:#DC2626;">
                    ✕ Decline
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 2. Sent Requests (Pending) -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">Sent Requests (Pending: ${sentReqs.length})</span>
            <span style="font-size:11px;color:var(--text-muted);">Awaiting Peer Response</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            ${sentReqs.length === 0 ? `
              <div style="text-align:center;padding:16px;background:var(--surface-alt);border-radius:var(--radius-md);color:var(--text-muted);font-size:12px;">
                You haven't sent any pending requests.
              </div>
            ` : sentReqs.map(req => `
              <div class="request-card" style="border-left:3.5px solid #F59E0B;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;font-weight:700;color:var(--text-main);">${req.title}</span>
                  <span style="font-size:11px;background:#FEF3C7;color:#D97706;padding:2px 7px;border-radius:var(--radius-full);font-weight:600;">Pending</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);">To: <strong>${req.toUser.name}</strong> (${req.toUser.department || 'Engineering'})</div>
                <div style="font-size:11.5px;color:var(--text-muted);font-style:italic;">"${req.note}"</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 3. Accepted Connections / Active Collaborations -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13.5px;font-weight:700;color:var(--text-main);font-family:'Space Grotesk',sans-serif;">Active Collaborations & Chats (${acceptedConnections.length})</span>
            <span style="font-size:11px;color:var(--primary);font-weight:600;">WhatsApp 1:1 Chat</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            ${acceptedConnections.length === 0 ? `
              <div style="text-align:center;padding:20px;background:var(--surface-alt);border-radius:var(--radius-md);color:var(--text-muted);font-size:12px;">
                No accepted connections yet. Accept a request or send one from Collaboration board!
              </div>
            ` : acceptedConnections.map(conn => {
              const peer = (currentUser && conn.fromUser.id === currentUser.id) ? conn.toUser : conn.fromUser;
              return `
                <div class="request-card accepted">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <img src="${peer.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'}" alt="${peer.name}" class="user-avatar" />
                      <div>
                        <div style="font-size:13.5px;font-weight:700;color:var(--text-main);">${peer.name}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);">${peer.department || 'Engineering'} • Connected</div>
                      </div>
                    </div>
                    <button class="btn-primary btn-sm" onclick="window.app.openModal('chat_modal', '${peer.id}')" style="padding:6px 14px;font-size:12px;">
                      💬 Chat
                    </button>
                  </div>
                  <div style="font-size:11.5px;color:var(--primary);margin-top:2px;">Project: ${conn.title}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  handleAcceptRequest(requestId) {
    const ok = this.store.acceptRequest(requestId);
    if (ok) {
      this.showToast('Collaboration request accepted! 1:1 Chat unlocked.', 'success');
    }
  }

  handleDeclineRequest(requestId) {
    const ok = this.store.declineRequest(requestId);
    if (ok) {
      this.showToast('Request declined and removed.', 'info');
    }
  }

  // --- Bottom Navigation Bar (5 Tabs per Section 1) ---
  renderBottomNav() {
    const current = this.currentView;
    const unreadUpdates = this.store.getUnreadUpdatesCount();
    const pendingReqs = this.store.getReceivedRequests().length;

    return `
      <nav class="bottom-nav">
        <!-- 1. Home -->
        <button class="nav-item ${current === 'dashboard' ? 'active' : ''}" onclick="window.app.navigate('dashboard')">
          <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </button>

        <!-- 2. Projects -->
        <button class="nav-item ${current === 'projects' ? 'active' : ''}" onclick="window.app.navigate('projects')">
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          <span>Projects</span>
        </button>

        <!-- 3. Collaboration -->
        <button class="nav-item ${current === 'collaboration' ? 'active' : ''}" onclick="window.app.navigate('collaboration')">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Collab</span>
        </button>

        <!-- 4. Requests -->
        <button class="nav-item ${current === 'requests' ? 'active' : ''}" onclick="window.app.navigate('requests')">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${pendingReqs > 0 ? `<span class="nav-badge"></span>` : ''}
          <span>Requests</span>
        </button>

        <!-- 5. Profile -->
        <button class="nav-item ${current === 'profile' ? 'active' : ''}" onclick="window.app.navigate('profile')">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </button>
      </nav>
    `;
  }

  // ==========================================
  // MODALS & DIALOGS
  // ==========================================

  renderModal() {
    switch (this.activeModal) {
      case 'upload_project':
        return this.renderUploadProjectModal();
      case 'project_details':
        return this.renderProjectDetailsModal();
      case 'upload_resource':
        return this.renderUploadResourceModal();
      case 'pdf_viewer':
        return this.renderPdfViewerModal();
      case 'add_collab_post':
        return this.renderAddCollabPostModal();
      case 'send_request':
        return this.renderSendRequestModal();
      case 'post_update':
        return this.renderPostUpdateModal();
      case 'edit_profile':
        return this.renderEditProfileModal();
      case 'chat_modal':
        return this.renderChatModal();
      case 'accounts_manager':
        return this.renderAccountsManagerModal();
      default:
        return '';
    }
  }

  // --- Modal: Upload Project (Admin only) ---
  renderUploadProjectModal() {
    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Upload Engineering Project</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <form onsubmit="window.app.handleUploadProjectSubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Project Name</label>
                <input type="text" id="up-name" class="form-input" placeholder="e.g. Solar-Powered Autonomous Boat" required />
              </div>
              <div class="form-group">
                <label class="form-label">Category Tab</label>
                <select id="up-cat" class="form-select">
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Project Image (URL or Preview)</label>
                <input type="url" id="up-img" class="form-input" value="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" required />
              </div>
              <div class="form-group">
                <label class="form-label">Components & Technologies Used</label>
                <input type="text" id="up-comp" class="form-input" placeholder="e.g. ESP32, Solar MPPT Controller, React, Firebase" required />
              </div>
              <div class="form-group">
                <label class="form-label">Detailed Description</label>
                <textarea id="up-desc" class="form-textarea" placeholder="Describe the problem, engineering design, and impact..." required></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-outline btn-sm" onclick="window.app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" style="width:auto;">Submit Project</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  handleUploadProjectSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('up-name')?.value;
    const category = document.getElementById('up-cat')?.value;
    const image = document.getElementById('up-img')?.value;
    const components = document.getElementById('up-comp')?.value;
    const description = document.getElementById('up-desc')?.value;

    const res = this.store.addProject({
      name,
      category,
      image,
      components,
      description
    });

    if (res.success) {
      this.showToast('Project uploaded successfully and published to all users!', 'success');
      this.closeModal();
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // --- Modal: Project Details ---
  renderProjectDetailsModal() {
    const p = this.modalData;
    if (!p) return '';

    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog lg">
          <div class="modal-header">
            <h3 class="modal-title">${p.name}</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div style="width:100%;height:220px;border-radius:var(--radius-md);overflow:hidden;">
              <img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="project-badge" style="position:static;">${p.category}</span>
              <span style="font-size:12px;color:var(--text-muted);">Author: <strong>${p.author}</strong> (${p.authorDept || 'Engineering'})</span>
            </div>
            <div>
              <h4 style="font-size:13.5px;font-weight:700;color:var(--text-main);margin-bottom:4px;">Project Overview</h4>
              <p style="font-size:13px;color:var(--text-main);line-height:1.45;">${p.description}</p>
            </div>
            <div class="project-meta-box">
              <span class="project-meta-label">Components & Hardware Specifications:</span>
              <span>${p.components}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-outline btn-sm" onclick="window.app.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  // --- Modal: Upload Resource (Admin only with Real PDF File Drag & Drop) ---
  renderUploadResourceModal() {
    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Upload Study Resource (PDF)</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <form onsubmit="window.app.handleUploadResourceSubmit(event)">
            <div class="modal-body">
              <!-- PDF File Upload Zone -->
              <div class="form-group">
                <label class="form-label">Attach PDF File</label>
                <div class="pdf-dropzone" id="pdf-dropzone" onclick="document.getElementById('ur-file').click()" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="window.app.handlePdfDrop(event)">
                  <div class="pdf-dropzone-icon">📄</div>
                  <div style="font-size:13px;font-weight:600;color:var(--text-main);">Click to browse or drag & drop PDF here</div>
                  <div style="font-size:11px;color:var(--text-muted);">PDF files up to 15MB • Solved papers, notes, textbooks</div>
                </div>
                <input type="file" id="ur-file" accept="application/pdf,.pdf" style="display:none;" onchange="window.app.handlePdfFileSelect(event)" />
                <div id="pdf-selected-preview">
                  ${this.pendingPdfFile ? `
                    <div class="pdf-file-selected-badge">
                      <div class="pdf-file-selected-info">
                        <span>📄</span>
                        <span>${this.pendingPdfFile.name} (${this.pendingPdfFile.sizeFormatted})</span>
                      </div>
                      <button type="button" class="btn-outline btn-sm" onclick="window.app.removePendingPdf(event)" style="color:#DC2626;padding:2px 8px;font-size:11px;">✕ Remove</button>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="ur-cat" class="form-select">
                  <option value="Mid-Sem Papers" ${this.currentResourceCategory === 'Mid-Sem Papers' ? 'selected' : ''}>Mid-Sem Papers</option>
                  <option value="GTU PYQs" ${this.currentResourceCategory === 'GTU PYQs' ? 'selected' : ''}>GTU PYQs</option>
                  <option value="Handwritten Notes" ${this.currentResourceCategory === 'Handwritten Notes' ? 'selected' : ''}>Handwritten Notes</option>
                  <option value="Reference Books" ${this.currentResourceCategory === 'Reference Books' ? 'selected' : ''}>Reference Books</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Subject Name</label>
                <input type="text" id="ur-sub" class="form-input" placeholder="e.g. Advanced Java Programming" value="${this.pendingPdfFile?.suggestedSubject || ''}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Subject Code</label>
                <input type="text" id="ur-code" class="form-input" placeholder="e.g. 3160707" required />
              </div>

              <div class="form-group">
                <label class="form-label">Semester</label>
                <select id="ur-sem" class="form-select">
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5" selected>Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                  <option value="All Semesters">All Semesters</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Year / Exam Session</label>
                <input type="text" id="ur-year" class="form-input" placeholder="e.g. Winter 2025" value="2026" required />
              </div>

              <div class="form-group">
                <label class="form-label">Resource Summary</label>
                <textarea id="ur-sum" class="form-textarea" placeholder="Key topics covered, syllabus notes, model answers..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-outline btn-sm" onclick="window.app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" style="width:auto;">Publish Resource</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  handlePdfFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    this.processPdfFile(file);
  }

  handlePdfDrop(e) {
    e.preventDefault();
    const dropzone = document.getElementById('pdf-dropzone');
    if (dropzone) dropzone.classList.remove('dragover');

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    this.processPdfFile(file);
  }

  processPdfFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      this.showToast('Please select a valid .pdf file.', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.showToast('PDF file size must be less than 15MB.', 'error');
      return;
    }

    const sizeFormatted = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : (file.size / 1024).toFixed(0) + ' KB';

    // Auto clean filename for suggested subject
    const rawName = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      this.pendingPdfFile = {
        file: file,
        name: file.name,
        sizeFormatted: sizeFormatted,
        dataUrl: loadEvent.target.result,
        suggestedSubject: rawName
      };

      const subInput = document.getElementById('ur-sub');
      if (subInput && !subInput.value.trim()) {
        subInput.value = rawName;
      }

      this.render();
      this.showToast(`Attached PDF: ${file.name} (${sizeFormatted})`, 'success');
    };
    reader.readAsDataURL(file);
  }

  removePendingPdf(e) {
    if (e) e.stopPropagation();
    this.pendingPdfFile = null;
    this.render();
  }

  handleDeleteResource(resourceId) {

    const ok = this.store.deleteResource(resourceId);
    if (ok) {
      this.showToast('Academic resource removed successfully.', 'info');
      this.render();
    }
  }

  handleUploadResourceSubmit(e) {
    e.preventDefault();
    const category = document.getElementById('ur-cat')?.value;
    const subjectName = document.getElementById('ur-sub')?.value;
    const subjectCode = document.getElementById('ur-code')?.value;
    const semester = document.getElementById('ur-sem')?.value;
    const year = document.getElementById('ur-year')?.value;
    const summary = document.getElementById('ur-sum')?.value;

    const fileName = this.pendingPdfFile ? this.pendingPdfFile.name : `${subjectCode}_Academic_Paper.pdf`;
    const fileSize = this.pendingPdfFile ? this.pendingPdfFile.sizeFormatted : '2.8 MB';
    const fileData = this.pendingPdfFile ? this.pendingPdfFile.dataUrl : null;

    const res = this.store.addResource({
      category,
      subjectName,
      subjectCode,
      semester,
      year,
      summary,
      fileName,
      fileSize,
      fileData
    });

    if (res.success) {
      this.pendingPdfFile = null;
      this.showToast('PDF Resource published and available under Open Access!', 'success');
      this.closeModal();
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // --- Modal: Interactive Document / PDF Viewer (Open Access) ---
  renderPdfViewerModal() {
    const r = this.modalData;
    if (!r) return '';
    const isAdmin = this.store.isAdmin();

    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog lg" style="max-height:94vh;">
          <!-- Viewer Top Bar -->
          <div class="modal-header" style="background:var(--primary);color:#FFFFFF;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">📄</span>
              <div>
                <h3 class="modal-title" style="color:#FFFFFF;font-size:14px;">${r.subjectName}</h3>
                <div style="font-size:11px;opacity:0.85;">${r.subjectCode} • ${r.category} • ${r.year}</div>
              </div>
            </div>
            <button class="modal-close-btn" onclick="window.app.closeModal()" style="color:#FFFFFF;">✕</button>
          </div>

          <!-- Document Render Area -->
          <div class="modal-body" style="background:#525659;padding:12px;overflow-y:auto;max-height:68vh;">
            ${r.fileData ? `
              <!-- Real Embedded PDF Frame -->
              <div style="background:#FFFFFF;border-radius:6px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.3);min-height:540px;display:flex;flex-direction:column;">
                <iframe src="${r.fileData}#toolbar=1" width="100%" height="540px" style="border:none;flex:1;min-height:540px;" title="${r.subjectName}"></iframe>
              </div>
            ` : `
              <!-- High-Fidelity GTU Exam Sheet Simulation -->
              <div style="background:#FFFFFF;border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,0.3);padding:30px 24px;min-height:480px;display:flex;flex-direction:column;gap:14px;color:#111;">
                
                <!-- PDF Header Simulation -->
                <div style="border-bottom:2px solid #111;padding-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:16px;font-weight:700;letter-spacing:-0.3px;">GUJARAT TECHNOLOGICAL UNIVERSITY</div>
                    <div style="font-size:12px;font-weight:600;color:#444;">ACADEMIC REPOSITORY & EXAMINATION PORTAL</div>
                  </div>
                  <div style="text-align:right;font-size:11.5px;color:#555;">
                    <div>Code: <strong>${r.subjectCode}</strong></div>
                    <div>${r.semester}</div>
                  </div>
                </div>

                <!-- Document Title & Meta -->
                <div style="text-align:center;padding:8px 0;">
                  <h2 style="font-size:17px;font-weight:800;color:var(--primary);">${r.subjectName}</h2>
                  <div style="font-size:12.5px;color:#555;margin-top:2px;">Official Document • ${r.category} (${r.year})</div>
                </div>

                <!-- Synopsis / Question Paper Excerpt -->
                <div style="background:#F9FBFB;border:1px solid #E1E8E5;border-radius:6px;padding:14px;font-size:13px;line-height:1.5;">
                  <div style="font-weight:700;color:#222;margin-bottom:6px;">Document Summary & Key Topics:</div>
                  <p style="color:#444;">${r.summary || 'Official GTU course curriculum examination questions, detailed marking rubrics, and solved solutions for student revision.'}</p>
                </div>

                <!-- Sample Rendered Paper Questions -->
                <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;font-size:13px;">
                  <div style="border-left:3px solid var(--primary);padding-left:10px;">
                    <strong>Q1 [7 Marks]:</strong> Explain the core architecture, time complexity bounds, and working mechanism of ${r.subjectName}. Illustrate with relevant block diagram.
                  </div>
                  <div style="border-left:3px solid var(--primary);padding-left:10px;">
                    <strong>Q2 [7 Marks]:</strong> Differentiate between synchronous and asynchronous implementation methodologies with practical engineering use-cases.
                  </div>
                  <div style="border-left:3px solid var(--primary);padding-left:10px;">
                    <strong>Q3 [7 Marks]:</strong> Solve the numerical problem based on standard GTU ${r.year} syllabus guidelines.
                  </div>
                </div>

                <div style="margin-top:auto;padding-top:16px;border-top:1px dashed #CCC;font-size:11px;color:#777;display:flex;justify-content:space-between;">
                  <span>Verified by CampusHub Academic Council</span>
                  <span>Page 1 of 4 • PDF Document</span>
                </div>
              </div>
            `}
          </div>

          <!-- Viewer Footer Actions -->
          <div class="modal-footer" style="justify-content:space-between;">
            <span style="font-size:12px;color:var(--text-muted);">${r.fileName || 'Document.pdf'} (${r.fileSize || '2.8 MB'})</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${r.fileData ? `
                <a href="${r.fileData}" download="${r.fileName || 'Academic_Resource.pdf'}" class="btn-primary btn-sm" style="width:auto;text-decoration:none;" onclick="window.app.handleDownloadPdf('${r.id}')">
                  ⬇ Download PDF
                </a>

                <button class="btn-outline btn-sm" onclick="window.app.openPdfInNewTab('${r.fileData.replace(/'/g, "\\'")}')">
                  ↗ New Tab
                </button>
              ` : `
                <button class="btn-primary btn-sm" onclick="window.app.handleDownloadPdf('${r.id}')" style="width:auto;">
                  ⬇ Download PDF
                </button>
              `}
              ${isAdmin ? `
                <button class="btn-outline btn-sm" onclick="if(confirm('Delete resource ${r.subjectName}?')){window.app.handleDeleteResource('${r.id}');window.app.closeModal();}" style="color:#DC2626;">
                  🗑 Delete
                </button>
              ` : ''}
              <button class="btn-outline btn-sm" onclick="window.app.closeModal()">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  openPdfInNewTab(fileData) {
    if (!fileData) return;
    try {
      if (fileData.startsWith('data:application/pdf;base64,')) {
        const base64Data = fileData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(fileData, '_blank');
      }
    } catch (err) {
      window.open(fileData, '_blank');
    }
  }

  handleDownloadPdf(resourceId) {
    this.store.incrementDownloads(resourceId);
    this.showToast('Starting file download for academic resource...', 'success');
  }

  // --- Modal: Add Collaboration Post ---
  renderAddCollabPostModal() {
    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Post Teammate Requirement</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <form onsubmit="window.app.handleAddCollabPostSubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Role Needed</label>
                <input type="text" id="cp-role" class="form-input" placeholder="e.g. Frontend Developer / UI/UX Designer / Hardware Expert" required />
              </div>
              <div class="form-group">
                <label class="form-label">Project Title</label>
                <input type="text" id="cp-title" class="form-input" placeholder="e.g. Smart Traffic Management AI with Edge TPU" required />
              </div>
              <div class="form-group">
                <label class="form-label">Description of What is Needed</label>
                <textarea id="cp-desc" class="form-textarea" placeholder="Explain what problem your project solves and what specific skills you are looking for in a collaborator..." required></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Key Skill Tags (comma separated)</label>
                <input type="text" id="cp-tags" class="form-input" placeholder="e.g. React, OpenCV, Python, Figma" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-outline btn-sm" onclick="window.app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" style="width:auto;">Publish Post</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  handleAddCollabPostSubmit(e) {
    e.preventDefault();
    const roleNeeded = document.getElementById('cp-role')?.value;
    const title = document.getElementById('cp-title')?.value;
    const description = document.getElementById('cp-desc')?.value;
    const rawTags = document.getElementById('cp-tags')?.value || '';

    const tags = rawTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const res = this.store.addCollabPost({
      roleNeeded,
      title,
      description,
      tags
    });

    if (res.success) {
      this.showToast('Collaboration post published to the board!', 'success');
      this.closeModal();
    }
  }

  // --- Modal: Send Collaboration Request ---
  renderSendRequestModal() {
    const post = this.modalData;
    if (!post) return '';

    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Send Collaboration Request</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <form onsubmit="window.app.handleSendRequestSubmit(event, '${post.id}')">
            <div class="modal-body">
              <div style="background:var(--mint-light);border:1px solid var(--mint-border);border-radius:var(--radius-sm);padding:10px 12px;font-size:12.5px;">
                <strong>Project:</strong> ${post.title}<br/>
                <strong>Poster:</strong> ${post.authorName} (${post.authorDept || 'Engineering'})<br/>
                <strong>Role Needed:</strong> ${post.roleNeeded}
              </div>

              <div class="form-group">
                <label class="form-label">Personal Pitch / Message Note</label>
                <textarea id="req-note" class="form-textarea" placeholder="Hi ${post.authorName}, I would love to collaborate! I have hands-on experience in..." required></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-outline btn-sm" onclick="window.app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" style="width:auto;">Send Request</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  handleSendRequestSubmit(e, postId) {
    e.preventDefault();
    const note = document.getElementById('req-note')?.value;
    const res = this.store.sendCollabRequest(postId, note);

    if (res.success) {
      this.showToast('Collaboration request sent! Check Requests tab for status.', 'success');
      this.closeModal();
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // --- Modal: Post Update (Admin only) ---
  renderPostUpdateModal() {
    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Post Official Campus Update</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <form onsubmit="window.app.handlePostUpdateSubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Update Title</label>
                <input type="text" id="pu-title" class="form-input" placeholder="e.g. Annual Robocon 2026 Team Registrations" required />
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="pu-cat" class="form-select">
                  <option value="Hackathon">Hackathon</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Competition">Competition</option>
                  <option value="Upcoming Event">Upcoming Event</option>
                  <option value="Notice">Official Notice</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Announcement Message</label>
                <textarea id="pu-msg" class="form-textarea" placeholder="Detailed update message for all students..." required></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Attached Image (URL)</label>
                <input type="url" id="pu-img" class="form-input" value="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80" />
              </div>
              <div class="form-group">
                <label class="form-label">External Registration Link</label>
                <input type="url" id="pu-link" class="form-input" placeholder="https://..." />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-outline btn-sm" onclick="window.app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" style="width:auto;">Publish & Notify All Students</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  handlePostUpdateSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('pu-title')?.value;
    const category = document.getElementById('pu-cat')?.value;
    const message = document.getElementById('pu-msg')?.value;
    const image = document.getElementById('pu-img')?.value;
    const link = document.getElementById('pu-link')?.value;

    const res = this.store.addUpdate({
      title,
      category,
      message,
      image,
      link
    });

    if (res.success) {
      this.showToast('Update posted! Coral notification badge sent to all students.', 'success');
      this.closeModal();
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // --- Modal: Edit Profile ---
  renderEditProfileModal() {
    const user = this.store.getCurrentUser();
    if (!user) return '';

    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Edit Profile Information</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>
          <form onsubmit="window.app.handleEditProfileSubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="ep-name" class="form-input" value="${user.name}" required />
              </div>
              <div class="form-group">
                <label class="form-label">College Enrollment Number</label>
                <input type="text" id="ep-enrollment" class="form-input" value="${user.enrollment}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <input type="text" id="ep-dept" class="form-input" value="${user.department}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Profile Photo (URL)</label>
                <input type="url" id="ep-avatar" class="form-input" value="${user.avatar}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Short Bio</label>
                <textarea id="ep-bio" class="form-textarea">${user.bio || ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-outline btn-sm" onclick="window.app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" style="width:auto;">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  handleEditProfileSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('ep-name')?.value;
    const enrollment = document.getElementById('ep-enrollment')?.value;
    const department = document.getElementById('ep-dept')?.value;
    const avatar = document.getElementById('ep-avatar')?.value;
    const bio = document.getElementById('ep-bio')?.value;

    this.store.updateProfile({
      name,
      enrollment,
      department,
      avatar,
      bio
    });

    this.showToast('Profile updated successfully!', 'success');
    this.closeModal();
  }

  // --- Modal: WhatsApp-Style 1:1 Chat ---
  renderChatModal() {
    const peerId = this.activeChatUserId;
    const currentUser = this.store.getCurrentUser();
    const allUsers = this.store.getRegisteredUsers();
    const peer = allUsers.find(u => u.id === peerId) || {
      id: peerId,
      name: 'Peer Collaborator',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    };

    const messages = this.store.getChat(peerId);

    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog" style="max-width:440px;padding:0;overflow:hidden;">
          <!-- WhatsApp Chat Header -->
          <div class="chat-header">
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${peer.avatar}" alt="${peer.name}" class="user-avatar" style="width:36px;height:36px;" />
              <div>
                <div style="font-size:14px;font-weight:700;color:var(--text-main);">${peer.name}</div>
                <div style="font-size:11px;color:var(--primary);display:flex;align-items:center;gap:4px;">
                  <span style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
                  Online • ${peer.department || 'Engineering'}
                </div>
              </div>
            </div>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>

          <!-- Chat Window & Messages -->
          <div class="chat-window" style="border:none;border-radius:0;">
            <div class="chat-messages" id="chat-messages-box">
              ${messages.map(msg => {
                if (msg.sender === 'system') {
                  return `<div class="chat-bubble system">${msg.text}</div>`;
                }
                const isSentByMe = currentUser && msg.sender === currentUser.id;
                return `
                  <div class="chat-bubble ${isSentByMe ? 'sent' : 'received'}">
                    <div>${msg.text}</div>
                    <span class="chat-time">${msg.timestamp}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Chat Input Bar -->
            <form onsubmit="window.app.handleSendMessage(event, '${peerId}')" class="chat-input-bar">
              <input type="text" id="chat-input-text" class="chat-input-field" placeholder="Type a message..." autocomplete="off" required />
              <button type="submit" class="chat-send-btn" title="Send Message">
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  handleSendMessage(e, peerId) {
    e.preventDefault();
    const input = document.getElementById('chat-input-text');
    if (!input || !input.value.trim()) return;

    this.store.sendMessage(peerId, input.value.trim());
    input.value = '';

    setTimeout(() => {
      const box = document.getElementById('chat-messages-box');
      if (box) box.scrollTop = box.scrollHeight;
    }, 50);
  }

  // --- Modal: Accounts Manager (10 Students + 4 Admins) ---
  renderAccountsManagerModal() {
    const users = this.store.getRegisteredUsers();
    const currentUser = this.store.getCurrentUser();
    const studentCount = this.store.getStudentAccountsCount();
    const adminCount = this.store.getAdminAccountsCount();
    const devMode = this.isDevMode();

    return `
      <div class="modal-overlay" onclick="if(event.target===this)window.app.closeModal()">
        <div class="modal-dialog">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Custom Accounts Manager</h3>
              <div style="font-size:11.5px;color:var(--text-muted);">
                Students: <strong>${studentCount}/10</strong> • Admins: <strong>${adminCount}/4</strong>
              </div>
            </div>
            <button class="modal-close-btn" onclick="window.app.closeModal()">✕</button>
          </div>

          <div class="modal-body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:700;color:var(--text-main);">Registered Accounts (${users.length})</span>
              <button class="btn-secondary btn-sm" onclick="window.app.closeModal();window.app.setAuthMode('signup');window.app.navigate('auth');">
                + Register New Account
              </button>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
              ${users.length === 0 ? `
                <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12.5px;background:var(--surface-alt);border-radius:var(--radius-md);">
                  Zero accounts registered. Use the Sign Up screen to register custom accounts.
                </div>
              ` : users.map(u => {
                const isActive = currentUser && currentUser.id === u.id;
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;background:${isActive ? 'var(--mint-light)' : 'var(--surface)'};border:1px solid ${isActive ? 'var(--primary)' : 'var(--border)'};padding:10px 12px;border-radius:var(--radius-sm);">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <img src="${u.avatar}" alt="${u.name}" class="user-avatar" style="width:32px;height:32px;" />
                      <div>
                        <div style="font-size:13px;font-weight:700;color:var(--text-main);">${u.name} ${isActive ? '<span style="color:var(--primary);font-size:11px;">(Active)</span>' : ''}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${u.role.toUpperCase()} • ${u.email}</div>
                      </div>
                    </div>

                    <div style="display:flex;gap:6px;">
                      ${devMode && !isActive ? `
                        <button class="btn-primary btn-sm" onclick="window.app.store.switchUser('${u.id}');window.app.showToast('Switched account to ${u.name}', 'success');window.app.closeModal();" title="Quick switch (Dev Mode)">
                          Switch
                        </button>
                      ` : ''}
                      <button class="btn-outline btn-sm" onclick="if(confirm('Delete account ${u.name}?')){window.app.store.deleteUser('${u.id}');window.app.showToast('Account deleted', 'info');}" style="color:#DC2626;padding:4px 8px;" title="Delete account">
                        🗑
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            ${!devMode ? `
              <div style="font-size:11.5px;color:var(--text-muted);background:var(--surface-alt);padding:8px 12px;border-radius:var(--radius-xs);border:1px solid var(--border-light);line-height:1.35;">
                🔒 In standard mode, log out and enter credentials (email + password + CAPTCHA) to switch accounts.
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn-outline btn-sm" onclick="window.app.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  }
}

// Instantiate App
export const app = new CampusHubApp();
