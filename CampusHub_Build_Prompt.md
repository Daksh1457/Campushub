# CampusHub 1.0 — Project Brief (for Google Antigravity)

## 0. One-line pitch
CampusHub 1.0 is a single web platform for college students to study, showcase projects, find teammates, and stay updated — combining the familiarity of WhatsApp (chat, requests) and Instagram (feed, profile, media-first cards) into one student-focused product.

---

## 1. Design Language (UI/UX Direction)
Build the interface as a hybrid of WhatsApp and Instagram, with a light, polished, "finished product" feel rather than a generic dashboard/admin panel look.

**Color palette (light theme):**
- Background: white / near-white (`#FFFFFF`).
- Primary accent: teal-green (`#0F6E56` for buttons, active states, filled elements; `#E1F5EE` as a soft mint tint for section headers and card backgrounds; `#9FE1CB` for borders/dashed outlines).
- Text: near-black for primary text (`#2C2C2A`), muted gray for secondary/meta text (`#888780` / `#B4B2A9`).
- One small warm accent (coral, `#D85A30`) reserved only for notification badges/dots — used sparingly so it stands out.
- No gradients or drop shadows — keep surfaces flat; depth comes from the mint-tint vs. white contrast, not shadows.

**Layout & structure:**
- Mobile-first, card-based, generously rounded corners (12–16px on cards, 20–28px on screen/device containers).
- Bottom tab navigation bar with 5 icons on mobile (Home, Projects, Collaboration, Requests, Profile), collapsible left sidebar on desktop.
- Section headers (Dashboard, Projects, Collaboration, Profile) sit on a soft mint-tint band (`#E1F5EE`) rather than plain white, to visually separate header from content.
- A rounded-square logo mark (teal fill, white initials, e.g. "CH") appears on the login screen and dashboard header for brand consistency.

**Feed & cards (Instagram-inspired):**
- Update Board and Collaboration Board render as a vertical scrolling feed of cards on a very light mint/white background — each card has an avatar + name header, timestamp, body content (text/image/link).
- Dashboard's quick-access tiles use soft mint-tint icon backgrounds with teal icons, on white cards.

**Profile (Instagram-inspired):**
- Profile header sits on the mint-tint band; circular profile photo (white border ring) centered at top, name + enrollment + department below it in teal/gray text.
- Skill tags render as filled teal pills below the header.
- A grid of the student's own showcased projects underneath, like an Instagram profile grid.

**Chat & Requests (WhatsApp-inspired):**
- Collaboration chat and Request section use a WhatsApp-style chat list (avatar, name, last message preview, timestamp) opening into a bubble-style chat screen: received messages in light mint bubbles (left-aligned), sent messages in solid teal bubbles with white text (right-aligned).
- Request cards use filled teal "Request/Accept" buttons; "Decline" stays as a plain outlined button.

**Navigation & notifications:**
- Bottom nav bar icons are muted gray by default, teal when active/selected.
- Update Board notifications surface as a bell icon with a small coral badge dot (Instagram-notification style).
- Requests surface as a chat-bubble icon with an unread badge (WhatsApp-style).

**Typography:**
- One clean sans-serif (e.g. Inter/Poppins). Medium weight for names/headers, regular for body text. Sentence case throughout (no ALL CAPS labels).

---

## 2. Authentication Flow
1. **Landing screen:** Sign Up / Log In toggle.
2. **Fields:** College email ID, Password.
3. **Below fields:** a CAPTCHA check, then Sign In and Log In buttons.
4. **Forgot Password link:** opens a screen asking for email ID → sends an OTP to that email → OTP entry screen → reset password.
5. On successful login, route straight to the Dashboard.
6. **Account entries:** The build should support exactly **10 student accounts and 4 admin accounts**. These account entries will be created and entered directly by us using our own login credentials — Antigravity/the build should NOT auto-generate or seed the 10 student accounts. It only needs to provide the working sign-up/login flow so we can add these entries ourselves.

---

## 3. Dashboard (Home)
After login, show a dashboard with clear entry points (cards or nav) to:
- Projects
- Resources
- Collaboration
- Update Board
- Profile
- Requests

---

## 4. Projects Module
- Landing view for Projects shows **4 tabs**: `Hardware`, `Software`, `Hybrid`, `All`.
- `All` aggregates every project from the other three tabs.
- **Admin permissions:** only the admin can upload/add a project. Each project entry has:
  - Project Name
  - Project Image (upload)
  - Components Used
  - Description
- **Student permissions:** students can browse/view all project data in any tab, but cannot upload, edit, or delete.
- Uploaded projects appear immediately to all users after admin hits Submit.

---

## 5. Resources Module
- Landing view for Resources shows **4 options**: `Mid-Sem Papers`, `GTU PYQs`, `Handwritten Notes`, `Reference Books`.
- Each option opens the same table/list format with columns:
  - Subject Name
  - Subject Code
  - Semester
  - Year
  - Open Access (link/button)
- Clicking "Open Access" opens the actual PDF/file.
- **Admin permissions:** only admin can input/upload data into any of the four categories.
- **Student permissions:** students can only view and open the files.

---

## 6. Collaboration Module
- A post-board where students look for collaborators (e.g. "Need a UI/UX designer," "Need a Frontend Developer," "Need Hardware help").
- An **"Add Post"** button at the top of the section.
- Post fields: description of what's needed, and the poster's name shown in the post itself (e.g. "posted by *(name)*").
- Both students and admin can view all posted requests.
- Each post has a **Request** button — a viewer can send a collaboration request on a post.
- A **chat** unlocks between the two students only after both sides have accepted the request (WhatsApp-style chat UI, see Section 1).

---

## 7. Update Board Module
- **Admin-only posting.** Admin can post updates about: upcoming events, hackathons, competitions, workshops.
- Each update supports: a text message, an attached image, and/or a link.
- Students can only view the Update Board (read-only feed, Instagram-style cards).
- When admin posts a new update, all students get a **notification** (bell icon badge).

---

## 8. Profile Module
- Circular profile photo upload at the top.
- Three input fields beside/below the photo:
  1. Full Name
  2. Enrollment Number (college-issued)
  3. Department
- Profile is visible to all other students.
- Below the basic info, a **Skills** section where the student adds skill tags themselves (e.g. `Frontend Dev`, `UI/UX`, `Arduino`) — rendered as chips.

---

## 9. Request Module
- Students can send collaboration/connection requests to other students.
- Other students can Accept or Decline.
- Layout:
  - Top: all requests the current user has sent, currently pending.
  - Below: recently accepted requests.
- Accepting a request unlocks the 1:1 chat (see Section 6/1).

---

## 10. Roles & Permissions Summary
*(Up to 4 admin accounts share identical admin permissions below — any of the 4 can perform admin actions.)*

| Section | Admin | Student |
|---|---|---|
| Projects | Add/edit/upload | View only |
| Resources | Add/edit/upload | View + open files |
| Collaboration | View + participate | Post, request, chat |
| Update Board | Post updates | View + get notified |
| Profile | Own profile only | Own profile only, viewable by others |
| Requests | N/A (student-to-student) | Send/accept/decline, chat |

---

## 11. Prototype Scope — 10 Student Demo Build
Since this is being pitched/demoed with a small group (10 students) rather than launched at full college scale, simplify the first build to this checklist:

1. **No auto-seeded accounts:** Do **not** pre-create or mock the student accounts. The platform should be built to support exactly **10 student accounts and 4 admin accounts**, but all 10 student entries (and the 4 admin logins) will be created and entered by us directly, using our own login credentials. Skip real email/OTP delivery — a fake/mock OTP screen (e.g. always accept `1234`) is enough for the demo.
2. **Auth:** keep the sign-up/login/CAPTCHA/forgot-password *screens* fully designed and working, wired to real account creation — not to any auto-seeded/mock accounts. Support up to 10 student logins and 4 admin logins, all entered by us.
3. **Projects:** pre-load 4–6 sample projects across Hardware/Software/Hybrid so the tabs and "All" view aren't empty; admin upload flow should work live for the demo.
4. **Resources:** pre-load 2–3 sample subjects per category (Mid-Sem/GTU PYQ/Notes/Reference) with real or placeholder PDFs so "Open Access" works.
5. **Collaboration:** have 2–3 pre-seeded posts, but the Add Post → Request → Accept → Chat flow should work live end-to-end between two of our own entered student accounts — this is likely your best live-demo moment.
6. **Update Board:** admin posts one live update during the demo to show the notification badge appearing for a logged-in student in real time.
7. **Profile:** once we've entered the 10 student accounts, each should be able to fill in their own profile (photo, name, enrollment, department, skills) so the "view other student's profile" flow looks populated — the build just needs to make this easy to fill in, not pre-fill it itself.
8. **Requests:** show at least one pending and one accepted request pre-seeded, plus the ability to send a new one live.
9. **Skip for v1 prototype:** payment/marketplace features, badge/reputation system, real email delivery, admin analytics — these can be mentioned as "roadmap" in the pitch but don't need to be built for the 10-student demo.

---

## 12. Recommended Tech Stack
Give Antigravity a concrete stack so its agents don't have to guess:
- **Frontend:** React + Tailwind CSS + shadcn/ui (clean components, easy to get the WhatsApp/Instagram look fast).
- **Backend/DB:** Supabase (Postgres + Auth + Storage) — handles the college-email auth, file/image uploads (project images, PDFs, profile photos), and real-time updates (good fit for chat + notification badges) with minimal custom backend code.
- **Hosting for demo:** Vercel or Antigravity's own preview/browser-verification loop.

---

## 13. How to Run This in Antigravity (Mission Plan)
Antigravity works best when you don't hand it the whole spec as one giant task — you break it into missions, review each Artifact (plan/diff/screenshot), then move to the next. Suggested sequence, feeding this file in as project context each time:

1. **Mission 1 — Scaffold:** "Set up a React + Tailwind + shadcn/ui project wired to Supabase (auth, database, storage). Create the bottom nav / sidebar shell and empty routes for Dashboard, Projects, Resources, Collaboration, Update Board, Profile, Requests, per Section 1 and Section 3 of CampusHub_Build_Prompt.md."
2. **Mission 2 — Auth:** Build Section 2 (sign up/login/CAPTCHA/forgot password) against Supabase Auth, supporting exactly 10 student accounts and 4 admin accounts per Section 11 — with account entries created by us directly rather than auto-seeded.
3. **Mission 3 — Projects + Resources modules:** Build Sections 4 and 5, admin-vs-student permissions from Section 10, seeded sample data.
4. **Mission 4 — Collaboration + Requests (priority):** Build Sections 6 and 9 end-to-end, including the WhatsApp-style chat unlock logic — this is the flow to get rock-solid for the demo.
5. **Mission 5 — Update Board + Profile:** Build Sections 7 and 8, including the notification badge behavior.
6. **Mission 6 — Polish + verify:** Ask the agent to browser-test each flow in Section 11's checklist end-to-end and produce a walkthrough Artifact you can review before your pitch.

Attach or paste this whole file into Antigravity's task/mission context at the start of Mission 1 so every later mission can reference section numbers.
