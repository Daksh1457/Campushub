/**
 * CampusHub 1.0 — Reactive State Store & Business Logic
 * Adhering to CampusHub_Build_Prompt_2.md:
 * - Supports exactly up to 10 Custom Student entries and 4 Custom Admin entries
 * - Role-based permissions (Section 10)
 * - Immediate reactive updates for Requests, Chat, Updates, Projects, Resources, Profile
 * - LocalStorage persistence
 */

import { INITIAL_STATE } from './mockData.js';

const STORAGE_KEY = 'campushub_v2_store';
const MAX_STUDENTS = 10;
const MAX_ADMINS = 4;

class CampusHubStore {
  constructor() {
    this.listeners = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure structure integrity
        return {
          registeredUsers: parsed.registeredUsers || [],
          currentUser: parsed.currentUser || null,
          projects: parsed.projects || INITIAL_STATE.projects,
          resources: parsed.resources || INITIAL_STATE.resources,
          collaborationPosts: parsed.collaborationPosts || INITIAL_STATE.collaborationPosts,
          requests: parsed.requests || [],
          updateBoard: parsed.updateBoard || INITIAL_STATE.updateBoard,
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
      try {
        fn(this.state);
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    });
  }

  getState() {
    return this.state;
  }

  // --- Account & Auth Management ---
  getRegisteredUsers() {
    return this.state.registeredUsers;
  }

  getStudentAccountsCount() {
    return this.state.registeredUsers.filter(u => u.role === 'student').length;
  }

  getAdminAccountsCount() {
    return this.state.registeredUsers.filter(u => u.role === 'admin').length;
  }

  registerUser(userData) {
    const role = userData.role || 'student';
    const currentStudents = this.getStudentAccountsCount();
    const currentAdmins = this.getAdminAccountsCount();

    if (role === 'student' && currentStudents >= MAX_STUDENTS) {
      return { success: false, message: `Maximum student limit reached (${MAX_STUDENTS} students max).` };
    }
    if (role === 'admin' && currentAdmins >= MAX_ADMINS) {
      return { success: false, message: `Maximum admin limit reached (${MAX_ADMINS} admins max).` };
    }

    const existing = this.state.registeredUsers.find(
      u => u.email.toLowerCase() === userData.email.toLowerCase()
    );
    if (existing) {
      return { success: false, message: 'An account with this College Email already exists.' };
    }

    const newUser = {
      id: `${role}_${Date.now()}`,
      role: role,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      enrollment: userData.enrollment ? userData.enrollment.trim() : (role === 'admin' ? 'Admin / Faculty' : `21012011${Math.floor(1000 + Math.random() * 9000)}`),
      department: userData.department || 'Computer Engineering',
      semester: userData.semester || (role === 'admin' ? 'Faculty / HoD' : 'Semester 6'),
      avatar: userData.avatar || (role === 'admin' 
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' 
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'),
      skills: userData.skills || (role === 'admin' ? ['Academic Coordination', 'Research', 'Faculty Advisor'] : ['Frontend Dev', 'UI/UX', 'Python']),
      bio: userData.bio || `${role === 'admin' ? 'Faculty Admin' : 'Student'} at GTU engineering campus.`
    };

    this.state.registeredUsers.push(newUser);
    this.state.currentUser = newUser;
    this.saveState();
    return { success: true, user: newUser };
  }

  login(email, password) {
    const user = this.state.registeredUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      return { success: false, message: 'No account found with this email. Please Sign Up first.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Incorrect password. Try again or click Forgot Password.' };
    }

    this.state.currentUser = user;
    this.saveState();
    return { success: true, user };
  }

  logout() {
    this.state.currentUser = null;
    this.saveState();
  }

  switchUser(userId) {
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

  resetPassword(email, newPassword) {
    const user = this.state.registeredUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'No account registered with this email address.' };
    }
    user.password = newPassword;
    this.saveState();
    return { success: true, message: 'Password reset successfully! You can now log in.' };
  }

  getCurrentUser() {
    return this.state.currentUser;
  }

  isAdmin() {
    return this.state.currentUser && this.state.currentUser.role === 'admin';
  }

  // --- Profile Module ---
  updateProfile(profileData) {
    if (!this.state.currentUser) return false;

    // Update in registeredUsers
    const userInList = this.state.registeredUsers.find(u => u.id === this.state.currentUser.id);
    if (userInList) {
      Object.assign(userInList, profileData);
    }
    Object.assign(this.state.currentUser, profileData);
    this.saveState();
    return true;
  }

  addSkill(skillName) {
    if (!this.state.currentUser || !skillName.trim()) return false;
    const skill = skillName.trim();
    if (!this.state.currentUser.skills) this.state.currentUser.skills = [];
    if (!this.state.currentUser.skills.includes(skill)) {
      this.state.currentUser.skills.push(skill);
      const userInList = this.state.registeredUsers.find(u => u.id === this.state.currentUser.id);
      if (userInList) userInList.skills = this.state.currentUser.skills;
      this.saveState();
      return true;
    }
    return false;
  }

  removeSkill(skillName) {
    if (!this.state.currentUser || !this.state.currentUser.skills) return false;
    this.state.currentUser.skills = this.state.currentUser.skills.filter(s => s !== skillName);
    const userInList = this.state.registeredUsers.find(u => u.id === this.state.currentUser.id);
    if (userInList) userInList.skills = this.state.currentUser.skills;
    this.saveState();
    return true;
  }

  // --- Projects Module (4 Tabs: Hardware, Software, Hybrid, All) ---
  getProjects(tab = 'All') {
    if (!tab || tab === 'All') {
      return this.state.projects;
    }
    return this.state.projects.filter(p => p.category.toLowerCase() === tab.toLowerCase());
  }

  addProject(project) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only Admin accounts can upload projects.' };
    }

    const newProj = {
      id: 'proj_' + Date.now(),
      name: project.name.trim(),
      category: project.category || 'Software',
      image: project.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      components: project.components ? project.components.trim() : 'Standard Hardware / Software Components',
      description: project.description ? project.description.trim() : 'Engineering project showcase.',
      author: project.author ? project.author.trim() : (this.state.currentUser ? this.state.currentUser.name : 'Engineering Student Team'),
      authorDept: this.state.currentUser ? this.state.currentUser.department : 'Engineering',
      uploadedBy: `Admin (${this.state.currentUser ? this.state.currentUser.name : 'Admin'})`,
      date: new Date().toISOString().split('T')[0],
      tags: [project.category || 'Software', 'Engineering']
    };

    this.state.projects.unshift(newProj);
    this.saveState();
    return { success: true, project: newProj };
  }

  // --- Resources Module (4 Categories) ---
  getResources(category = 'Mid-Sem Papers') {
    return this.state.resources.filter(r => r.category === category);
  }

  addResource(resource) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only Admin accounts can upload academic resources.' };
    }

    const newRes = {
      id: 'res_' + Date.now(),
      category: resource.category || 'Mid-Sem Papers',
      subjectName: resource.subjectName.trim(),
      subjectCode: resource.subjectCode.trim(),
      semester: resource.semester || 'Semester 5',
      year: resource.year || '2026',
      fileName: resource.fileName || `${resource.subjectCode}_Academic_Paper.pdf`,
      fileSize: resource.fileSize || '3.2 MB',
      downloads: 0,
      uploadedBy: `Admin (${this.state.currentUser ? this.state.currentUser.name : 'Admin'})`,
      summary: resource.summary || `GTU curriculum resource for ${resource.subjectName} (${resource.subjectCode}).`
    };

    this.state.resources.unshift(newRes);
    this.saveState();
    return { success: true, resource: newRes };
  }

  incrementDownloads(resourceId) {
    const res = this.state.resources.find(r => r.id === resourceId);
    if (res) {
      res.downloads = (res.downloads || 0) + 1;
      this.saveState();
    }
  }

  // --- Collaboration Module ---
  getCollabPosts() {
    return this.state.collaborationPosts;
  }

  addCollabPost(post) {
    const user = this.state.currentUser || {
      id: 'guest',
      name: 'Student',
      department: 'Computer Engineering',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };

    const newPost = {
      id: 'collab_' + Date.now(),
      title: post.title.trim(),
      roleNeeded: post.roleNeeded.trim(),
      authorId: user.id,
      authorName: user.name,
      authorDept: user.department,
      authorAvatar: user.avatar,
      description: post.description.trim(),
      tags: post.tags || [post.roleNeeded.trim(), 'Collaboration', 'GTU'],
      timestamp: 'Just now',
      requestsCount: 0
    };

    this.state.collaborationPosts.unshift(newPost);
    this.saveState();
    return { success: true, post: newPost };
  }

  // --- Requests Module (Collaboration & Connection Requests) ---
  getSentRequests() {
    if (!this.state.currentUser) return [];
    return this.state.requests.filter(
      r => r.fromUser && r.fromUser.id === this.state.currentUser.id && r.status === 'pending'
    );
  }

  getReceivedRequests() {
    if (!this.state.currentUser) return [];
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

  sendCollabRequest(postId, note = '') {
    if (!this.state.currentUser) {
      return { success: false, message: 'Please log in to send collaboration requests.' };
    }

    const post = this.state.collaborationPosts.find(p => p.id === postId);
    if (!post) {
      return { success: false, message: 'Collaboration post not found.' };
    }

    if (post.authorId === this.state.currentUser.id) {
      return { success: false, message: 'You cannot send a request to your own post.' };
    }

    // Check if already requested
    const existing = this.state.requests.find(
      r => r.collabId === postId && r.fromUser && r.fromUser.id === this.state.currentUser.id
    );
    if (existing) {
      return { success: false, message: 'You have already sent a request for this post.' };
    }

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
      toUser: {
        id: post.authorId,
        name: post.authorName,
        department: post.authorDept
      },
      status: 'pending',
      timestamp: 'Just now',
      note: note.trim() || `Hi ${post.authorName}, I would love to collaborate on "${post.title}". My skills include ${(this.state.currentUser.skills || []).slice(0, 3).join(', ')}.`
    };

    this.state.requests.unshift(newReq);
    this.saveState();
    return { success: true, request: newReq };
  }

  acceptRequest(requestId) {
    const req = this.state.requests.find(r => r.id === requestId);
    if (!req) return false;

    req.status = 'accepted';
    req.acceptedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Identify the counterparty
    const otherUser = (this.state.currentUser && req.fromUser.id === this.state.currentUser.id) 
      ? req.toUser 
      : req.fromUser;
    
    const otherUserId = otherUser.id;

    // Initialize 1:1 chat if not existing
    if (!this.state.chats[otherUserId]) {
      this.state.chats[otherUserId] = [
        {
          id: 'msg_sys_' + Date.now(),
          sender: 'system',
          senderName: 'CampusHub System',
          text: `🤝 Collaboration request accepted! You can now chat directly regarding "${req.title}".`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }

    this.saveState();
    return true;
  }

  declineRequest(requestId) {
    const req = this.state.requests.find(r => r.id === requestId);
    if (!req) return false;

    req.status = 'declined';
    this.saveState();
    return true;
  }

  // --- Update Board Module (Admin-only posting & Coral Notification Badges) ---
  getUpdates() {
    return this.state.updateBoard;
  }

  getUnreadUpdatesCount() {
    return this.state.updateBoard.filter(u => u.isNew).length;
  }

  markUpdatesAsRead() {
    let changed = false;
    this.state.updateBoard.forEach(u => {
      if (u.isNew) {
        u.isNew = false;
        changed = true;
      }
    });
    if (changed) {
      this.saveState();
    }
  }

  addUpdate(update) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only Admin accounts can post updates.' };
    }

    const newUpdate = {
      id: 'update_' + Date.now(),
      title: update.title.trim(),
      message: update.message.trim(),
      category: update.category || 'Event',
      image: update.image || null,
      link: update.link ? update.link.trim() : '',
      author: `Admin (${this.state.currentUser ? this.state.currentUser.name : 'Faculty Coordinator'})`,
      timestamp: 'Just now',
      isNew: true
    };

    this.state.updateBoard.unshift(newUpdate);
    this.saveState();
    return { success: true, update: newUpdate };
  }

  // --- WhatsApp-Style 1:1 Chat Module ---
  getChat(otherUserId) {
    return this.state.chats[otherUserId] || [];
  }

  sendMessage(otherUserId, text) {
    if (!text || !text.trim() || !this.state.currentUser) return null;

    if (!this.state.chats[otherUserId]) {
      this.state.chats[otherUserId] = [];
    }

    const newMsg = {
      id: 'msg_' + Date.now(),
      sender: this.state.currentUser.id,
      senderName: this.state.currentUser.name,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.state.chats[otherUserId].push(newMsg);
    this.saveState();

    // Auto simulated response for interactive demo testing
    if (otherUserId.startsWith('student_') || otherUserId.startsWith('admin_')) {
      const targetUser = this.state.registeredUsers.find(u => u.id === otherUserId) || { name: 'Collaborator' };
      setTimeout(() => {
        const replies = [
          `Hi ${this.state.currentUser.name}! Got your message. Let's sync up in the lab.`,
          `Sounds great! I'll review the project documentation and push the changes.`,
          `Awesome proposal! Let's schedule a quick call to divide the project modules.`,
          `Received! I'll bring the hardware sensors for our testing session tomorrow.`
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        
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

    return newMsg;
  }

  resetAllData() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    localStorage.removeItem(STORAGE_KEY);
    this.saveState();
  }
}

export const store = new CampusHubStore();
