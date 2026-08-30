-- CampusHub 1.0 — Supabase Database Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- =============================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  email TEXT NOT NULL,
  enrollment TEXT DEFAULT '',
  department TEXT DEFAULT 'Computer Engineering',
  semester TEXT DEFAULT 'Semester 6',
  avatar TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role, email, enrollment, department, avatar, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'enrollment', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Computer Engineering'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', ''),
    COALESCE(NEW.raw_user_meta_data->>'bio', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 2. PROJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Software' CHECK (category IN ('Hardware', 'Software', 'Hybrid')),
  image TEXT DEFAULT '',
  components TEXT DEFAULT '',
  description TEXT DEFAULT '',
  author TEXT DEFAULT '',
  author_dept TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. RESOURCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Mid-Sem Papers',
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  semester TEXT DEFAULT 'Semester 5',
  year TEXT DEFAULT '2026',
  file_name TEXT DEFAULT '',
  file_size TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  downloads INTEGER DEFAULT 0,
  uploaded_by TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. COLLABORATION POSTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS collaboration_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  role_needed TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_dept TEXT DEFAULT '',
  author_avatar TEXT DEFAULT '',
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  requests_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. REQUESTS TABLE (collaboration & connection)
-- =============================================
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'collaboration',
  collab_id UUID REFERENCES collaboration_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_user_name TEXT NOT NULL,
  from_user_email TEXT DEFAULT '',
  from_user_dept TEXT DEFAULT '',
  from_user_enrollment TEXT DEFAULT '',
  from_user_avatar TEXT DEFAULT '',
  from_user_skills TEXT[] DEFAULT '{}',
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_name TEXT NOT NULL,
  to_user_dept TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  note TEXT DEFAULT '',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. UPDATE BOARD TABLE (admin-only posting)
-- =============================================
CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'Event',
  image TEXT DEFAULT '',
  link TEXT DEFAULT '',
  author TEXT DEFAULT '',
  is_new BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. CHAT MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast chat retrieval between two users
CREATE INDEX IF NOT EXISTS idx_chat_messages_participants
  ON chat_messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at
  );

-- =============================================
-- 8. SEED DATA (mock projects, resources, updates)
-- =============================================
-- Projects (only if table is empty)
INSERT INTO projects (name, category, image, components, description, author, author_dept, uploaded_by, tags, created_at)
SELECT * FROM (VALUES
  ('Autonomous Agro-Drone with Multi-Spectral LiDAR', 'Hardware', 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80', 'ESP32 microcontroller, Pixhawk 4 Flight Controller, LiDAR Lite v3, Neo-M8N GPS Module, 4S 5000mAh LiPo Battery, Carbon Fiber Frame', 'An autonomous precision agriculture drone capable of live NDVI crop health analysis, soil moisture telemetry, and automated flight path waypoint tracking.', 'Aarav Mehta & Team', 'Electronics & Communication', 'Admin (Prof. Rajesh Mehta)', ARRAY['Drones','LiDAR','Embedded C','Precision Agriculture']::TEXT[], '2026-08-15'),
  ('CampusHub AI Knowledge Summarizer & PYQ Solver', 'Software', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80', 'React 19, Python FastAPI, Gemini 1.5 Pro Flash, LangChain, ChromaDB Vector Store, Tailwind CSS', 'AI-assisted academic companion that summarizes GTU previous year question papers, generates step-by-step solutions, and creates interactive flashcards for university exams.', 'Shiv Patel', 'Computer Engineering', 'Admin (Prof. Rajesh Mehta)', ARRAY['AI/LLM','FastAPI','React','EdTech']::TEXT[], '2026-08-10'),
  ('Smart IoT Campus Micro-Grid Energy Monitor', 'Hybrid', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', 'Arduino Mega 2560, SCT-013 Split-Core Current Transformers, LoRaWAN SX1276, Node.js Backend, Chart.js Telemetry', 'Hybrid hardware and cloud telemetry system monitoring real-time power consumption and solar generation across college departments, triggering automated load-shedding alerts.', 'Priya Sharma & Mihir Shah', 'Electrical Engineering', 'Admin (Prof. Rajesh Mehta)', ARRAY['IoT','LoRaWAN','Clean Energy','Arduino']::TEXT[], '2026-07-28'),
  ('Smart Prosthetic Bionic Hand with EMG Muscle Sensors', 'Hardware', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', 'MyoWare 2.0 Muscle Sensor, MG996R High-Torque Metal Servos, STM32F4 Discovery Board, PLA 3D-Printed Finger Linkages', 'Affordable robotic prosthetic limb actuated by surface electromyography signals, supporting 5 individual finger flexions and tactile pressure feedback.', 'Rohan Joshi', 'Biomedical & Mechanical', 'Admin (Prof. Rajesh Mehta)', ARRAY['Biomedical','Robotics','STM32','3D Printing']::TEXT[], '2026-07-15'),
  ('Decentralized Student Credential & Degree Verification', 'Software', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80', 'Solidity Smart Contracts, Polygon PoS Network, IPFS, Ethers.js, Next.js App Router', 'Tamper-proof academic diploma and transcript verification protocol enabling employers to cryptographically verify GTU engineering degrees instantly without third-party delay.', 'Tanvi Shah', 'Information Technology', 'Admin (Prof. Rajesh Mehta)', ARRAY['Blockchain','Web3','Solidity','IPFS']::TEXT[], '2026-06-30')
) AS v(name, category, image, components, description, author, author_dept, uploaded_by, tags, created_at)
WHERE NOT EXISTS (SELECT 1 FROM projects LIMIT 1);

-- Resources (only if table is empty)
INSERT INTO resources (category, subject_name, subject_code, semester, year, file_name, file_size, downloads, uploaded_by, summary, created_at)
SELECT * FROM (VALUES
  ('Mid-Sem Papers', 'Design & Analysis of Algorithms (DAA)', '3150703', 'Semester 5', 'Mid-Sem 2025', 'DAA_MidSem_QuestionPaper_2025_Solved.pdf', '2.4 MB', 412, 'Admin (Prof. Rajesh Mehta)', 'GTU Mid-Semester examination paper covering Divide & Conquer, Dynamic Programming, Greedy Methods, and Asymptotic Notations with model answers.', '2026-08-01'),
  ('Mid-Sem Papers', 'Database Management Systems (DBMS)', '3130703', 'Semester 3', 'Mid-Sem 2025', 'DBMS_MidSem_Paper_With_SQL_Queries.pdf', '3.1 MB', 388, 'Admin (Prof. Rajesh Mehta)', 'Mid-sem paper including ER modeling, Relational Algebra, BCNF/3NF Normalization, ACID transactions, and complex SQL Join queries.', '2026-08-01'),
  ('Mid-Sem Papers', 'Computer Networks & Protocols', '3150710', 'Semester 5', 'Mid-Sem 2024', 'ComputerNetworks_MidSem_2024.pdf', '1.8 MB', 275, 'Admin (Prof. Rajesh Mehta)', 'OSI 7-Layer model, Subnetting, TCP 3-Way Handshake, Flow Control, and Routing algorithms.', '2026-08-01'),
  ('GTU PYQs', 'Software Engineering & Agile Methodologies', '3160713', 'Semester 6', 'Winter 2024', 'GTU_Winter2024_SoftwareEngineering_PYQ.pdf', '1.9 MB', 512, 'Admin (Prof. Rajesh Mehta)', 'Official GTU Winter 2024 university question paper covering Agile Scrum sprints, UML sequence diagrams, software metrics.', '2026-08-01'),
  ('GTU PYQs', 'Microprocessor & Interfacing (MPI)', '3140707', 'Semester 4', 'Summer 2024', 'GTU_Summer2024_Microprocessor_8086_Solved.pdf', '4.2 MB', 630, 'Admin (Prof. Rajesh Mehta)', 'Solved GTU Summer 2024 8086 Assembly code problems, memory interfacing diagrams.', '2026-08-01'),
  ('GTU PYQs', 'Object Oriented Programming with Java', '3120702', 'Semester 2', 'Winter 2023', 'GTU_Winter2023_Java_OOP_PYQ_Solved.pdf', '2.7 MB', 440, 'Admin (Prof. Rajesh Mehta)', 'Complete collection of 70-mark GTU questions on Polymorphism, Exception Handling, Multithreading.', '2026-08-01'),
  ('Handwritten Notes', 'Theory of Computation & Automata (TOC)', '3150702', 'Semester 5', '2025 Edition', 'TOC_Complete_Handwritten_Notes_ShivPatel.pdf', '8.5 MB', 890, 'Admin (Prof. Rajesh Mehta)', 'Topper handwriting notes covering DFA/NFA conversions, Regular Expressions, Arden''s Theorem, PDA constructions.', '2026-08-01'),
  ('Handwritten Notes', 'Operating Systems & Linux Kernel Internals', '3140702', 'Semester 4', '2025 Edition', 'OS_Process_Scheduling_Handwritten_Formulas.pdf', '5.6 MB', 720, 'Admin (Prof. Rajesh Mehta)', 'Comprehensive notes on CPU Scheduling algorithms, Semaphores & Mutex, Banker''s Deadlock algorithm.', '2026-08-01'),
  ('Reference Books', 'Introduction to Algorithms (CLRS 4th Edition)', 'REF-CS-01', 'All Semesters', 'Core Reference', 'CLRS_Algorithms_4th_Edition_Core_Chapters.pdf', '14.8 MB', 1250, 'Admin (Prof. Rajesh Mehta)', 'Standard reference text by Cormen, Leiserson, Rivest, and Stein covering graph theory, dynamic programming.', '2026-08-01'),
  ('Reference Books', 'Computer Networking: A Top-Down Approach', 'REF-CS-02', 'Semester 5 & 6', 'Core Reference', 'Kurose_Ross_Networking_8th_Ed_Summary.pdf', '11.2 MB', 980, 'Admin (Prof. Rajesh Mehta)', 'In-depth textbook on Application layer, Transport layer, Network routing, and Wireless LANs.', '2026-08-01')
) AS v(category, subject_name, subject_code, semester, year, file_name, file_size, downloads, uploaded_by, summary, created_at)
WHERE NOT EXISTS (SELECT 1 FROM resources LIMIT 1);

-- Updates (only if table is empty)
INSERT INTO updates (title, message, category, image, link, author, is_new, created_at)
SELECT * FROM (VALUES
  ('Smart India Hackathon 2026 — Internal College Registrations Open', 'GTU Innovation Council invites student teams for SIH 2026. Submit your team synopsis and problem statement selection on the student portal before September 5th.', 'Hackathon', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80', 'https://sih.gov.in', 'Admin (Prof. Rajesh Mehta)', TRUE, '2026-08-29'),
  ('Hands-on Workshop: Building Agentic AI & Generative Workflows', 'Join us in Auditorium 2 on August 30th at 10:00 AM for an exclusive workshop led by Google Cloud AI engineers.', 'Workshop', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80', 'https://campus.gtu.ac.in/events/ai-workshop', 'Admin (Prof. Rajesh Mehta)', TRUE, '2026-08-28')
) AS v(title, message, category, image, link, author, is_new, created_at)
WHERE NOT EXISTS (SELECT 1 FROM updates LIMIT 1);

-- Collaboration posts (only if table is empty)
-- Note: These reference auth users, so they'll only insert if matching profiles exist
-- For demo, we skip seeding collab posts since they need real user IDs

-- =============================================
-- 9. REALTIME SUBSCRIPTIONS
-- =============================================
-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE updates;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_posts;

-- =============================================
-- 10. STORAGE BUCKETS
-- =============================================
-- Create storage buckets (run via Supabase Dashboard → Storage → New Bucket)
-- Bucket: pdfs (for resource PDFs)
-- Bucket: avatars (for profile photos)
-- Bucket: project-images (for project images)

-- RLS policies for storage
-- (These are created via the Dashboard or SQL)

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Profiles: anyone can read, only owner can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: anyone can read, admins can insert/update/delete
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Admins can insert projects" ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update projects" ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete projects" ON projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Resources: anyone can read, admins can manage
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources are viewable by everyone" ON resources FOR SELECT USING (true);
CREATE POLICY "Admins can insert resources" ON resources FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update resources" ON resources FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete resources" ON resources FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Collaboration posts: anyone can read, authenticated users can insert
ALTER TABLE collaboration_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON collaboration_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert posts" ON collaboration_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can update own posts" ON collaboration_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts" ON collaboration_posts FOR DELETE USING (auth.uid() = author_id);

-- Requests: sender and receiver can read, authenticated users can insert
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON requests FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "Authenticated users can send requests" ON requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Receiver can update request status" ON requests FOR UPDATE USING (auth.uid() = to_user_id);
CREATE POLICY "Users can delete own sent requests" ON requests FOR DELETE USING (auth.uid() = from_user_id);

-- Updates: anyone can read, admins can manage
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Updates are viewable by everyone" ON updates FOR SELECT USING (true);
CREATE POLICY "Admins can insert updates" ON updates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update updates" ON updates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Chat messages: only sender and receiver can read
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chat messages" ON chat_messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
