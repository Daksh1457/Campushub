/**
 * CampusHub 1.0 — Reactive State Store & Business Logic (Supabase Backend)
 * Uses Supabase for auth, database, realtime, and storage.
 * Falls back to localStorage when Supabase is unavailable.
 */

import { getSupabase, isSupabaseReady } from './supabaseClient.js';
import { INITIAL_STATE } from './mockData.js';

const STORAGE_KEY = 'campushub_v2_store';
const MAX_STUDENTS = 10;
const MAX_ADMINS = 4;

// Simple obfuscation for localStorage fallback
function obfuscatePassword(password) {
  try { return btoa(unescape(encodeURIComponent(password))); }
  catch (e) { return btoa(password); }
}

class CampusHubStore {
  constructor() {
    this.listeners = [];
    this.state = this.loadState();
    this._subscriptions = [];
    this._initialized = false;
    this._initPromise = this._init();
  }

  // =============================================
  // INITIALIZATION
  // =============================================
  async _init() {
    if (this._initialized) return;

    const sb = getSupabase();
    if (!sb) {
      console.log('[CampusHub] Supabase unavailable, using localStorage fallback');
      this._setupLocalFallback();
      this._initialized = true;
      return;
    }

    try {
      // Check for existing session
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        await this._loadProfile(session.user.id);
      }

      // Subscribe to auth changes
      sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this._loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          this.state.currentUser = null;
          this._cleanupSubscriptions();
          this.saveState();
        }
      });      // Subscribe to realtime changes
      this._setupRealtimeSubscriptions();

      // Load all data from Supabase
      await this._syncAllData();

      console.log('[CampusHub] Supabase backend connected');
    } catch (err) {
      console.warn('[CampusHub] Supabase init error, falling back to localStorage:', err);
      this._setupLocalFallback();
    }

    this._initialized = true;
    this.notify();
  }

  // Sync all data from Supabase into local state  async _syncAllData() {
    const sb = getSupabase();
    if (!sb) return;

    try {

      // Projects
      const { data: projects } = await sb.from('projects').select('*').order('created_at', { ascending: false });
      if (projects) this.state.projects = projects.map(r => this._mapProjectFromDB(r));

      // Resources
      const { data: resources } = await sb.from('resources').select('*').order('created_at', { ascending: false });
      if (resources) this.state.resources = resources.map(r => this._mapResourceFromDB(r));

      // Collaboration posts
      const { data: collabs } = await sb.from('collaboration_posts').select('*').order('created_at', { ascending: false });
      if (collabs) this.state.collaborationPosts = collabs.map(r => this._mapCollabFromDB(r));

      // Updates
      const { data: updates } = await sb.from('updates').select('*').order('created_at', { ascending: false });
      if (updates) this.state.updateBoard = updates.map(r => this._mapUpdateFromDB(r));

      // Requests
      if (this.state.currentUser) {
        const { data: requests } = await sb.from('requests').select('*')
          .or(`from_user_id.eq.${this.state.currentUser.id},to_user_id.eq.${this.state.currentUser.id}`)
          .order('created_at', { ascending: false });
        if (requests) this.state.requests = requests.map(r => this._mapRequestFromDB(r));
      }

      // Registered users (profiles) — replaces localStorage list with Supabase truth
      const { data: profiles } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
      if (profiles) {
        this.state.registeredUsers = profiles.map(p => ({
          id: p.id,
          name: p.full_name || p.name || 'User',
          role: p.role || 'student',
          email: p.email || '',
          enrollment: p.enrollment_number || p.enrollment || '',
          department: p.department || 'Computer Engineering',
          semester: p.semester || 'Semester 6',
          avatar: p.avatar_url || p.avatar || '',
          skills: p.skills || [],
          bio: p.bio || ''
        }));
      }

      this.saveState();
    } catch (err) {
      console.warn('[CampusHub] Error syncing data:', err);
    }
  }

  async _loadProfile(userId) {
    const sb = getSupabase();
    if (!sb) return;

    let { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();

    // If profile doesn't exist (trigger may have failed), create it from auth user metadata
    if (error || !data) {
      const { data: authUser } = await sb.auth.getUser();
      if (authUser?.user && authUser.user.id === userId) {
        const meta = authUser.user.user_metadata || {};
        const { error: insertError } = await sb.from('profiles').insert({
          id: userId,
          name: meta.full_name || meta.name || 'User',
          role: meta.role || 'student',
          email: authUser.user.email || '',
          enrollment: meta.enrollment_number || meta.enrollment || '',
          department: meta.department || 'Computer Engineering',
          avatar: meta.avatar_url || '',
          bio: meta.bio || ''
        });
        if (!insertError) {
          ({ data, error } = await sb.from('profiles').select('*').eq('id', userId).single());
        }
      }
    }

    if (error || !data) {
      console.warn('[CampusHub] Failed to load profile:', error);
      return;
    }

    // Map from your schema (full_name, enrollment_number, avatar_url) to app format
    this.state.currentUser = {
      id: data.id,
      name: data.full_name || data.name || 'User',
      role: data.role || 'student',
      email: data.email || '',
      enrollment: data.enrollment_number || data.enrollment || '',
      department: data.department || 'Computer Engineering',
      semester: data.semester || 'Semester 6',
      avatar: data.avatar_url || data.avatar || '',
      skills: data.skills || [],
      bio: data.bio || ''
    };

    // Also update in registeredUsers for compatibility
    const existing = this.state.registeredUsers.find(u => u.id === data.id);
    if (existing) {
      Object.assign(existing, this.state.currentUser);
    } else {
      this.state.registeredUsers.push(this.state.currentUser);
    }

    this.notify();
  }

  // =============================================
  // REALTIME SUBSCRIPTIONS
  // =============================================
  _setupRealtimeSubscriptions() {
    const sb = getSupabase();
    if (!sb) return;

    // Subscribe to requests changes
    const requestsSub = sb
      .channel('requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
        this._handleRealtimeRequest(payload);
      })
      .subscribe();
    this._subscriptions.push(requestsSub);

    // Subscribe to chat messages
    const chatSub = sb
      .channel('chat-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        this._handleRealtimeChat(payload);
      })
      .subscribe();
    this._subscriptions.push(chatSub);

    // Subscribe to updates
    const updatesSub = sb
      .channel('updates-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'updates' }, (payload) => {
        this._handleRealtimeUpdate(payload);
      })
      .subscribe();
    this._subscriptions.push(updatesSub);

    // Subscribe to projects
    const projectsSub = sb
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        this._handleRealtimeProject(payload);
      })
      .subscribe();
    this._subscriptions.push(projectsSub);

    // Subscribe to collaboration posts
    const collabSub = sb
      .channel('collab-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaboration_posts' }, (payload) => {
        this._handleRealtimeCollab(payload);
      })
      .subscribe();
    this._subscriptions.push(collabSub);
  }

  _cleanupSubscriptions() {
    this._subscriptions.forEach(sub => {
      try { sub.unsubscribe(); } catch (e) {}
    });
    this._subscriptions = [];
  }

  _handleRealtimeRequest(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT') {
      // Check if this request is for or from current user
      if (this.state.currentUser && (newRow.from_user_id === this.state.currentUser.id || newRow.to_user_id === this.state.currentUser.id)) {
        const exists = this.state.requests.find(r => r.id === newRow.id);
        if (!exists) {
          this.state.requests.push(this._mapRequestFromDB(newRow));
          this.notify();
        }
      }
    } else if (eventType === 'UPDATE') {
      const idx = this.state.requests.findIndex(r => r.id === newRow.id);
      if (idx >= 0) {
        this.state.requests[idx] = this._mapRequestFromDB(newRow);
        this.notify();
      }
    } else if (eventType === 'DELETE') {
      this.state.requests = this.state.requests.filter(r => r.id !== oldRow.id);
      this.notify();
    }
  }

  _handleRealtimeChat(payload) {
    const msg = payload.new;
    if (!this.state.currentUser) return;
    if (msg.sender_id !== this.state.currentUser.id && msg.receiver_id !== this.state.currentUser.id) return;

    const peerId = msg.sender_id === this.state.currentUser.id ? msg.receiver_id : msg.sender_id;
    if (!this.state.chats[peerId]) this.state.chats[peerId] = [];

    const exists = this.state.chats[peerId].find(m => m.id === msg.id);
    if (!exists) {
      this.state.chats[peerId].push({
        id: msg.id,
        sender: msg.sender_id,
        senderName: msg.sender_name,
        text: msg.text,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: msg.is_system
      });
      this.notify();
    }
  }

  _handleRealtimeUpdate(payload) {
    if (payload.eventType === 'INSERT') {
      const exists = this.state.updateBoard.find(u => u.id === payload.new.id);
      if (!exists) {
        this.state.updateBoard.unshift(this._mapUpdateFromDB(payload.new));
        this.notify();
      }
    }
  }

  _handleRealtimeProject(payload) {
    if (payload.eventType === 'INSERT') {
      const exists = this.state.projects.find(p => p.id === payload.new.id);
      if (!exists) {
        this.state.projects.unshift(this._mapProjectFromDB(payload.new));
        this.notify();
      }
    }
  }

  _handleRealtimeCollab(payload) {
    if (payload.eventType === 'INSERT') {
      const exists = this.state.collaborationPosts.find(p => p.id === payload.new.id);
      if (!exists) {
        this.state.collaborationPosts.unshift(this._mapCollabFromDB(payload.new));
        this.notify();
      }
    }
  }

  // =============================================
  // DATA MAPPING (DB ↔ App format)
  // =============================================
  _mapRequestFromDB(row) {
    return {
      id: row.id,
      type: row.type,
      collabId: row.collab_id,
      title: row.title,
      fromUser: {
        id: row.from_user_id,
        name: row.from_user_name,
        email: row.from_user_email,
        department: row.from_user_dept,
        enrollment: row.from_user_enrollment,
        avatar: row.from_user_avatar,
        skills: row.from_user_skills || []
      },
      toUser: {
        id: row.to_user_id,
        name: row.to_user_name,
        department: row.to_user_dept
      },
      status: row.status,
      note: row.note,
      timestamp: row.accepted_at
        ? new Date(row.accepted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Just now'
    };
  }

  _mapProjectFromDB(row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      image: row.image,
      components: row.components,
      description: row.description,
      author: row.author,
      authorDept: row.author_dept,
      uploadedBy: row.uploaded_by,
      tags: row.tags || [],
      date: row.created_at ? row.created_at.split('T')[0] : ''
    };
  }

  _mapResourceFromDB(row) {
    const fileName = row.file_name || '';
    const lowerName = fileName.toLowerCase();
    let fileType = 'PDF';
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) fileType = 'Word';
    else if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) fileType = 'PPT';
    else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) fileType = 'Excel';

    return {
      id: row.id,
      category: row.category,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      semester: row.semester,
      year: row.year,
      fileName: fileName,
      fileSize: row.file_size,
      fileData: row.file_url || null,
      fileType: fileType,
      downloads: row.downloads,
      uploadedBy: row.uploaded_by,
      summary: row.summary
    };
  }

  _mapCollabFromDB(row) {
    return {
      id: row.id,
      title: row.title,
      roleNeeded: row.role_needed,
      authorId: row.author_id,
      authorName: row.author_name,
      authorDept: row.author_dept,
      authorAvatar: row.author_avatar,
      description: row.description,
      tags: row.tags || [],
      requestsCount: row.requests_count || 0,
      timestamp: row.created_at
        ? this._timeAgo(new Date(row.created_at))
        : 'Just now'
    };
  }

  _mapUpdateFromDB(row) {
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      category: row.category,
      image: row.image,
      link: row.link,
      author: row.author,
      isNew: row.is_new,
      timestamp: row.created_at
        ? this._timeAgo(new Date(row.created_at))
        : 'Just now'
    };
  }

  _timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
  }

  // =============================================
  // LOCAL FALLBACK (localStorage mode)
  // =============================================
  _setupLocalFallback() {
    // Cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            const myUser = this.state.currentUser;
            this.state = {
              registeredUsers: parsed.registeredUsers || [],
              currentUser: myUser ? (parsed.registeredUsers?.find(u => u.id === myUser.id) || myUser) : (parsed.currentUser || null),
              projects: parsed.projects || INITIAL_STATE.projects,
              resources: parsed.resources || INITIAL_STATE.resources,
              collaborationPosts: parsed.collaborationPosts || INITIAL_STATE.collaborationPosts,
              requests: parsed.requests || [],
              updateBoard: parsed.updateBoard || INITIAL_STATE.updateBoard,
              chats: parsed.chats || {}
            };
            this.notify();
          } catch (err) {
            console.warn('Cross-tab sync error:', err);
          }
        }
      });
    }
  }

  // =============================================
  // STATE PERSISTENCE
  // =============================================
  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          registeredUsers: parsed.registeredUsers || [],
          currentUser: parsed.currentUser || null,
          projects: parsed.projects || JSON.parse(JSON.stringify(INITIAL_STATE.projects)),
          resources: parsed.resources || JSON.parse(JSON.stringify(INITIAL_STATE.resources)),
          collaborationPosts: parsed.collaborationPosts || JSON.parse(JSON.stringify(INITIAL_STATE.collaborationPosts)),
          requests: parsed.requests || [],
          updateBoard: parsed.updateBoard || JSON.parse(JSON.stringify(INITIAL_STATE.updateBoard)),
          chats: parsed.chats || {}
        };
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.state); }
      catch (err) { console.error('Listener notification error:', err); }
    });
  }

  getState() { return this.state; }

  // =============================================
  // RESET ALL DATA
  // =============================================
  async resetAllData() {
    const sb = getSupabase();
    if (sb) {
      // Sign out current user
      await sb.auth.signOut().catch(() => {});
    }
    // Clear all local state
    this.state = {
      registeredUsers: [],
      currentUser: null,
      projects: [],
      resources: [],
      collaborationPosts: [],
      requests: [],
      updateBoard: [],
      chats: {}
    };
    localStorage.removeItem(STORAGE_KEY);
    this._cleanupSubscriptions();
    this.notify();
  }

  // =============================================
  // AUTHENTICATION
  // =============================================
  async registerUser(userData) {
    const role = userData.role || 'student';

    // When Supabase is connected, count from profiles table (source of truth)
    const sb = getSupabase();
    let currentStudents = this.state.registeredUsers.filter(u => u.role === 'student').length;
    let currentAdmins = this.state.registeredUsers.filter(u => u.role === 'admin').length;

    if (sb) {
      try {
        const { data: profiles } = await sb.from('profiles').select('role');
        if (profiles) {
          currentStudents = profiles.filter(p => p.role === 'student').length;
          currentAdmins = profiles.filter(p => p.role === 'admin').length;
          // Update local state to match Supabase
          this.state.registeredUsers = [];
        }
      } catch (e) {
        // Fall back to local count
      }
    }

    if (role === 'student' && currentStudents >= MAX_STUDENTS) {
      return { success: false, message: `Maximum student limit reached (${MAX_STUDENTS} students max). You have ${currentStudents} students registered.` };
    }
    if (role === 'admin' && currentAdmins >= MAX_ADMINS) {
      return { success: false, message: `Maximum admin limit reached (${MAX_ADMINS} admins max). You have ${currentAdmins} admins registered.` };
    }

    if (sb) {
      // Supabase Auth signup
      const { data, error } = await sb.auth.signUp({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            full_name: userData.name.trim(),
            role: role,
            enrollment_number: userData.enrollment ? userData.enrollment.trim() : '',
            department: userData.department || 'Computer Engineering',
            avatar_url: role === 'admin'
              ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            bio: `${role === 'admin' ? 'Faculty Admin' : 'Student'} at GTU engineering campus.`
          }
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Profile is auto-created by the trigger
        await this._loadProfile(data.user.id);
        return { success: true, user: this.state.currentUser };
      }
    }

    // Fallback: localStorage registration
    const existing = this.state.registeredUsers.find(
      u => u.email.toLowerCase() === userData.email.trim().toLowerCase()
    );
    if (existing) {
      return { success: false, message: 'An account with this College Email already exists.' };
    }

    const newUser = {
      id: `${role}_${Date.now()}`,
      role,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: obfuscatePassword(userData.password),
      enrollment: userData.enrollment ? userData.enrollment.trim() : (role === 'admin' ? 'Admin / Faculty' : `21012011${Math.floor(1000 + Math.random() * 9000)}`),
      department: userData.department || 'Computer Engineering',
      semester: role === 'admin' ? 'Faculty / HoD' : 'Semester 6',
      avatar: role === 'admin'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      skills: role === 'admin' ? ['Academic Coordination', 'Research', 'Faculty Advisor'] : ['Frontend Dev', 'UI/UX', 'Python'],
      bio: `${role === 'admin' ? 'Faculty Admin' : 'Student'} at GTU engineering campus.`
    };

    this.state.registeredUsers.push(newUser);
    this.state.currentUser = newUser;
    this.saveState();
    return { success: true, user: newUser };
  }

  async login(email, password) {
    const sb = getSupabase();

    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        await this._loadProfile(data.user.id);
        return { success: true, user: this.state.currentUser };
      }
    }

    // Fallback: localStorage login
    const user = this.state.registeredUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'No account found with this email. Please Sign Up first.' };
    }
    if (user.password !== obfuscatePassword(password)) {
      return { success: false, message: 'Incorrect password. Try again or click Forgot Password.' };
    }

    this.state.currentUser = user;
    this.saveState();
    return { success: true, user };
  }

  async logout() {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    this.state.currentUser = null;
    this._cleanupSubscriptions();
    this.saveState();
    if (sb) this._setupRealtimeSubscriptions();
  }

  async switchUser(userId) {
    // For dev mode: switch between registered users (localStorage only)
    const user = this.state.registeredUsers.find(u => u.id === userId);
    if (user) {
      this.state.currentUser = user;
      this.saveState();
      return true;
    }
    return false;
  }

  deleteUser(userId) {
    this.state.registeredUsers = this.state.registeredUsers.filter(u => u.id !== userId);
    if (this.state.currentUser && this.state.currentUser.id === userId) {
      this.state.currentUser = this.state.registeredUsers[0] || null;
    }
    this.saveState();
  }

  async resetPassword(email, newPassword) {
    const sb = getSupabase();

    if (sb) {
      // For Supabase, password reset requires the user to be logged in
      // or uses the resetPasswordForEmail flow
      // For demo purposes, we'll update via the profiles table
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Password reset successfully!' };
    }

    // Fallback
    const user = this.state.registeredUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'No account registered with this email address.' };
    }
    user.password = obfuscatePassword(newPassword);
    this.saveState();
    return { success: true, message: 'Password reset successfully!' };
  }

  getCurrentUser() { return this.state.currentUser; }

  isAdmin() {
    if (!this.state.currentUser) return false;
    return this.state.currentUser.role === 'admin';
  }

  // =============================================
  // PROFILE
  // =============================================
  async updateProfile(profileData) {
    if (!this.state.currentUser) return false;

    const sb = getSupabase();
    if (sb && this.state.currentUser.id) {
      const { error } = await sb.from('profiles').update({
        full_name: profileData.name,
        enrollment_number: profileData.enrollment,
        department: profileData.department,
        avatar_url: profileData.avatar,
        bio: profileData.bio
      }).eq('id', this.state.currentUser.id);

      if (error) {
        console.warn('Profile update failed:', error);
        return false;
      }
    }

    // Update local state
    const userInList = this.state.registeredUsers.find(u => u.id === this.state.currentUser.id);
    if (userInList) Object.assign(userInList, profileData);
    Object.assign(this.state.currentUser, profileData);
    this.saveState();
    return true;
  }

  async addSkill(skillName) {
    if (!this.state.currentUser || !skillName.trim()) return false;
    const skill = skillName.trim();
    if (!this.state.currentUser.skills) this.state.currentUser.skills = [];
    if (this.state.currentUser.skills.includes(skill)) return false;

    this.state.currentUser.skills.push(skill);

    const sb = getSupabase();
    if (sb && this.state.currentUser.id) {
      await sb.from('profiles').update({ skills: this.state.currentUser.skills }).eq('id', this.state.currentUser.id);
    }

    const userInList = this.state.registeredUsers.find(u => u.id === this.state.currentUser.id);
    if (userInList) userInList.skills = this.state.currentUser.skills;
    this.saveState();
    return true;
  }

  async removeSkill(skillName) {
    if (!this.state.currentUser || !this.state.currentUser.skills) return false;
    this.state.currentUser.skills = this.state.currentUser.skills.filter(s => s !== skillName);

    const sb = getSupabase();
    if (sb && this.state.currentUser.id) {
      await sb.from('profiles').update({ skills: this.state.currentUser.skills }).eq('id', this.state.currentUser.id);
    }

    const userInList = this.state.registeredUsers.find(u => u.id === this.state.currentUser.id);
    if (userInList) userInList.skills = this.state.currentUser.skills;
    this.saveState();
    return true;
  }

  // =============================================
  // PROJECTS
  // =============================================
  getProjects(tab = 'All') {
    if (!tab || tab === 'All') return this.state.projects;
    return this.state.projects.filter(p => p.category.toLowerCase() === tab.toLowerCase());
  }

  async addProject(project) {
    const sb = getSupabase();
    if (sb) {
      // Check admin role via DB
      const { data: profile } = await sb.from('profiles').select('role').eq('id', this.state.currentUser?.id).single();
      if (profile?.role !== 'admin') {
        return { success: false, message: 'Permission denied: Only Admin accounts can upload projects.' };
      }

      const { data, error } = await sb.from('projects').insert({
        name: project.name.trim(),
        category: project.category || 'Software',
        image: project.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
        components: project.components ? project.components.trim() : '',
        description: project.description ? project.description.trim() : '',
        author: project.author ? project.author.trim() : (this.state.currentUser?.name || 'Student'),
        author_dept: this.state.currentUser?.department || 'Engineering',
        uploaded_by: `Admin (${this.state.currentUser?.name || 'Admin'})`,
        tags: [project.category || 'Software', 'Engineering']
      }).select().single();

      if (error) return { success: false, message: error.message };

      const mapped = this._mapProjectFromDB(data);
      this.state.projects.unshift(mapped);
      this.saveState();
      return { success: true, project: mapped };
    }

    // Fallback: localStorage
    if (!this.state.currentUser || this.state.currentUser.role !== 'admin') {
      return { success: false, message: 'Permission denied: Only Admin accounts can upload projects.' };
    }
    const newProj = {
      id: 'proj_' + Date.now(),
      name: project.name.trim(),
      category: project.category || 'Software',
      image: project.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      components: project.components ? project.components.trim() : '',
      description: project.description ? project.description.trim() : '',
      author: project.author ? project.author.trim() : (this.state.currentUser?.name || 'Student'),
      authorDept: this.state.currentUser?.department || 'Engineering',
      uploadedBy: `Admin (${this.state.currentUser?.name || 'Admin'})`,
      tags: [project.category || 'Software', 'Engineering'],
      date: new Date().toISOString().split('T')[0]
    };
    this.state.projects.unshift(newProj);
    this.saveState();
    return { success: true, project: newProj };
  }

  // =============================================
  // RESOURCES
  // =============================================
  getResources(category = 'Mid-Sem Papers') {
    return this.state.resources.filter(r => r.category === category);
  }

  async addResource(resource) {
    const sb = getSupabase();
    if (sb) {
      const { data: profile } = await sb.from('profiles').select('role').eq('id', this.state.currentUser?.id).single();
      if (profile?.role !== 'admin') {
        return { success: false, message: 'Permission denied: Only Admin accounts can upload resources.' };
      }

      const { data, error } = await sb.from('resources').insert({
        category: resource.category || 'Mid-Sem Papers',
        subject_name: resource.subjectName.trim(),
        subject_code: resource.subjectCode.trim(),
        semester: resource.semester || 'Semester 5',
        year: resource.year || '2026',
        file_name: resource.fileName || '',
        file_size: resource.fileSize || '',
        file_url: resource.fileData || '',
        uploaded_by: `Admin (${this.state.currentUser?.name || 'Admin'})`,
        summary: resource.summary || ''
      }).select().single();

      if (error) return { success: false, message: error.message };

      const mapped = this._mapResourceFromDB(data);
      this.state.resources.unshift(mapped);
      this.saveState();
      return { success: true, resource: mapped };
    }

    // Fallback
    if (!this.state.currentUser || this.state.currentUser.role !== 'admin') {
      return { success: false, message: 'Permission denied: Only Admin accounts can upload academic resources.' };
    }
    const newRes = {
      id: 'res_' + Date.now(),
      category: resource.category || 'Mid-Sem Papers',
      subjectName: resource.subjectName.trim(),
      subjectCode: resource.subjectCode.trim(),
      semester: resource.semester || 'Semester 5',
      year: resource.year || '2026',
      fileName: resource.fileName || '',
      fileSize: resource.fileSize || '',
      fileData: resource.fileData || null,
      fileType: resource.fileType || 'PDF',
      downloads: 0,
      uploadedBy: `Admin (${this.state.currentUser?.name || 'Admin'})`,
      summary: resource.summary || ''
    };
    this.state.resources.unshift(newRes);
    this.saveState();
    return { success: true, resource: newRes };
  }

  async deleteResource(resourceId) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('resources').delete().eq('id', resourceId);
      if (error) return { success: false, message: error.message };
    }
    this.state.resources = this.state.resources.filter(r => r.id !== resourceId);
    this.saveState();
    return { success: true };
  }

  async incrementDownloads(resourceId) {
    const sb = getSupabase();
    if (sb) {
      await sb.rpc('increment_downloads', { res_id: resourceId }).catch(() => {});
    }
    const res = this.state.resources.find(r => r.id === resourceId);
    if (res) { res.downloads = (res.downloads || 0) + 1; this.saveState(); }
  }

  // =============================================
  // COLLABORATION POSTS
  // =============================================
  getCollabPosts() {
    return this.state.collaborationPosts;
  }

  async addCollabPost(post) {
    const user = this.state.currentUser;
    if (!user) return { success: false, message: 'Please log in to post.' };

    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from('collaboration_posts').insert({
        title: post.title.trim(),
        role_needed: post.roleNeeded.trim(),
        author_id: user.id,
        author_name: user.name,
        author_dept: user.department || '',
        author_avatar: user.avatar || '',
        description: post.description.trim(),
        tags: post.tags || [post.roleNeeded.trim(), 'Collaboration']
      }).select().single();

      if (error) return { success: false, message: error.message };

      const mapped = this._mapCollabFromDB(data);
      this.state.collaborationPosts.unshift(mapped);
      this.saveState();
      return { success: true, post: mapped };
    }

    // Fallback
    const newPost = {
      id: 'collab_' + Date.now(),
      title: post.title.trim(),
      roleNeeded: post.roleNeeded.trim(),
      authorId: user.id,
      authorName: user.name,
      authorDept: user.department,
      authorAvatar: user.avatar,
      description: post.description.trim(),
      tags: post.tags || [post.roleNeeded.trim(), 'Collaboration'],
      timestamp: 'Just now',
      requestsCount: 0
    };
    this.state.collaborationPosts.unshift(newPost);
    this.saveState();
    return { success: true, post: newPost };
  }

  // =============================================
  // REQUESTS
  // =============================================
  getSentRequests() {
    if (!this.state.currentUser) return [];
    return this.state.requests.filter(
      r => r.fromUser && r.fromUser.id === this.state.currentUser.id && r.status === 'pending'
    );
  }

  getReceivedRequests() {
    return this.state.requests.filter(r =>
      r.toUser && r.toUser.id === this.state.currentUser?.id && r.status === 'pending'
    );
  }

  async _syncReceivedRequests() {
    if (!this.state.currentUser) return;
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.from('requests')
        .select('*')
        .eq('to_user_id', this.state.currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) {
        const mapped = data.map(r => this._mapRequestFromDB(r));
        mapped.forEach(m => {
          if (!this.state.requests.find(r => r.id === m.id)) {
            this.state.requests.push(m);
          }
        });
      }
    }

    return this.state.requests.filter(
      r => r.toUser && r.toUser.id === this.state.currentUser.id && r.status === 'pending'
    );
  }

  getAcceptedConnections() {
    if (!this.state.currentUser) return [];
    return this.state.requests.filter(
      r => r.status === 'accepted' &&
      ((r.fromUser && r.fromUser.id === this.state.currentUser.id) ||
       (r.toUser && r.toUser.id === this.state.currentUser.id))
    );
  }

  async sendCollabRequest(postId, note = '') {
    if (!this.state.currentUser) {
      return { success: false, message: 'Please log in to send collaboration requests.' };
    }

    const post = this.state.collaborationPosts.find(p => p.id === postId);
    if (!post) return { success: false, message: 'Collaboration post not found.' };
    if (post.authorId === this.state.currentUser.id) {
      return { success: false, message: 'You cannot send a request to your own post.' };
    }

    const sb = getSupabase();
    if (sb) {
      // Check for duplicate
      const { data: existing } = await sb.from('requests')
        .select('id')
        .eq('collab_id', postId)
        .eq('from_user_id', this.state.currentUser.id)
        .limit(1);
      if (existing && existing.length > 0) {
        return { success: false, message: 'You have already sent a request for this post.' };
      }

      // Increment post request count
      await sb.from('collaboration_posts')
        .update({ requests_count: (post.requestsCount || 0) + 1 })
        .eq('id', postId);

      const { data, error } = await sb.from('requests').insert({
        type: 'collaboration',
        collab_id: postId,
        title: `Request to join: ${post.roleNeeded} (${post.title})`,
        from_user_id: this.state.currentUser.id,
        from_user_name: this.state.currentUser.name,
        from_user_email: this.state.currentUser.email || '',
        from_user_dept: this.state.currentUser.department || '',
        from_user_enrollment: this.state.currentUser.enrollment || '',
        from_user_avatar: this.state.currentUser.avatar || '',
        from_user_skills: this.state.currentUser.skills || [],
        to_user_id: post.authorId,
        to_user_name: post.authorName,
        to_user_dept: post.authorDept || '',
        note: note.trim() || `Hi ${post.authorName}, I would love to collaborate!`
      }).select().single();

      if (error) return { success: false, message: error.message };

      const mapped = this._mapRequestFromDB(data);
      this.state.requests.unshift(mapped);
      post.requestsCount = (post.requestsCount || 0) + 1;
      this.saveState();
      return { success: true, request: mapped };
    }

    // Fallback
    const existing = this.state.requests.find(
      r => r.collabId === postId && r.fromUser?.id === this.state.currentUser.id
    );
    if (existing) return { success: false, message: 'You have already sent a request for this post.' };

    post.requestsCount = (post.requestsCount || 0) + 1;
    const newReq = {
      id: 'req_' + Date.now(),
      type: 'collaboration',
      collabId: postId,
      title: `Request to join: ${post.roleNeeded} (${post.title})`,
      fromUser: {
        id: this.state.currentUser.id,
        name: this.state.currentUser.name,
        email: this.state.currentUser.email,
        department: this.state.currentUser.department,
        enrollment: this.state.currentUser.enrollment,
        avatar: this.state.currentUser.avatar,
        skills: this.state.currentUser.skills || []
      },
      toUser: { id: post.authorId, name: post.authorName, department: post.authorDept },
      status: 'pending',
      timestamp: 'Just now',
      note: note.trim() || `Hi ${post.authorName}, I would love to collaborate!`
    };
    this.state.requests.unshift(newReq);
    this.saveState();
    return { success: true, request: newReq };
  }

  async acceptRequest(requestId) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('requests')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) return false;
    }

    const req = this.state.requests.find(r => r.id === requestId);
    if (!req) return false;
    req.status = 'accepted';
    req.acceptedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Initialize chat for both users
    const myId = this.state.currentUser ? this.state.currentUser.id : null;
    const otherUserId = (myId && req.fromUser?.id === myId) ? req.toUser?.id : req.fromUser?.id;

    if (myId && !this.state.chats[otherUserId]) {
      this.state.chats[otherUserId] = [{
        id: 'msg_sys_' + Date.now(),
        sender: 'system',
        senderName: 'CampusHub System',
        text: `🤝 Collaboration request accepted! You can now chat directly regarding "${req.title}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
    }

    this.saveState();
    return true;
  }

  async declineRequest(requestId) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
      if (error) return false;
    }

    const req = this.state.requests.find(r => r.id === requestId);
    if (!req) return false;
    req.status = 'declined';
    this.saveState();
    return true;
  }

  // =============================================
  // UPDATE BOARD
  // =============================================
  getUpdates() {
    return this.state.updateBoard;
  }

  getUnreadUpdatesCount() {
    return this.state.updateBoard.filter(u => u.isNew).length;
  }

  async markUpdatesAsRead() {
    const sb = getSupabase();
    if (sb && this.state.currentUser) {
      await sb.from('updates').update({ is_new: false }).eq('is_new', true);
    }
    let changed = false;
    this.state.updateBoard.forEach(u => {
      if (u.isNew) { u.isNew = false; changed = true; }
    });
    if (changed) this.saveState();
  }

  async addUpdate(update) {
    const sb = getSupabase();
    if (sb) {
      const { data: profile } = await sb.from('profiles').select('role').eq('id', this.state.currentUser?.id).single();
      if (profile?.role !== 'admin') {
        return { success: false, message: 'Permission denied: Only Admin accounts can post updates.' };
      }

      const { data, error } = await sb.from('updates').insert({
        title: update.title.trim(),
        message: update.message.trim(),
        category: update.category || 'Event',
        image: update.image || '',
        link: update.link ? update.link.trim() : '',
        author: `Admin (${this.state.currentUser?.name || 'Faculty Coordinator'})`,
        is_new: true
      }).select().single();

      if (error) return { success: false, message: error.message };

      const mapped = this._mapUpdateFromDB(data);
      this.state.updateBoard.unshift(mapped);
      this.saveState();
      return { success: true, update: mapped };
    }

    // Fallback
    if (!this.state.currentUser || this.state.currentUser.role !== 'admin') {
      return { success: false, message: 'Permission denied: Only Admin accounts can post updates.' };
    }
    const newUpdate = {
      id: 'update_' + Date.now(),
      title: update.title.trim(),
      message: update.message.trim(),
      category: update.category || 'Event',
      image: update.image || null,
      link: update.link ? update.link.trim() : '',
      author: `Admin (${this.state.currentUser?.name || 'Faculty Coordinator'})`,
      timestamp: 'Just now',
      isNew: true
    };
    this.state.updateBoard.unshift(newUpdate);
    this.saveState();
    return { success: true, update: newUpdate };
  }

  // =============================================
  // CHAT
  // =============================================
  getChat(otherUserId) {
    return this.state.chats[otherUserId] || [];
  }

  async sendMessage(otherUserId, text) {
    if (!text || !text.trim() || !this.state.currentUser) return null;

    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from('chat_messages').insert({
        sender_id: this.state.currentUser.id,
        sender_name: this.state.currentUser.name,
        receiver_id: otherUserId,
        text: text.trim(),
        is_system: false
      }).select().single();

      if (error) {
        console.warn('Chat send failed:', error);
        return null;
      }

      // Optimistic local update
      if (!this.state.chats[otherUserId]) this.state.chats[otherUserId] = [];
      const localMsg = {
        id: data.id,
        sender: this.state.currentUser.id,
        senderName: this.state.currentUser.name,
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.state.chats[otherUserId].push(localMsg);
      this.saveState();

      // Auto simulated response for demo
      if (otherUserId.startsWith('student_') || otherUserId.startsWith('admin_') || otherUserId.includes('-')) {
        const targetUser = this.state.registeredUsers.find(u => u.id === otherUserId) || { name: 'Collaborator' };
        setTimeout(async () => {
          const replies = [
            `Hi ${this.state.currentUser.name}! Got your message. Let's sync up in the lab.`,
            `Sounds great! I'll review the project documentation and push the changes.`,
            `Awesome proposal! Let's schedule a quick call to divide the project modules.`,
            `Received! I'll bring the hardware sensors for our testing session tomorrow.`
          ];
          const randomReply = replies[Math.floor(Math.random() * replies.length)];

          // Try to send via Supabase
          const sbInner = getSupabase();
          if (sbInner) {
            await sbInner.from('chat_messages').insert({
              sender_id: otherUserId,
              sender_name: targetUser.name,
              receiver_id: this.state.currentUser.id,
              text: randomReply,
              is_system: false
            });
          }

          // Also update local state
          if (!this.state.chats[otherUserId]) this.state.chats[otherUserId] = [];
          this.state.chats[otherUserId].push({
            id: 'msg_rep_' + Date.now(),
            sender: otherUserId,
            senderName: targetUser.name,
            text: randomReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          this.saveState();
        }, 1000);
      }

      return localMsg;
    }

    // Fallback: localStorage chat
    if (!this.state.chats[otherUserId]) this.state.chats[otherUserId] = [];
    const newMsg = {
      id: 'msg_' + Date.now(),
      sender: this.state.currentUser.id,
      senderName: this.state.currentUser.name,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.state.chats[otherUserId].push(newMsg);
    this.saveState();

    // Auto reply (localStorage fallback)
    if (otherUserId.startsWith('student_') || otherUserId.startsWith('admin_')) {
      const targetUser = this.state.registeredUsers.find(u => u.id === otherUserId) || { name: 'Collaborator' };
      setTimeout(() => {
        const replies = [
          `Hi ${this.state.currentUser.name}! Got your message. Let's sync up in the lab.`,
          `Sounds great! I'll review the project documentation and push the changes.`
        ];
        this.state.chats[otherUserId].push({
          id: 'msg_rep_' + Date.now(),
          sender: otherUserId,
          senderName: targetUser.name,
          text: replies[Math.floor(Math.random() * replies.length)],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        this.saveState();
      }, 1000);
    }

    return newMsg;
  }

  // =============================================
  // RESET
  // =============================================
  resetAllData() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveState();
  }

  // =============================================
  // GET ACCOUNT COUNTS (synchronous — uses local state for rendering)
  // =============================================
  getStudentAccountsCount() {
    if (this.state.registeredUsers && this.state.registeredUsers.length > 0) {
      return this.state.registeredUsers.filter(u => u.role === 'student').length;
    }
    return 0;
  }

  getAdminAccountsCount() {
    if (this.state.registeredUsers && this.state.registeredUsers.length > 0) {
      return this.state.registeredUsers.filter(u => u.role === 'admin').length;
    }
    return 0;
  }

  getRegisteredUsers() {
    return this.state.registeredUsers;
  }
}

export const store = new CampusHubStore();
