const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Use environment data directory (e.g. Render Persistent Disk at /var/data) or fallback to local directory
const dataDir = process.env.DATA_DIR && fs.existsSync(process.env.DATA_DIR) 
  ? process.env.DATA_DIR 
  : __dirname;

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Helper function to execute DDL scripts
function exec(sql) {
  return db.exec(sql);
}

// Helper function to run statement (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return {
    lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
    changes: result.changes
  };
}

// Helper function to get single row
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

// Helper function to get all rows
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

// Initialize tables and seed default data
function initializeDatabase() {
  try {
    // Enable Foreign Keys
    db.exec(`PRAGMA foreign_keys = ON;`);

    // 1. Users Table (E2EE + Email Verification compliant schema)
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      public_key TEXT,
      name TEXT,
      mobile TEXT,
      is_verified INTEGER DEFAULT 0,
      verification_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    try { db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN public_key TEXT;`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN verification_code TEXT;`); } catch(e) {}

    // 2. Jobs Table
    db.exec(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      salary TEXT,
      type TEXT NOT NULL,
      link TEXT NOT NULL,
      linkedin_profile TEXT,
      posted_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // 3. Game Scores Table
    db.exec(`CREATE TABLE IF NOT EXISTS game_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // 4. Medical Scans Table
    db.exec(`CREATE TABLE IF NOT EXISTS medical_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      file_type TEXT NOT NULL,
      detected_class TEXT,
      confidence REAL,
      structural_metric TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );`);

    // 5. Notifications Table
    db.exec(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // 6. Project Blueprints Table
    db.exec(`CREATE TABLE IF NOT EXISTS project_blueprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      idea TEXT NOT NULL,
      tools TEXT NOT NULL,
      steps TEXT NOT NULL,
      roadmap TEXT NOT NULL,
      details TEXT NOT NULL
    );`);

    // Seed default jobs if empty
    const jobsCount = get(`SELECT COUNT(*) as count FROM jobs`);
    if (!jobsCount || jobsCount.count === 0) {
      const defaultJobs = [
        {
          title: "Graduate Software Engineer",
          company: "TechCorp Industries",
          location: "Bangalore (Hybrid)",
          salary: "₹8,00,000 - ₹12,00,000 Lpa",
          type: "Job",
          link: "https://example.com/jobs/1",
          linkedin_profile: null
        },
        {
          title: "Biomedical AI Research Intern",
          company: "Acuity Health AI",
          location: "Chennai (On-site)",
          salary: "₹35,000 / month",
          type: "Internship",
          link: "https://example.com/jobs/2",
          linkedin_profile: null
        },
        {
          title: "Frontend Developer (React/Vite)",
          company: "Veloce Web Solutions",
          location: "Remote",
          salary: "₹6,00,000 - ₹9,00,000 Lpa",
          type: "Job",
          link: "https://example.com/jobs/3",
          linkedin_profile: null
        },
        {
          title: "Embedded Systems Intern",
          company: "CircuitStream Labs",
          location: "Pune (On-site)",
          salary: "₹25,000 / month",
          type: "Internship",
          link: "https://example.com/jobs/4",
          linkedin_profile: null
        },
        {
          title: "Associate Cloud Engineer",
          company: "Google Cloud",
          location: "Bangalore Office",
          salary: "₹18,50,000 Lpa",
          type: "Placement",
          link: "https://linkedin.com",
          linkedin_profile: "https://www.linkedin.com/company/google"
        },
        {
          title: "Machine Learning Engineer",
          company: "NVIDIA Corp",
          location: "Hyderabad",
          salary: "₹24,00,000 Lpa",
          type: "Placement",
          link: "https://linkedin.com",
          linkedin_profile: "https://www.linkedin.com/company/nvidia"
        }
      ];

      for (const job of defaultJobs) {
        run(`INSERT INTO jobs (title, company, location, salary, type, link, linkedin_profile) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          job.title, job.company, job.location, job.salary, job.type, job.link, job.linkedin_profile
        ]);
      }
      console.log('Seeded default jobs.');
    }

    // Seed default notifications if empty
    const notifsCount = get(`SELECT COUNT(*) as count FROM notifications`);
    if (!notifsCount || notifsCount.count === 0) {
      const defaultNotifs = [
        { title: "New Internship Available", message: "Acuity Health AI is accepting applications for Biomedical AI Research Interns." },
        { title: "Placement Drive Announcement", message: "Google Cloud recruitment registration starts tomorrow morning." },
        { title: "Mind Games Challenge", message: "A new weekly challenge is online! Beat the high scores in Memory Matrix to get featured." }
      ];

      for (const notif of defaultNotifs) {
        run(`INSERT INTO notifications (title, message) VALUES (?, ?)`, [notif.title, notif.message]);
      }
      console.log('Seeded default notifications.');
    }

    // Seed default project blueprints if empty
    const blueprintsCount = get(`SELECT COUNT(*) as count FROM project_blueprints`);
    if (!blueprintsCount || blueprintsCount.count === 0) {
      const defaultBlueprints = [
        {
          topic: "Arduino Weather Station",
          category: "Hardware",
          idea: "Build a portable weather monitoring system that measures temperature, humidity, and barometric pressure, displaying real-time data on an LCD screen and saving readings to an SD card.",
          tools: JSON.stringify(["Arduino Uno R3", "DHT11 Temp & Humidity Sensor", "BMP280 Barometric Sensor", "I2C 16x2 LCD Display module", "Breadboard and jumper wires", "Micro SD Card Shield"]),
          steps: JSON.stringify([
            "Step 1: Mount the DHT11 and BMP280 sensors on the breadboard and connect their power/ground lines to the Arduino 5V/GND.",
            "Step 2: Set up I2C communication lines (SDA to A4, SCL to A5) for the BMP280 sensor and the 16x2 LCD display.",
            "Step 3: Connect the SD card shield SPI pins to Arduino hardware SPI pins (D11, D12, D13) and configure select pin to D10.",
            "Step 4: Load weather station code using the LiquidCrystal_I2C, Adafruit_BMP280, and SD libraries.",
            "Step 5: Run self-tests, calibrate BMP280 readings, compile, and upload to the Arduino.",
            "Step 6: Assemble all modules in a custom 3D-printed weather-proof enclosure."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: Basic Temperature Sensing (Days 1-2)",
            "Phase 2: LCD Integration & Display UI (Days 3-4)",
            "Phase 3: Pressure Tracking & SD Card Logging (Days 5-6)",
            "Phase 4: Outdoor Calibration & Box assembly (Days 7-8)"
          ]),
          details: JSON.stringify([
            "Accuracy: Temp ±2°C, Humidity ±5% RH, Pressure ±1 hPa",
            "Power: 9V battery or micro USB, consuming ~85mA active",
            "Cost Estimation: Approx. ₹1,200 ($15 USD)"
          ])
        },
        {
          topic: "Raspberry Pi Security Cam",
          category: "Hardware",
          idea: "Set up a smart home surveillance camera that detects motion, records short video clips, sends Telegram notifications to your phone, and streams video feeds locally.",
          tools: JSON.stringify(["Raspberry Pi 4 Model B", "Raspberry Pi Camera Module V2", "PIR Motion Sensor", "Micro SD card (32GB with Raspberry Pi OS)", "5V 3A Type-C Power Supply", "Mounting Bracket"]),
          steps: JSON.stringify([
            "Step 1: Install Raspberry Pi OS (64-bit) on the SD card using Raspberry Pi Imager.",
            "Step 2: Connect the ribbon cable of the camera module to the CSI port on the Raspberry Pi.",
            "Step 3: Connect the PIR motion sensor to 5V, GND, and GPIO Pin 17 of the Raspberry Pi.",
            "Step 4: Enable camera interface in raspi-config and write a python script using picamera and RPi.GPIO.",
            "Step 5: Set up a Telegram bot via BotFather, get API token, and implement automatic photo/video upload triggers.",
            "Step 6: Deploy MotionEyeOS or stream via WebRTC using python-flask server for live panel view."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: Pi OS Configuration & Camera Tests (Days 1-2)",
            "Phase 2: Motion Detection Code with PIR sensor (Days 3)",
            "Phase 3: Telegram Bot API Notification integration (Days 4-5)",
            "Phase 4: Web Portal live stream setup & Mounting (Days 6-7)"
          ]),
          details: JSON.stringify([
            "Video Output: 1080p @ 30 FPS recording, H.264 compression",
            "Latency: ~150ms over local WiFi stream",
            "Cost Estimation: Approx. ₹4,500 ($55 USD)"
          ])
        },
        {
          topic: "IoT Smart Irrigation",
          category: "Hardware",
          idea: "Create an automated garden irrigation system that checks soil moisture levels, cross-references with local weather forecasting API, and turns on a water pump via relay if soil is dry.",
          tools: JSON.stringify(["ESP8266 or ESP32 NodeMCU", "Capacitive Soil Moisture Sensor v1.2", "5V Relay Module", "12V Mini Submersible Water Pump", "12V DC Adapter", "Tubing and Water Reservoir"]),
          steps: JSON.stringify([
            "Step 1: Connect capacitive soil moisture sensor analog output pin to ESP32 pin A0 (ADC).",
            "Step 2: Connect ESP32 digital output pin D5 to the relay signal input, routing pump power through relay NO/COM.",
            "Step 3: Set up WiFi connection on ESP32 and write code to query OpenWeatherMap API for rain forecasts.",
            "Step 4: Program logic: If moisture < threshold AND weather forecast != Rain, trigger relay ON for 10 seconds.",
            "Step 5: Configure data reporting to Blynk or Adafruit IO IoT dashboard to monitor moisture level on mobile.",
            "Step 6: Solder onto a prototype PCB and put inside a sealed junction box near your plants."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: Moisture Sensor Calibration (Days 1)",
            "Phase 2: Relay & Pump safe power wiring (Days 2-3)",
            "Phase 3: WiFi Weather API integrations (Days 4-5)",
            "Phase 4: IoT Dashboard design & Field Test (Days 6-7)"
          ]),
          details: JSON.stringify([
            "Sensor type: Capacitive (resists corrosion over time)",
            "Connectivity: 2.4GHz WiFi connection, MQTT protocol",
            "Cost Estimation: Approx. ₹1,800 ($22 USD)"
          ])
        },
        {
          topic: "EEG Brain Wave Monitor",
          category: "Hardware",
          idea: "Build a non-invasive EEG biofeedback reader using a single-channel sensor module that detects brain electrical signals, filters noise, and visualizes alpha and beta brainwaves in real-time.",
          tools: JSON.stringify(["Arduino Nano", "TGAM1 EEG Sensor Chip or NeuroSky module", "Dry EEG Electrodes & Headband", "HC-05 Bluetooth Module", "3.7V Li-Po battery", "Visualizer software (Processing/Python)"]),
          steps: JSON.stringify([
            "Step 1: Solder the TGAM1 module connections to dry electrodes (Frontal Fp1 electrode and earlobe reference).",
            "Step 2: Connect the TGAM1 serial TX pin to the Arduino RX pin (using software serial to keep main serial free).",
            "Step 3: Connect HC-05 Bluetooth module to Arduino for wireless transmission to shield user from grid voltages.",
            "Step 4: Program the Arduino to parse TGAM1 packet bytes (attention, meditation, EEG raw waves).",
            "Step 5: Write a Python program using matplotlib or Processing script to chart frequencies (Delta, Theta, Alpha, Beta).",
            "Step 6: Test attention response by asking subject to close eyes (Alpha waves spike) or do arithmetic (Beta waves rise)."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: Sensor TGAM1 assembly & Bluetooth tests (Week 1)",
            "Phase 2: Arduino signal parsing & checksum checks (Week 1)",
            "Phase 3: Real-time UI charts & spectral filters in Python (Week 2)",
            "Phase 4: Headband mounting & Biofeedback tuning (Week 2)"
          ]),
          details: JSON.stringify([
            "Sampling Rate: 512 Hz raw EEG output",
            "Isolation: Complete wireless bluetooth isolation for user safety",
            "Cost Estimation: Approx. ₹3,800 ($45 USD)"
          ])
        },
        {
          topic: "Web Developer Portfolio",
          category: "Software",
          idea: "Develop a lightning-fast, highly responsive portfolio website showing projects, skills, and resume, featuring a glassmorphism theme, interactive dark mode, and a contact form with email notifications.",
          tools: JSON.stringify(["HTML5 & CSS Grid/Flexbox", "Modern Javascript (ES6+)", "Three.js (for 3D background elements)", "EmailJS API integration", "Framer Motion for animations", "GitHub Actions (for CI/CD CD deployment)"]),
          steps: JSON.stringify([
            "Step 1: Plan the responsive grid layout (Hero, About, Projects, Experience, Contact sections).",
            "Step 2: Implement styling in style.css utilizing CSS variables for theme switching and CSS filters for blurred glass cards.",
            "Step 3: Add interactive elements like scroll-triggered animations and 3D canvas particles with Three.js.",
            "Step 4: Integrate contact form script with EmailJS API, allowing visitors to send emails directly from the site.",
            "Step 5: Audit performance using Google Lighthouse, optimizing image formats (WebP) and minifying assets.",
            "Step 6: Host on GitHub Pages or Vercel, setting up automated deploy workflows."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: UI layout wireframes & static HTML/CSS (Days 1-2)",
            "Phase 2: Dark mode toggler & Scroll animation effects (Days 3)",
            "Phase 3: Three.js background particle effects (Days 4)",
            "Phase 4: Email form setup & Lighthouse performance audit (Days 5)"
          ]),
          details: JSON.stringify([
            "Page Speed Score: 98/100 Lighthouse Mobile score",
            "File size: <1.2 MB total assets, highly optimized",
            "Cost Estimation: ₹0 (Free Hosting on Vercel/GitHub)"
          ])
        },
        {
          topic: "AI Chatbot Assistant",
          category: "Software",
          idea: "Create a full-stack chatbot assistant web application integrated with Gemini API, supporting chat history storage, speech-to-text, context memory, and markdown rendering.",
          tools: JSON.stringify(["Node.js & Express", "SQLite (for storing chat sessions)", "Google Gen AI SDK", "Web Speech API (Speech Recognition)", "Marked.js (for markdown rendering)", "CSS Glassmorphism UI"]),
          steps: JSON.stringify([
            "Step 1: Initialize Node.js Express server and setup session cookies for chat tracking.",
            "Step 2: Create SQLite tables for chats and messages (linked to user IDs).",
            "Step 3: Write server-side routes connecting to Google Gemini API using system instructions for assistant persona.",
            "Step 4: Build a gorgeous chat interface with automatic scrolling, code syntax highlighting, and formatting.",
            "Step 5: Implement Web Speech API speech-to-text input button and text-to-speech voice response.",
            "Step 6: Test multi-turn conversational memory, verifying SQL queries update session details correctly."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: Backend Express + Gemini API setup (Days 1)",
            "Phase 2: SQLite database chat schema & relations (Days 2)",
            "Phase 3: Frontend Chat interface & Marked.js integration (Days 3-4)",
            "Phase 4: Web Speech integrations & Multi-turn context tests (Days 5-6)"
          ]),
          details: JSON.stringify([
            "Response Latency: <1.5s average API streaming response",
            "Security: API keys stored securely on server side",
            "Cost Estimation: Free tier Gemini usage limits"
          ])
        },
        {
          topic: "Biomedical Segmenter",
          category: "Software",
          idea: "Build a web-based computer vision tool where users upload medical MRI/CT scans (images/videos) and a simulated AI segmentation engine overlays organ masks and labels anomalies with diagnostic confidence ratings.",
          tools: JSON.stringify(["Python (Flask or Node.js backend)", "Canvas 2D API (HTML5 canvas masking)", "Three.js (for 3D stack slices)", "Chart.js (for metrics evaluation)", "PDFKit (for automated PDF medical report export)"]),
          steps: JSON.stringify([
            "Step 1: Build file upload handler with Express Multer, verifying file extensions (PNG, JPG, MP4).",
            "Step 2: Write image processing logic using Canvas API to render uploaded image and draw semi-transparent overlay path loops.",
            "Step 3: Implement automatic segmentation simulator (computes metric indices, tumor size estimate, confidence score).",
            "Step 4: Setup analysis canvas loop for video files, displaying frame metrics dynamically as video runs.",
            "Step 5: Write the export PDF script compiling patient meta-data, diagnostic parameters, and canvas snapshot.",
            "Step 6: Style the analysis viewport side-by-side with metrics, adding interactive segment mask display toggle."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: Upload system & Static canvas drawing (Days 1-2)",
            "Phase 2: Simulated segmentation algorithm & Canvas masks (Days 3-4)",
            "Phase 3: Video frame analyzer loop (Days 5)",
            "Phase 4: PDF Report Generation & Export functions (Days 6-7)"
          ]),
          details: JSON.stringify([
            "Supported formats: DICOM, PNG, JPG, MP4, WebM",
            "Analysis time: <3 seconds processing delay",
            "Cost Estimation: ₹0 (Server-side rendering, client-side mask canvas)"
          ])
        },
        {
          topic: "Online Placement Portal",
          category: "Software",
          idea: "A recruitment dashboard matching graduating students with verified corporate vacancies, featuring profile matching, interview notifications, resume scanning simulator, and placement highlights.",
          tools: JSON.stringify(["Express.js backend", "SQLite database", "bcryptjs security", "LinkedIn OAuth API (Mock)", "Job alerts system", "Responsive CSS Admin Dashboard"]),
          steps: JSON.stringify([
            "Step 1: Design SQLite database with user profiles, jobs, applications, and notification queues.",
            "Step 2: Build secure authentication routes (cookie sessions, password encryption with bcrypt).",
            "Step 3: Create job listing feeds with search features, filtering by Job vs. Internship, location, and salary.",
            "Step 4: Implement real-time notifications system storing alerts in DB and pushing to client navbar badge.",
            "Step 5: Create a placement success board displaying recently hired students, company logos, and LinkedIn links.",
            "Step 6: Write admin features allowing corporate users to post new jobs and view candidate profiles."
          ]),
          roadmap: JSON.stringify([
            "Phase 1: DB Schema & Auth systems (Days 1-2)",
            "Phase 2: Job listing APIs & Search/Filter systems (Days 3-4)",
            "Phase 3: Notification queues & Profile badges (Days 5)",
            "Phase 4: Success board carousel & Admin UI polish (Days 6-7)"
          ]),
          details: JSON.stringify([
            "Concurrent connections: ~200 active users supported on SQLite",
            "Encryption: SHA-256 equivalent password hashing",
            "Cost Estimation: ₹0 (Local Express/SQLite setup)"
          ])
        }
      ];

      for (const bp of defaultBlueprints) {
        run(`INSERT INTO project_blueprints (topic, category, idea, tools, steps, roadmap, details) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          bp.topic, bp.category, bp.idea, bp.tools, bp.steps, bp.roadmap, bp.details
        ]);
      }
      console.log('Seeded default project blueprints.');
    }

  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

module.exports = {
  db,
  initializeDatabase,
  exec,
  run,
  get,
  all
};
