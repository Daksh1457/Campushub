/**
 * CampusHub 1.0 — Initial State & Sample Content
 * Adhering strictly to CampusHub_Build_Prompt_2.md:
 * - Zero auto-seeded student/admin accounts (starts with empty registeredUsers list so custom entries can be created)
 * - 4-6 Pre-loaded Projects across Hardware, Software, and Hybrid
 * - 2-3 Pre-loaded Resources across 4 categories (Mid-Sem Papers, GTU PYQs, Handwritten Notes, Reference Books)
 * - 2-3 Pre-loaded Collaboration Posts
 * - 2-3 Pre-loaded Campus Updates
 */

export const INITIAL_STATE = {
  // Zero auto-seeded accounts by default - user creates up to 10 student and 4 admin entries
  registeredUsers: [],

  // Currently Active Logged-in User (null initially so user lands on Sign Up)
  currentUser: null,

  // Projects Module (4 Tabs: Hardware, Software, Hybrid, All)
  projects: [
    {
      id: 'proj_1',
      name: 'Autonomous Agro-Drone with Multi-Spectral LiDAR',
      category: 'Hardware',
      image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
      components: 'ESP32 microcontroller, Pixhawk 4 Flight Controller, LiDAR Lite v3, Neo-M8N GPS Module, 4S 5000mAh LiPo Battery, Carbon Fiber Frame',
      description: 'An autonomous precision agriculture drone capable of live NDVI crop health analysis, soil moisture telemetry, and automated flight path waypoint tracking.',
      author: 'Aarav Mehta & Team',
      authorDept: 'Electronics & Communication',
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      date: '2026-08-15',
      tags: ['Drones', 'LiDAR', 'Embedded C', 'Precision Agriculture']
    },
    {
      id: 'proj_2',
      name: 'CampusHub AI Knowledge Summarizer & PYQ Solver',
      category: 'Software',
      image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80',
      components: 'React 19, Python FastAPI, Gemini 1.5 Pro Flash, LangChain, ChromaDB Vector Store, Tailwind CSS',
      description: 'AI-assisted academic companion that summarizes GTU previous year question papers, generates step-by-step solutions, and creates interactive flashcards for university exams.',
      author: 'Shiv Patel',
      authorDept: 'Computer Engineering',
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      date: '2026-08-10',
      tags: ['AI/LLM', 'FastAPI', 'React', 'EdTech']
    },
    {
      id: 'proj_3',
      name: 'Smart IoT Campus Micro-Grid Energy Monitor',
      category: 'Hybrid',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      components: 'Arduino Mega 2560, SCT-013 Split-Core Current Transformers, LoRaWAN SX1276, Node.js Backend, Chart.js Telemetry',
      description: 'Hybrid hardware and cloud telemetry system monitoring real-time power consumption and solar generation across college departments, triggering automated load-shedding alerts.',
      author: 'Priya Sharma & Mihir Shah',
      authorDept: 'Electrical Engineering',
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      date: '2026-07-28',
      tags: ['IoT', 'LoRaWAN', 'Clean Energy', 'Arduino']
    },
    {
      id: 'proj_4',
      name: 'Smart Prosthetic Bionic Hand with EMG Muscle Sensors',
      category: 'Hardware',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      components: 'MyoWare 2.0 Muscle Sensor, MG996R High-Torque Metal Servos, STM32F4 Discovery Board, PLA 3D-Printed Finger Linkages',
      description: 'Affordable robotic prosthetic limb actuated by surface electromyography signals, supporting 5 individual finger flexions and tactile pressure feedback.',
      author: 'Rohan Joshi',
      authorDept: 'Biomedical & Mechanical',
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      date: '2026-07-15',
      tags: ['Biomedical', 'Robotics', 'STM32', '3D Printing']
    },
    {
      id: 'proj_5',
      name: 'Decentralized Student Credential & Degree Verification',
      category: 'Software',
      image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80',
      components: 'Solidity Smart Contracts, Polygon PoS Network, IPFS, Ethers.js, Next.js App Router',
      description: 'Tamper-proof academic diploma and transcript verification protocol enabling employers to cryptographically verify GTU engineering degrees instantly without third-party delay.',
      author: 'Tanvi Shah',
      authorDept: 'Information Technology',
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      date: '2026-06-30',
      tags: ['Blockchain', 'Web3', 'Solidity', 'IPFS']
    }
  ],

  // Resources Module (4 Categories: Mid-Sem Papers, GTU PYQs, Handwritten Notes, Reference Books)
  resources: [
    // 1. Mid-Sem Papers
    {
      id: 'res_1',
      category: 'Mid-Sem Papers',
      subjectName: 'Design & Analysis of Algorithms (DAA)',
      subjectCode: '3150703',
      semester: 'Semester 5',
      year: 'Mid-Sem 2025',
      fileName: 'DAA_MidSem_QuestionPaper_2025_Solved.pdf',
      fileSize: '2.4 MB',
      downloads: 412,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'GTU Mid-Semester examination paper covering Divide & Conquer, Dynamic Programming (0/1 Knapsack, LCS), Greedy Methods, and Asymptotic Notations with model answers.'
    },
    {
      id: 'res_2',
      category: 'Mid-Sem Papers',
      subjectName: 'Database Management Systems (DBMS)',
      subjectCode: '3130703',
      semester: 'Semester 3',
      year: 'Mid-Sem 2025',
      fileName: 'DBMS_MidSem_Paper_With_SQL_Queries.pdf',
      fileSize: '3.1 MB',
      downloads: 388,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Mid-sem paper including ER modeling, Relational Algebra, BCNF/3NF Normalization, ACID transactions, and complex SQL Join queries.'
    },
    {
      id: 'res_3',
      category: 'Mid-Sem Papers',
      subjectName: 'Computer Networks & Protocols',
      subjectCode: '3150710',
      semester: 'Semester 5',
      year: 'Mid-Sem 2024',
      fileName: 'ComputerNetworks_MidSem_2024.pdf',
      fileSize: '1.8 MB',
      downloads: 275,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'OSI 7-Layer model, Subnetting, TCP 3-Way Handshake, Flow Control (Sliding Window), and Routing algorithms.'
    },

    // 2. GTU PYQs
    {
      id: 'res_4',
      category: 'GTU PYQs',
      subjectName: 'Software Engineering & Agile Methodologies',
      subjectCode: '3160713',
      semester: 'Semester 6',
      year: 'Winter 2024',
      fileName: 'GTU_Winter2024_SoftwareEngineering_PYQ.pdf',
      fileSize: '1.9 MB',
      downloads: 512,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Official GTU Winter 2024 university question paper covering Agile Scrum sprints, UML sequence diagrams, software metrics, and Black/White box testing methods.'
    },
    {
      id: 'res_5',
      category: 'GTU PYQs',
      subjectName: 'Microprocessor & Interfacing (MPI)',
      subjectCode: '3140707',
      semester: 'Semester 4',
      year: 'Summer 2024',
      fileName: 'GTU_Summer2024_Microprocessor_8086_Solved.pdf',
      fileSize: '4.2 MB',
      downloads: 630,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Solved GTU Summer 2024 8086 Assembly code problems, memory interfacing diagrams (8255 PPI, 8259 PIC), and timing diagrams.'
    },
    {
      id: 'res_6',
      category: 'GTU PYQs',
      subjectName: 'Object Oriented Programming with Java',
      subjectCode: '3120702',
      semester: 'Semester 2',
      year: 'Winter 2023',
      fileName: 'GTU_Winter2023_Java_OOP_PYQ_Solved.pdf',
      fileSize: '2.7 MB',
      downloads: 440,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Complete collection of 70-mark GTU questions on Polymorphism, Exception Handling, Multithreading, Generics, and JDBC connectivity.'
    },

    // 3. Handwritten Notes
    {
      id: 'res_7',
      category: 'Handwritten Notes',
      subjectName: 'Theory of Computation & Automata (TOC)',
      subjectCode: '3150702',
      semester: 'Semester 5',
      year: '2025 Edition',
      fileName: 'TOC_Complete_Handwritten_Notes_ShivPatel.pdf',
      fileSize: '8.5 MB',
      downloads: 890,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Topper handwriting notes covering DFA/NFA conversions, Regular Expressions, Arden’s Theorem, PDA constructions, CFG Chomsky Normal Form, and Turing Machines.'
    },
    {
      id: 'res_8',
      category: 'Handwritten Notes',
      subjectName: 'Operating Systems & Linux Kernel Internals',
      subjectCode: '3140702',
      semester: 'Semester 4',
      year: '2025 Edition',
      fileName: 'OS_Process_Scheduling_Handwritten_Formulas.pdf',
      fileSize: '5.6 MB',
      downloads: 720,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Comprehensive notes on CPU Scheduling algorithms (Round Robin, SJF, Multilevel Queue), Semaphores & Mutex, Banker’s Deadlock algorithm, and Paging/Virtual Memory.'
    },

    // 4. Reference Books
    {
      id: 'res_9',
      category: 'Reference Books',
      subjectName: 'Introduction to Algorithms (CLRS 4th Edition)',
      subjectCode: 'REF-CS-01',
      semester: 'All Semesters',
      year: 'Core Reference',
      fileName: 'CLRS_Algorithms_4th_Edition_Core_Chapters.pdf',
      fileSize: '14.8 MB',
      downloads: 1250,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'Standard reference text by Cormen, Leiserson, Rivest, and Stein covering graph theory, dynamic programming, randomized algorithms, and computational complexity.'
    },
    {
      id: 'res_10',
      category: 'Reference Books',
      subjectName: 'Computer Networking: A Top-Down Approach (Kurose & Ross)',
      subjectCode: 'REF-CS-02',
      semester: 'Semester 5 & 6',
      year: 'Core Reference',
      fileName: 'Kurose_Ross_Networking_8th_Ed_Summary.pdf',
      fileSize: '11.2 MB',
      downloads: 980,
      uploadedBy: 'Admin (Prof. Rajesh Mehta)',
      summary: 'In-depth textbook on Application layer (HTTP/3, DNS, WebSockets), Transport layer (TCP Congestion Control, BBR), Network routing (BGP, OSPF), and Wireless LANs.'
    }
  ],

  // Collaboration Board Posts (Students & Admins can view & post)
  collaborationPosts: [
    {
      id: 'collab_1',
      title: 'Looking for UI/UX Designer for Smart India Hackathon 2026',
      roleNeeded: 'UI/UX Designer (Figma)',
      authorId: 'student_1',
      authorName: 'Shiv Patel',
      authorDept: 'Computer Engineering',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      description: 'Building an automated micro-lending portal for rural artisans using UPI 2.0 and multilingual speech AI. Need a talented designer to create interactive Figma prototypes and flowcharts for the SIH grand finale.',
      tags: ['UI/UX', 'Figma', 'Hackathon', 'FinTech', 'Prototyping'],
      timestamp: '2 hours ago',
      requestsCount: 0
    },
    {
      id: 'collab_2',
      title: 'Need Embedded Systems & LoRa Developer for Drone Telemetry',
      roleNeeded: 'Hardware / IoT Engineer',
      authorId: 'student_2',
      authorName: 'Priya Sharma',
      authorDept: 'Electronics & Comm.',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      description: 'Working on a disaster relief drone with sensor telemetry. Looking for someone with hands-on experience in ESP32, FreeRTOS, and Long-Range (LoRa) transceivers to build the ground station receiver.',
      tags: ['ESP32', 'LoRaWAN', 'Hardware', 'FreeRTOS', 'Drone'],
      timestamp: '4 hours ago',
      requestsCount: 0
    }
  ],

  // Requests Module (Sent pending requests, received pending requests, and accepted connections)
  requests: [],

  // Update Board (Admin-only posting, students view-only with coral notification badge)
  updateBoard: [
    {
      id: 'update_1',
      title: 'Smart India Hackathon 2026 — Internal College Registrations Open',
      message: 'GTU Innovation Council invites student teams for SIH 2026. Submit your team synopsis and problem statement selection on the student portal before September 5th. Top 15 teams receive institutional funding & mentorship.',
      category: 'Hackathon',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
      link: 'https://sih.gov.in',
      author: 'Admin (Prof. Rajesh Mehta)',
      timestamp: '2 hours ago',
      isNew: true
    },
    {
      id: 'update_2',
      title: 'Hands-on Workshop: Building Agentic AI & Generative Workflows',
      message: 'Join us in Auditorium 2 on August 30th at 10:00 AM for an exclusive workshop led by Google Cloud AI engineers. Practical coding session covering LLMs, vector search, and autonomous agents.',
      category: 'Workshop',
      image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      link: 'https://campus.gtu.ac.in/events/ai-workshop',
      author: 'Admin (Prof. Rajesh Mehta)',
      timestamp: '1 day ago',
      isNew: true
    }
  ],

  // WhatsApp-Style 1:1 Chats (Unlocked upon mutual request acceptance)
  chats: {}
};
