# CampusHub 1.0 🎓📱

> **Your campus, one tap away.**  
> A unified web platform for college students to study, showcase projects, find teammates, and stay updated — combining the familiarity of WhatsApp (chat, requests, real-time feel) and Instagram (feed, profile, media-first cards) into one student-focused product.

---

## ✨ Features

- **🏠 Update Board & Feed**: Instagram-inspired feed for campus-wide notices, club announcements, and academic updates with category tags, likes, and attachments.
- **🚀 Project Showcase**: Showcase semester projects, hackathon prototypes, and research work with tech stack badges, live demo links, and GitHub links.
- **🤝 Collaboration Board**: Find teammates for hackathons, study groups, and open-source projects with role requirements and one-click join requests.
- **💬 Direct Requests & Chat**: WhatsApp-style direct messaging and collaboration request inbox with instant status updates (Pending, Accepted, Rejected).
- **👤 Student & Admin Profiles**: Customizable profiles with department, year, skills, projects, and role-based permissions.
- **👑 Dual Role Experience**: Seamlessly switch between **Student** view and **Administrator** view to manage campus posts, verify announcements, and moderate content.
- **📱 Responsive Mobile-First Design**: Includes a built-in Phone Simulator Bezel and responsive wide-screen layout.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System with soft mint tints `#E1F5EE`, teal-green accents `#0F6E56`, and Space Grotesk / Inter typography)
- **State & Logic**: Vanilla JavaScript ES Modules with a centralized reactive store and persistent `localStorage` support.
- **Data**: Preloaded with 10 student accounts and 4 administrator accounts across multiple engineering departments.

---

## 🚀 Quickstart & Local Run

To run CampusHub locally:

### Option 1: Python HTTP Server
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Node / Live Server / npx
```bash
npx serve .
```

---

## 👥 Demo Accounts

CampusHub comes preloaded with switchable demo profiles:
- **Admin**: `admin.cse@campus.edu` (Faculty Coordinator)
- **Students**: 10 profiles across CSE, ECE, ME, and Civil (1st to 4th year)

Use the top toolbar to switch roles or choose accounts instantly!