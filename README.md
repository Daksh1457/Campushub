# CampusHub 1.0 🎓📱

> **Your campus, one tap away.**  
> A unified web platform for college students to study, showcase projects, find teammates, and stay updated — combining the familiarity of WhatsApp (chat, requests, real-time feel) and Instagram (feed, profile, media-first cards) into one student-focused Progressive Web App (PWA).

---

## ✨ Features

- **🏠 Update Board & Feed**: Instagram-inspired feed for campus-wide notices, club announcements, and academic updates with category tags, likes, and attachments.
- **🚀 Project Showcase**: Showcase semester projects, capstone prototypes, and research work with tech stack badges, live demo links, and GitHub links across Hardware, Software, and Hybrid categories.
- **🤝 Collaboration Board**: Find teammates for hackathons, study groups, and open-source projects with role requirements and one-click join requests.
- **💬 Direct Requests & WhatsApp Chat**: WhatsApp-style direct messaging and collaboration request inbox with instant status updates (Pending, Accepted, Declined) and automatic chat unlocking.
- **👤 Student & Admin Profiles**: Customizable profiles with department, enrollment number, semester, interactive skills tag manager, and showcased project portfolio.
- **👑 Dual Role Experience**: Role-based permissions for **Students** and **Faculty Administrators** (admin privileges for uploading academic resources and posting campus updates).
- **📱 Fully Responsive Design**: Fluid mobile layout, 600px centered tablet view, and 980px desktop view with dedicated left sidebar navigation (`.sidebar-nav`).
- **⚡ Installable PWA**: Progressive Web App with standalone manifest (`manifest.json`), high-res icons, and offline caching service worker (`js/sw.js`).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System with soft mint tints `#E1F5EE`, teal-green accents `#0F6E56`, and Space Grotesk / Inter typography).
- **PWA**: Web App Manifest (`manifest.json`), Service Worker (`js/sw.js`) with cache-first strategy.
- **State & Logic**: Vanilla JavaScript ES Modules with a centralized reactive store, persistent `localStorage`, and cross-tab real-time event synchronization.
- **Data**: Supports up to 10 custom student accounts and 4 custom admin accounts, registered live through the Sign Up screen — no accounts are pre-seeded.

---

## 🚀 Quickstart & Local Run

To run CampusHub locally:

### Option 1: Python HTTP Server
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Live Server / HTTP Server
```bash
npx serve .
```

---

## 👥 Account Model

CampusHub ships with **zero pre-created accounts**. On first load it lands on the **Sign Up** screen. Register up to 10 student accounts and 4 admin accounts directly through the app — each logs in with their own college email, password, and security CAPTCHA verification.

> **Developer Mode**: Append `?dev=1` to the URL (e.g. `http://localhost:3000?dev=1`) to display the developer helper toolbar for test data reset and frame preview.