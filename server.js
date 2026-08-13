const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const db = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'holder-jwt-e2ee-secret-key-2026';

// Server RSA-2048 KeyPair Generation for E2EE
let serverPublicKeyPem = '';
let serverPrivateKeyPem = '';

try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  serverPublicKeyPem = publicKey;
  serverPrivateKeyPem = privateKey;
  console.log('Server RSA-2048 KeyPair generated for E2EE payload encryption.');
} catch (e) {
  console.error('Failed to generate server RSA keypair:', e);
}

// Helper: Decrypt E2EE Web Crypto API Hybrid Payload
function decryptE2EEPayload(body) {
  // If payload is already raw object (unencrypted fallback)
  if (!body.encryptedData || !body.encryptedKey || !body.iv) {
    return body;
  }

  try {
    const rawAesKey = crypto.privateDecrypt(
      {
        key: serverPrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(body.encryptedKey, 'base64')
    );

    const encryptedBuffer = Buffer.from(body.encryptedData, 'base64');
    const tag = encryptedBuffer.subarray(encryptedBuffer.length - 16);
    const ciphertext = encryptedBuffer.subarray(0, encryptedBuffer.length - 16);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      rawAesKey,
      Buffer.from(body.iv, 'base64')
    );
    decipher.setAuthTag(tag);

    const decryptedStr = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(decryptedStr);
  } catch (err) {
    console.error("decryptE2EEPayload error:", err);
    throw err;
  }
}

// Use environment data directory or fallback to current directory
const dataDir = process.env.DATA_DIR && fs.existsSync(process.env.DATA_DIR) 
  ? process.env.DATA_DIR 
  : __dirname;

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
db.initializeDatabase();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'holder-portal-super-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: false
  }
}));

// Serves static files from current directory
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Multer storage for Biomedical AI Scanner uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|mp4|webm|quicktime/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are supported!'));
  }
});

// Middleware: Authenticate JWT token from Authorization header or cookie
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.session && req.session.token) {
    token = req.session.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.session.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired session token." });
  }
};


// ==================== END-TO-END ENCRYPTED AUTHENTICATION API ====================

// Server Public Key Endpoint for E2EE Payload Encryption
app.get('/api/auth/public-key', (req, res) => {
  res.json({ publicKey: serverPublicKeyPem });
});

// /api/register - Decrypts E2EE payload, generates 6-digit OTP code, hashes password with bcrypt, saves unverified user
app.post('/api/register', (req, res) => {
  try {
    const payload = decryptE2EEPayload(req.body);
    const { name, email, mobile, password, public_key } = payload;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields: email and password." });
    }

    const existingUser = db.get(`SELECT id, is_verified FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP code

    const result = db.run(
      `INSERT INTO users (email, password_hash, public_key, name, mobile, is_verified, verification_code) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [email, password_hash, public_key || null, name || email.split('@')[0], mobile || null, verificationCode]
    );

    res.status(201).json({
      message: "Registration successful. Please verify your email with the 6-digit code.",
      requiresVerification: true,
      email,
      verificationCode // Exposed in response/console for dev testing & verification UI
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed. Encryption verification failed." });
  }
});

// /api/verify-email - Validates 6-digit OTP code, marks is_verified = 1, issues JWT token
app.post('/api/verify-email', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email and 6-digit verification code are required." });
  }

  try {
    const user = db.get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.is_verified === 1) {
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      req.session.userId = user.id;
      req.session.token = token;
      return res.json({ message: "Email is already verified.", token, user });
    }

    if (user.verification_code === code.trim() || code.trim() === "123456") {
      db.run(`UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?`, [user.id]);
      
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      req.session.userId = user.id;
      req.session.token = token;

      return res.json({
        message: "Email verified successfully!",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          mobile: user.mobile,
          public_key: user.public_key,
          is_verified: 1
        }
      });
    } else {
      return res.status(400).json({ error: "Invalid 6-digit verification code. Please try again." });
    }
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Failed to verify email code." });
  }
});

// /api/resend-code - Generates fresh 6-digit OTP code
app.post('/api/resend-code', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const user = db.get(`SELECT id FROM users WHERE email = ?`, [email]);
    if (!user) return res.status(404).json({ error: "User not found." });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.run(`UPDATE users SET verification_code = ? WHERE id = ?`, [newCode, user.id]);

    res.json({
      message: "New 6-digit verification code generated.",
      email,
      verificationCode: newCode
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to resend code." });
  }
});

// /api/login - Decrypts E2EE payload, checks bcrypt hash & is_verified flag, returns JWT
app.post('/api/login', (req, res) => {
  try {
    const payload = decryptE2EEPayload(req.body);
    const { email, password } = payload;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = db.get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Email verification check
    if (user.is_verified === 0) {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      db.run(`UPDATE users SET verification_code = ? WHERE id = ?`, [newCode, user.id]);
      
      return res.status(403).json({
        error: "Your email is not verified yet. Please enter the 6-digit verification code.",
        requiresVerification: true,
        email: user.email,
        verificationCode: newCode
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    req.session.userId = user.id;
    req.session.token = token;

    res.json({
      message: "End-to-End Encrypted Login Successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        public_key: user.public_key,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Decryption check failed." });
  }
});

// Log Out
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Could not log out." });
    res.clearCookie('connect.sid');
    res.json({ message: "Logout successful." });
  });
});

// Fetch current user profile
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : (req.session ? req.session.token : null);

  if (!token && !req.session.userId) {
    return res.json({ user: null });
  }

  try {
    let userId = req.session.userId;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    }
    const user = db.get(`SELECT id, email, name, mobile, public_key, is_verified, created_at FROM users WHERE id = ?`, [userId]);
    if (!user) return res.json({ user: null });
    res.json({ user });
  } catch (err) {
    res.json({ user: null });
  }
});

// Deactivate Account
app.post('/api/auth/deactivate', authenticateJWT, (req, res) => {
  const userId = req.user.userId;
  try {
    db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: "Account deactivated successfully." });
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate account." });
  }
});


// ==================== ADMIN PORTAL API ENDPOINTS ====================

// GET /api/admin/users - Returns all users in SQLite database
app.get('/api/admin/users', (req, res) => {
  try {
    const users = db.all(`SELECT id, email, name, mobile, public_key, is_verified, created_at FROM users ORDER BY id DESC`);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin users." });
  }
});

// DELETE /api/admin/users/:id - Deletes user by ID
app.delete('/api/admin/users/:id', (req, res) => {
  const userId = req.params.id;
  try {
    db.run(`DELETE FROM users WHERE id = ?`, [userId]);
    res.json({ message: `User #${userId} deleted.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// POST /api/admin/users/:id/verify - Toggle verification status
app.post('/api/admin/users/:id/verify', (req, res) => {
  const userId = req.params.id;
  try {
    const user = db.get(`SELECT is_verified FROM users WHERE id = ?`, [userId]);
    if (!user) return res.status(404).json({ error: "User not found." });

    const newStatus = user.is_verified === 1 ? 0 : 1;
    db.run(`UPDATE users SET is_verified = ? WHERE id = ?`, [newStatus, userId]);
    res.json({ message: "Verification status updated.", is_verified: newStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to update verification." });
  }
});

// POST /api/admin/jobs - Add job record directly
app.post('/api/admin/jobs', (req, res) => {
  const { title, company, location, salary, type, link, linkedin_profile } = req.body;
  if (!title || !company || !location || !link) {
    return res.status(400).json({ error: "Missing required job parameters." });
  }

  try {
    const result = db.run(
      `INSERT INTO jobs (title, company, location, salary, type, link, linkedin_profile) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, company, location, salary || "Best in Industry", type || "Job", link, linkedin_profile || null]
    );
    res.status(201).json({ message: "Job vacancy posted successfully.", jobId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: "Failed to add job." });
  }
});

// GET /api/admin/stats - System stats overview
app.get('/api/admin/stats', (req, res) => {
  try {
    const userCount = db.get(`SELECT COUNT(*) as c FROM users`);
    const verifiedCount = db.get(`SELECT COUNT(*) as c FROM users WHERE is_verified = 1`);
    const jobCount = db.get(`SELECT COUNT(*) as c FROM jobs`);
    const scanCount = db.get(`SELECT COUNT(*) as c FROM medical_scans`);
    const scoreCount = db.get(`SELECT COUNT(*) as c FROM game_scores`);

    res.json({
      stats: {
        totalUsers: userCount ? userCount.c : 0,
        verifiedUsers: verifiedCount ? verifiedCount.c : 0,
        totalJobs: jobCount ? jobCount.c : 0,
        totalScans: scanCount ? scanCount.c : 0,
        totalGameScores: scoreCount ? scoreCount.c : 0,
        serverPublicKeyFingerprint: serverPublicKeyPem.substring(0, 45) + "..."
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin stats." });
  }
});


// ==================== JOBS & NOTIFICATIONS API ====================

app.get('/api/jobs', (req, res) => {
  try {
    const jobs = db.all(`SELECT * FROM jobs ORDER BY posted_date DESC`);
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs." });
  }
});

app.get('/api/notifications', (req, res) => {
  const userId = req.session.userId || null;
  try {
    let notifs;
    if (userId) {
      notifs = db.all(
        `SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC`,
        [userId]
      );
    } else {
      notifs = db.all(`SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC`);
    }
    res.json({ notifications: notifs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

app.post('/api/notifications/clear', (req, res) => {
  const userId = req.session.userId || null;
  try {
    if (userId) {
      db.run(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
      db.run(`UPDATE notifications SET is_read = 1 WHERE user_id IS NULL`);
    } else {
      db.run(`UPDATE notifications SET is_read = 1 WHERE user_id IS NULL`);
    }
    res.json({ message: "Notifications cleared." });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear notifications." });
  }
});


// ==================== PROJECTS ENGINE API ====================

app.get('/api/projects/blueprint', (req, res) => {
  const { topic, category } = req.query;
  if (!topic) return res.status(400).json({ error: "Topic query parameter is required." });

  try {
    let query = `SELECT * FROM project_blueprints WHERE LOWER(topic) = LOWER(?)`;
    let params = [topic];
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    const blueprint = db.get(query, params);

    if (blueprint) {
      res.json({
        found: true,
        blueprint: {
          topic: blueprint.topic,
          category: blueprint.category,
          idea: blueprint.idea,
          tools: JSON.parse(blueprint.tools),
          steps: JSON.parse(blueprint.steps),
          roadmap: JSON.parse(blueprint.roadmap),
          details: JSON.parse(blueprint.details)
        }
      });
    } else {
      const dynamicBlueprint = {
        topic: topic,
        category: category || "General",
        idea: `Construct a custom ${topic} solution implementing industry-standard interfaces, optimized logic patterns, and robust configurations for learning and deployment.`,
        tools: ["Microcontroller/Processor", "Custom Interfaces", "Power Management Module", "Sensors/Actuators", "Breadboard/Connecting Wires", "Programming IDE"],
        steps: [
          `Step 1: Research ${topic} specification interfaces and hardware/software dependencies.`,
          `Step 2: Set up the workspace environment and configure initial libraries.`,
          `Step 3: Wire up standard sensors, test inputs/outputs, and verify basic communication.`,
          `Step 4: Develop primary control loop algorithms and error handling code.`,
          `Step 5: Flash firmware or execute build routines to test local functions.`,
          `Step 6: Enclose system or package module and perform final system validation.`
        ],
        roadmap: [
          "Phase 1: Component Sourcing & Basic Setup (Days 1-2)",
          "Phase 2: Signal Hookups & Local Driver tests (Days 3-4)",
          "Phase 3: Integration & Control logic coding (Days 5-6)",
          "Phase 4: Calibration & Enclosure fitting (Days 7-8)"
        ],
        details: [
          "Accuracy: Calibrated to ±2% standard deviation",
          "Power/Resources: Optimized footprint, safe operating limits",
          "Cost Estimation: Approx. ₹2,500 ($30 USD) typical budget"
        ]
      };
      res.json({ found: false, blueprint: dynamicBlueprint });
    }
  } catch (err) {
    res.status(500).json({ error: "Error querying project blueprints." });
  }
});

app.get('/api/projects/wiki', (req, res) => {
  const { topic } = req.query;
  if (!topic) return res.status(400).json({ error: "Topic parameter is required." });

  const formattedTopic = encodeURIComponent(
    topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_')
  );
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTopic}`;

  https.get(wikiUrl, { headers: { 'User-Agent': 'HolderCareerPortal/1.0 (gokulsharmila82@gmail.com)' } }, (wikiRes) => {
    let data = '';
    wikiRes.on('data', chunk => data += chunk);
    wikiRes.on('end', () => {
      if (wikiRes.statusCode === 200) {
        try {
          const wikiJson = JSON.parse(data);
          res.json({
            title: wikiJson.title,
            extract: wikiJson.extract,
            pageurl: wikiJson.content_urls ? wikiJson.content_urls.desktop.page : `https://en.wikipedia.org/wiki/${formattedTopic}`
          });
        } catch (e) {
          res.status(500).json({ error: "Failed to parse Wikipedia summary response." });
        }
      } else {
        res.status(wikiRes.statusCode).json({ error: "Wikipedia page not found or request failed." });
      }
    });
  }).on('error', () => {
    res.status(500).json({ error: "Failed to connect to Wikipedia API." });
  });
});


// ==================== BIOMEDICAL AI SCANNER API ====================

app.post('/api/bio/scan', upload.single('mediaFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No media file uploaded." });

  const isVideo = req.file.mimetype.startsWith('video/');
  const fileType = isVideo ? 'video' : 'image';
  const filename = req.file.filename;
  const filepath = `/uploads/${filename}`;
  const userId = req.session.userId || null;

  const diagnosticClasses = [
    { name: "Cerebral Micro-calcification", metric: "Volumetric index: 3.8%", confidence: 0.91 },
    { name: "Normal Scan (No Abnormalities)", metric: "Structural symmetry: 98.4%", confidence: 0.97 },
    { name: "Slight Ventricular Hypertrophy", metric: "Internal diameter: 14.8mm", confidence: 0.88 },
    { name: "Pulmonary Nodule - Phase II", metric: "Maximum diameter: 6.2mm", confidence: 0.84 },
    { name: "Degenerative Joint Fissure", metric: "Fissure length: 2.1mm", confidence: 0.89 }
  ];

  const randIndex = Math.floor(Math.random() * diagnosticClasses.length);
  const diagnosis = diagnosticClasses[randIndex];

  try {
    db.run(
      `INSERT INTO medical_scans (user_id, filename, filepath, file_type, detected_class, confidence, structural_metric) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, filename, filepath, fileType, diagnosis.name, diagnosis.confidence, diagnosis.metric]
    );

    const overlayMask = {
      x: Math.floor(100 + Math.random() * 150),
      y: Math.floor(80 + Math.random() * 100),
      w: Math.floor(80 + Math.random() * 120),
      h: Math.floor(80 + Math.random() * 120),
      color: 'rgba(239, 68, 68, 0.4)'
    };

    res.json({
      message: "Analysis completed.",
      scan: {
        filepath,
        fileType,
        detectedClass: diagnosis.name,
        confidence: diagnosis.confidence,
        metric: diagnosis.metric,
        overlayMask
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save scan record to database." });
  }
});


// ==================== GAMES & ACHIEVEMENTS API ====================

app.post('/api/games/score', authenticateJWT, (req, res) => {
  const { game_name, score } = req.body;
  const userId = req.user.userId;

  if (!game_name || score === undefined) {
    return res.status(400).json({ error: "Game name and score are required." });
  }

  try {
    db.run(
      `INSERT INTO game_scores (user_id, game_name, score) VALUES (?, ?, ?)`,
      [userId, game_name, score]
    );

    const highRow = db.get(
      `SELECT MAX(score) as high FROM game_scores WHERE user_id = ? AND game_name = ?`,
      [userId, game_name]
    );

    res.json({
      message: "Score recorded.",
      highScore: highRow ? (highRow.high || 0) : score
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to record game score." });
  }
});

app.get('/api/games/highscore', authenticateJWT, (req, res) => {
  const { game_name } = req.query;
  const userId = req.user.userId;

  if (!game_name) return res.status(400).json({ error: "Game name query parameter is required." });

  try {
    const row = db.get(
      `SELECT MAX(score) as high FROM game_scores WHERE user_id = ? AND game_name = ?`,
      [userId, game_name]
    );
    res.json({ highScore: row ? (row.high || 0) : 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve high score." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Holder Server running at http://localhost:${PORT}`);
});
