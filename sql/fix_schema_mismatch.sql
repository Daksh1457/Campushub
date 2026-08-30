-- =============================================
-- FIX: Drop and recreate tables with correct schemas
-- Run this in Supabase SQL Editor
-- Safe: tables have 0 rows (verified by test)
-- =============================================

-- Step 1: Drop tables in correct order (respect foreign keys)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS collaboration_posts CASCADE;
DROP TABLE IF EXISTS updates CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Step 2: Recreate projects table with correct schema
CREATE TABLE projects (
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

-- Step 3: Recreate resources table
CREATE TABLE resources (
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

-- Step 4: Recreate updates table
CREATE TABLE updates (
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

-- Step 5: Recreate collaboration_posts table
CREATE TABLE collaboration_posts (
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

-- Step 6: Recreate requests table
CREATE TABLE requests (
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

-- Step 7: Recreate chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast chat retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_participants
  ON chat_messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at
  );

-- Step 8: Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies (wrapped in DO blocks for safety)
-- Projects
DO $$ BEGIN CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can insert projects" ON projects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can update projects" ON projects FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can delete projects" ON projects FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Resources
DO $$ BEGIN CREATE POLICY "Resources are viewable by everyone" ON resources FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can insert resources" ON resources FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can update resources" ON resources FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can delete resources" ON resources FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Updates
DO $$ BEGIN CREATE POLICY "Updates are viewable by everyone" ON updates FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can insert updates" ON updates FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can update updates" ON updates FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Collaboration posts
DO $$ BEGIN CREATE POLICY "Posts are viewable by everyone" ON collaboration_posts FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can insert posts" ON collaboration_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authors can update own posts" ON collaboration_posts FOR UPDATE USING (auth.uid() = author_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authors can delete own posts" ON collaboration_posts FOR DELETE USING (auth.uid() = author_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Requests
DO $$ BEGIN CREATE POLICY "Users can view own requests" ON requests FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can send requests" ON requests FOR INSERT WITH CHECK (auth.uid() = from_user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Receiver can update request status" ON requests FOR UPDATE USING (auth.uid() = to_user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own sent requests" ON requests FOR DELETE USING (auth.uid() = from_user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chat messages
DO $$ BEGIN CREATE POLICY "Users can view own chat messages" ON chat_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 10: Enable Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE requests; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE updates; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE projects; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_posts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 11: Seed data — Projects
INSERT INTO projects (name, category, image, components, description, author, author_dept, uploaded_by, tags, created_at)
VALUES
  ('Autonomous Agro-Drone with Multi-Spectral LiDAR', 'Hardware', 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80', 'ESP32, Pixhawk 4, LiDAR Lite v3, Neo-M8N GPS', 'Autonomous precision agriculture drone with live NDVI crop health analysis.', 'Aarav Mehta & Team', 'Electronics & Communication', 'Admin (Prof. Rajesh Mehta)', ARRAY['Drones','LiDAR','Embedded C']::TEXT[], '2026-08-15'),
  ('CampusHub AI Knowledge Summarizer', 'Software', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80', 'React 19, Python FastAPI, Gemini 1.5 Pro Flash, LangChain', 'AI-assisted academic companion for GTU exam preparation.', 'Shiv Patel', 'Computer Engineering', 'Admin (Prof. Rajesh Mehta)', ARRAY['AI/LLM','FastAPI','React']::TEXT[], '2026-08-10'),
  ('Smart IoT Campus Micro-Grid Energy Monitor', 'Hybrid', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', 'Arduino Mega 2560, SCT-013, LoRaWAN SX1276, Node.js', 'Real-time power consumption monitoring across college departments.', 'Priya Sharma & Mihir Shah', 'Electrical Engineering', 'Admin (Prof. Rajesh Mehta)', ARRAY['IoT','LoRaWAN','Arduino']::TEXT[], '2026-07-28'),
  ('Smart Prosthetic Bionic Hand', 'Hardware', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', 'MyoWare 2.0, MG996R Servos, STM32F4, PLA 3D-Printed', 'Affordable robotic prosthetic limb with EMG muscle sensor control.', 'Rohan Joshi', 'Biomedical & Mechanical', 'Admin (Prof. Rajesh Mehta)', ARRAY['Biomedical','Robotics','STM32']::TEXT[], '2026-07-15'),
  ('Decentralized Credential Verification', 'Software', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80', 'Solidity, Polygon PoS, IPFS, Ethers.js, Next.js', 'Tamper-proof academic diploma verification protocol.', 'Tanvi Shah', 'Information Technology', 'Admin (Prof. Rajesh Mehta)', ARRAY['Blockchain','Web3','Solidity']::TEXT[], '2026-06-30');

-- Step 12: Seed data — Resources
INSERT INTO resources (category, subject_name, subject_code, semester, year, file_name, file_size, downloads, uploaded_by, summary, created_at)
VALUES
  ('Mid-Sem Papers', 'Design & Analysis of Algorithms', '3150703', 'Semester 5', 'Mid-Sem 2025', 'DAA_MidSem_2025.pdf', '2.4 MB', 412, 'Admin (Prof. Rajesh Mehta)', 'Divide & Conquer, Dynamic Programming, Greedy Methods.', '2026-08-01'),
  ('Mid-Sem Papers', 'Database Management Systems', '3130703', 'Semester 3', 'Mid-Sem 2025', 'DBMS_MidSem_2025.pdf', '3.1 MB', 388, 'Admin (Prof. Rajesh Mehta)', 'ER modeling, Relational Algebra, Normalization, SQL.', '2026-08-01'),
  ('Mid-Sem Papers', 'Computer Networks', '3150710', 'Semester 5', 'Mid-Sem 2024', 'CN_MidSem_2024.pdf', '1.8 MB', 275, 'Admin (Prof. Rajesh Mehta)', 'OSI Model, Subnetting, TCP, Routing algorithms.', '2026-08-01'),
  ('GTU PYQs', 'Software Engineering', '3160713', 'Semester 6', 'Winter 2024', 'SE_Winter2024.pdf', '1.9 MB', 512, 'Admin (Prof. Rajesh Mehta)', 'Agile Scrum, UML diagrams, software metrics.', '2026-08-01'),
  ('GTU PYQs', 'Microprocessor & Interfacing', '3140707', 'Semester 4', 'Summer 2024', 'MPI_Summer2024.pdf', '4.2 MB', 630, 'Admin (Prof. Rajesh Mehta)', '8086 Assembly, memory interfacing, timing diagrams.', '2026-08-01'),
  ('GTU PYQs', 'OOP with Java', '3120702', 'Semester 2', 'Winter 2023', 'Java_OOP_Winter2023.pdf', '2.7 MB', 440, 'Admin (Prof. Rajesh Mehta)', 'Polymorphism, Exception Handling, Multithreading.', '2026-08-01'),
  ('Handwritten Notes', 'Theory of Computation', '3150702', 'Semester 5', '2025 Edition', 'TOC_Notes_2025.pdf', '8.5 MB', 890, 'Admin (Prof. Rajesh Mehta)', 'DFA/NFA, Regular Expressions, PDA, Turing Machines.', '2026-08-01'),
  ('Handwritten Notes', 'Operating Systems', '3140702', 'Semester 4', '2025 Edition', 'OS_Notes_2025.pdf', '5.6 MB', 720, 'Admin (Prof. Rajesh Mehta)', 'CPU Scheduling, Semaphores, Deadlock, Virtual Memory.', '2026-08-01'),
  ('Reference Books', 'Introduction to Algorithms (CLRS)', 'REF-CS-01', 'All Semesters', 'Core Reference', 'CLRS_Summary.pdf', '14.8 MB', 1250, 'Admin (Prof. Rajesh Mehta)', 'Graph theory, dynamic programming, complexity.', '2026-08-01'),
  ('Reference Books', 'Computer Networking (Kurose & Ross)', 'REF-CS-02', 'Semester 5 & 6', 'Core Reference', 'Kurose_Ross_Summary.pdf', '11.2 MB', 980, 'Admin (Prof. Rajesh Mehta)', 'Application layer, Transport, Routing, Wireless.', '2026-08-01');

-- Step 13: Seed data — Updates
INSERT INTO updates (title, message, category, image, link, author, is_new, created_at)
VALUES
  ('Smart India Hackathon 2026 — Registrations Open', 'GTU Innovation Council invites student teams for SIH 2026. Submit before September 5th.', 'Hackathon', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80', 'https://sih.gov.in', 'Admin (Prof. Rajesh Mehta)', TRUE, '2026-08-29'),
  ('Workshop: Building Agentic AI', 'Join us August 30th at 10:00 AM in Auditorium 2 for a Google Cloud AI workshop.', 'Workshop', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80', 'https://campus.gtu.ac.in/events/ai-workshop', 'Admin (Prof. Rajesh Mehta)', TRUE, '2026-08-28');

-- Done! You should see "Success. No rows returned"
