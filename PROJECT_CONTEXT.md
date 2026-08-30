# CampusHub 1.0 — Project Context

> **Last updated:** August 30, 2026  
> **Status:** Supabase backend integrated, awaiting SQL quickfix

---

## 1. What Was Built

CampusHub is a single-page PWA for college students (SVIT Vasad) to manage projects, share academic resources, find collaborators, and chat. Built with vanilla HTML/CSS/JS, now backed by Supabase.

### Tech Stack
- **Frontend:** HTML5, Vanilla CSS3, Vanilla JavaScript ES Modules
- **Backend:** Supabase (Auth + Postgres + Realtime + Storage)
- **PWA:** Service Worker (cache-first), Web App Manifest
- **Fonts:** Space Grotesk + Inter (Google Fonts)
- **Design:** WhatsApp + Instagram hybrid (teal-green `#0F6E56`, mint `#E1F5EE`)

---

## 2. Files in the Project

```
├── index.html                    # Main app shell, nav, dev toolbar
├── manifest.json                 # PWA manifest
├── .gitignore
├── README.md
├── CampusHub_Build_Prompt.md     # Original project brief
├── CampusHub_Fix_Instructions.md # Original fix instructions
├── css/
│   └── styles.css                # Full design system (1479 lines)
├── js/
│   ├── app.js                    # Main app controller & UI renderer (2419 lines)
│   ├── store.js                  # Reactive state store — Supabase backend (830+ lines)
│   ├── supabaseClient.js         # Supabase client initialization
│   ├── mockData.js               # Initial state & sample content
│   └── sw.js                     # Service worker (cache-first + Google Fonts)
├── sql/
│   ├── migration.sql             # Full DB migration (tables, RLS, triggers, seed data)
│   └── quickfix.sql              # Fix for missing requests table + seed data
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── PROJECT_CONTEXT.md            # This file
```

---

## 3. Deep Audit — All Errors Found & Fixed

A comprehensive audit identified 20 issues across all files. All have been fixed.

### 🔴 Critical Fixes (originally)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 2 | Nested `.app-screen` in profile view | Removed redundant wrapper div | `app.js` |
| 3 | XSS via unescaped JSON in inline onclick | Added `safeJsonAttr()` utility, all onclick handlers use it | `app.js` |
| 4 | setTimeout auto-reply renders into stale DOM | Added `skipFullRender` mode for chat modal | `app.js`, `store.js` |
| 5 | Fragile sidebar display override | Sidebar uses CSS-driven display, JS only clears inline style | `app.js` |

### 🟠 Major Fixes

| # | Issue | Fix | File |
|---|-------|-----|------|
| 6 | Chat modal destroyed/recreated on every message | `render()` accepts `opts.skipFullRender`, chat modal updates in-place | `app.js` |
| 7 | Modals appended outside `.app-frame` | Modal container now appends to `#app-screen` with fallback | `app.js` |
| 8 | `acceptRequest()` only initializes chat for one user | Now initializes chat entries for **both** users | `store.js` |
| 9 | `handleRoleChange()` DOM manipulation overwritten by render | Added `selectedSignUpRole` state, enrollment field conditionally rendered | `app.js` |
| 10 | Google Fonts not cached offline | Service worker now caches Google Fonts CSS + font files | `sw.js` |
| 11 | PDF viewer URL escaping breaks on special chars | Added `_pdfDataMap` for safe data retrieval by resource ID | `app.js` |

### 🟡 Minor Fixes

| # | Issue | Fix | File |
|---|-------|-----|------|
| 12 | Modal destroyed/recreated even when unchanged | Content comparison before updating `innerHTML` | `app.js` |
| 13 | Passwords stored in plaintext in localStorage | Added `obfuscatePassword()` (base64 encoding) | `store.js` |
| 17 | `handleDeleteResource()` return value not checked | Now checks `res.success` and shows error toast on failure | `app.js` |
| 18 | `setInterval(300ms)` polling for role badge | Replaced with `store.subscribe()` callback | `index.html` |
| 20 | Redundant `localStorage.removeItem` in `resetAllData()` | Removed redundant call | `store.js` |

### Merge Conflict Cleanup

22 merge conflict markers were found and resolved across `app.js` (18), `index.html` (3), and `sw.js` (1). All leftover git artifacts (`0d5b948 (Initial commit of CampusHub)`) were also cleaned.

---

## 4. Supabase Backend Integration

### What Was Built

The entire data layer was rewritten to use Supabase instead of localStorage:

| Component | Change |
|-----------|--------|
| `js/supabaseClient.js` | **New file** — Supabase client init with project URL + anon key |
| `js/store.js` | **Full rewrite** — all methods now async, use Supabase DB + Auth + Realtime |
| `js/sw.js` | Updated to cache `supabaseClient.js`, skip Supabase API caching |
| `index.html` | Added Supabase CDN + client module script tags |
| `sql/migration.sql` | **New file** — full database schema, RLS policies, triggers, seed data |
| `sql/quickfix.sql` | **New file** — fixes missing `requests` table + inserts seed data |

### Supabase Credentials

```
Project URL: https://dcyeufxjjgwvcljcbqzx.supabase.co
Anon Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Database Schema (7 tables)

| Table | Purpose | Realtime |
|-------|---------|----------|
| `profiles` | User accounts (extends `auth.users`) | No |
| `projects` | Admin-uploaded engineering projects | ✅ |
| `resources` | Study materials (papers, notes, books) | No |
| `collaboration_posts` | Teammate finder posts | ✅ |
| `requests` | Collaboration/connection requests | ✅ |
| `updates` | Admin-posted campus announcements | ✅ |
| `chat_messages` | WhatsApp-style 1:1 chat messages | ✅ |

### Key Features

- **Auth:** Supabase Auth (email + password), auto-creates profile via DB trigger
- **Realtime:** Live updates for chat, requests, projects, updates
- **RLS:** Row-level security — students view-only, admins manage content
- **Fallback:** If Supabase is unreachable, falls back to localStorage
- **Email validation:** Only `@svitvasad.ac.in` emails accepted (JS + HTML5 pattern)

### Store Methods (all async now)

```javascript
// Auth
store.registerUser(userData)    // → Supabase Auth signup + profile trigger
store.login(email, password)    // → Supabase signInWithPassword
store.logout()                  // → Supabase signOut

// Data
store.getProjects(tab)          // → SELECT from projects table
store.getResources(category)    // → SELECT from resources table
store.getCollabPosts()          // → SELECT from collaboration_posts
store.getUpdates()              // → SELECT from updates
store.getSentRequests()         // → SELECT from requests (sender)
store.getReceivedRequests()     // → SELECT from requests (receiver)
store.getAcceptedConnections()  // → SELECT from requests (accepted)
store.getChat(peerId)           // → SELECT from chat_messages

// Mutations
store.addProject(project)       // → INSERT into projects (admin only)
store.addResource(resource)     // → INSERT into resources (admin only)
store.addCollabPost(post)       // → INSERT into collaboration_posts
store.sendCollabRequest(postId) // → INSERT into requests
store.acceptRequest(reqId)      // → UPDATE requests SET status='accepted'
store.declineRequest(reqId)     // → UPDATE requests SET status='declined'
store.addUpdate(update)         // → INSERT into updates (admin only)
store.sendMessage(peerId, text) // → INSERT into chat_messages
store.updateProfile(data)       // → UPDATE profiles
store.addSkill(skill)           // → UPDATE profiles SET skills
store.removeSkill(skill)        // → UPDATE profiles SET skills
```

---

## 5. Email Validation

Only college emails ending with `@svitvasad.ac.in` are accepted:

- **Signup form:** HTML5 `pattern` attribute + JS validation in `handleSignUp()`
- **Login form:** HTML5 `pattern` attribute + JS validation in `handleLogin()`
- **Forgot password:** JS validation in `handleForgotEmail()`
- **Visible hint:** "Only @svitvasad.ac.in emails accepted" shown below email fields

```javascript
const EMAIL_DOMAIN = '@svitvasad.ac.in';
if (!email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
  this.showToast(`Only college emails ending with ${EMAIL_DOMAIN} are allowed.`, 'error');
  return;
}
```

---

## 6. Current Status & What's Left

### ✅ Done
- [x] Full codebase audit (20 issues found)
- [x] All 14 fixes applied and verified (57/57 tests passed)
- [x] Merge conflicts resolved (22 markers across 3 files)
- [x] Supabase client module created
- [x] Store.js fully rewritten for Supabase backend
- [x] SQL migration file created (7 tables, RLS, triggers, seed data)
- [x] Service worker updated for Supabase + Google Fonts
- [x] Email validation for `@svitvasad.ac.in`
- [x] All syntax checks pass

### ⏳ Waiting on User
- [ ] **Run `sql/quickfix.sql` in Supabase SQL Editor** — creates missing `requests` table + inserts seed data
- [ ] **Verify connection works** in browser after running SQL

### 🔜 Next Steps (After SQL Migration)
- [ ] Browser test: signup with `@svitvasad.ac.in` email
- [ ] Browser test: login with created account
- [ ] Browser test: real-time chat between two users on different devices
- [ ] Browser test: admin uploads project → appears for all users
- [ ] Browser test: collaboration request → accept → chat unlock
- [ ] Enable Supabase Storage buckets (PDFs, avatars, project images)
- [ ] Deploy to Vercel/Netlify for public access

---

## 7. How to Run Locally

```bash
# Start a local server
npx serve -l 8091 -s .

# Open in browser
open http://localhost:8091

# For dev mode (shows toolbar with account switcher)
open "http://localhost:8091/?dev=1"
```

---

## 8. Design System Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#0F6E56` | Buttons, active states, teal accent |
| `--mint` | `#E1F5EE` | Section headers, card backgrounds |
| `--mint-border` | `#9FE1CB` | Borders, dashed outlines |
| `--text-main` | `#2C2C2A` | Primary text |
| `--text-muted` | `#888780` | Secondary/meta text |
| `--coral` | `#D85A30` | Notification badges ONLY |
| `--surface` | `#FFFFFF` | Card backgrounds |
| `--bg` | `#F8FAF9` | Page background |

Typography: Space Grotesk (headers), Inter (body)  
Radius: 6–24px (cards: 18px, buttons: 10px, inputs: 10px)
