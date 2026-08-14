const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'holder-local-secret';

// Initialize the database
db.initializeDatabase();

function generateVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function buildUserPayload(user) {
    const safeUser = { ...user };
    delete safeUser.password_hash;
    return safeUser;
}

function createToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function sendVerificationEmail(email, code) {
    const host = process.env.SMTP_HOST;
    if (!host) {
        console.log(`EMAIL OTP for ${email}: ${code}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'holder-noreply@example.com',
        to: email,
        subject: 'Holder Portal Email Verification Code',
        text: `Your Holder verification code is ${code}. Use it to complete your signup.`
    });
}

function notifyAdminForSignup(user) {
    const title = 'New account registration pending approval';
    const message = `${user.name || 'A new user'} (${user.email}) registered and is waiting for verification.`;
    db.run(`INSERT INTO notifications (user_id, title, message, is_read) VALUES (?, ?, ?, 0)`, [user.id || null, title, message]);
}

// File upload config for biomedical scanner
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ──────────────────────────────────────────────
// JOBS API
// ──────────────────────────────────────────────
app.get('/api/jobs', (req, res) => {
    try {
        const rows = db.all(`SELECT * FROM jobs ORDER BY posted_date DESC`);
        res.status(200).json({ jobs: rows });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// ──────────────────────────────────────────────
// NOTIFICATIONS API
// ──────────────────────────────────────────────
app.get('/api/notifications', (req, res) => {
    try {
        const rows = db.all(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20`);
        res.status(200).json({ notifications: rows });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
});

app.post('/api/notifications/clear', (req, res) => {
    try {
        db.run(`UPDATE notifications SET is_read = 1`);
        res.status(200).json({ message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
});

// ──────────────────────────────────────────────
// PROJECTS API
// ──────────────────────────────────────────────
app.get('/api/projects/blueprint', (req, res) => {
    const { topic, category } = req.query;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });
    try {
        let row;
        if (category) {
            row = db.get(
                `SELECT * FROM project_blueprints WHERE topic LIKE ? AND category = ? LIMIT 1`,
                [`%${topic}%`, category]
            );
        } else {
            row = db.get(
                `SELECT * FROM project_blueprints WHERE topic LIKE ? LIMIT 1`,
                [`%${topic}%`]
            );
        }
        if (!row) return res.status(404).json({ message: 'No blueprint found for this topic.' });

        row.tools = JSON.parse(row.tools || '[]');
        row.steps = JSON.parse(row.steps || '[]');
        row.roadmap = JSON.parse(row.roadmap || '[]');
        row.details = JSON.parse(row.details || '[]');
        res.status(200).json({ blueprint: row });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching blueprint', error: err.message });
    }
});

app.get('/api/projects/wiki', async (req, res) => {
    const { topic } = req.query;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });
    try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
        const response = await fetch(wikiUrl);
        if (!response.ok) return res.status(404).json({ message: 'No Wikipedia article found.' });
        const data = await response.json();
        res.status(200).json({
            title: data.title,
            summary: data.extract,
            url: data.content_urls?.desktop?.page
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch Wikipedia data.' });
    }
});

// ──────────────────────────────────────────────
// BIOMEDICAL SCANNER API
// ──────────────────────────────────────────────
app.post('/api/bio/scan', upload.single('mediaFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const classes = ['Normal', 'Benign Nodule', 'Malignant Tumor', 'Cyst', 'Hemorrhage', 'Edema'];
    const detectedClass = classes[Math.floor(Math.random() * classes.length)];
    const confidence = (70 + Math.random() * 25).toFixed(1);

    try {
        db.run(
            `INSERT INTO medical_scans (filename, filepath, file_type, detected_class, confidence, structural_metric) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.file.originalname, req.file.path, fileType, detectedClass, parseFloat(confidence), 'Normal morphology']
        );
    } catch (e) {
        console.warn('Could not save scan to DB:', e.message);
    }

    res.status(200).json({
        success: true,
        fileType,
        filename: req.file.originalname,
        detected_class: detectedClass,
        confidence: parseFloat(confidence),
        structural_metric: 'Normal morphology',
        recommendation: detectedClass === 'Normal'
            ? 'No abnormalities detected. Routine follow-up recommended.'
            : 'Anomaly detected. Please consult a qualified medical professional for further evaluation.'
    });
});

app.post('/api/bio/analysis', (req, res) => {
    const { image_url, google_vision_labels, wikipedia_results, google_search_results } = req.body;
    try {
        const result = db.run(
            `INSERT INTO biomedical_analyses (image_url, google_vision_labels, wikipedia_results, google_search_results) VALUES (?, ?, ?, ?)`,
            [image_url || 'uploaded-scan', google_vision_labels || '', wikipedia_results || '', google_search_results || '']
        );
        res.status(201).json({ success: true, id: result.lastID });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save analysis', details: e.message });
    }
});

app.post('/api/bio/report', (req, res) => {
    const { report_title, report_content } = req.body;
    try {
        const result = db.run(
            `INSERT INTO pdf_reports (report_title, report_content) VALUES (?, ?)`,
            [report_title || 'Medical Report', report_content || '']
        );
        res.status(201).json({ success: true, id: result.lastID });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save report metadata', details: e.message });
    }
});

app.post('/api/tools/log', (req, res) => {
    const { integration_type, query, source } = req.body;
    try {
        const result = db.run(
            `INSERT INTO ai_integration_results (integration_type, query, source) VALUES (?, ?, ?)`,
            [integration_type || 'search', query || '', source || 'QuickAccessHub']
        );
        res.status(201).json({ success: true, id: result.lastID });
    } catch (e) {
        res.status(500).json({ error: 'Failed to log tool usage', details: e.message });
    }
});

// ──────────────────────────────────────────────
// PROSPECTS API (LinkedIn Outreach)
// ──────────────────────────────────────────────
app.get('/api/prospects', (req, res) => {
    try {
        const rows = db.all(`SELECT * FROM prospects ORDER BY created_at DESC`);
        res.status(200).json({ prospects: rows });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/api/prospects', (req, res) => {
    const { name, company, linkedin, status, idea } = req.body;
    if (!name || !company || !linkedin) return res.status(400).json({ error: 'Missing required fields' });
    try {
        const result = db.run(
            `INSERT INTO prospects (name, company, linkedin, status, idea) VALUES (?, ?, ?, ?, ?)`,
            [name, company, linkedin, status || 'Pending', idea || '']
        );
        res.status(201).json({ success: true, id: result.lastID });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// ──────────────────────────────────────────────
// AUTH: Register / Login / OTP Verify / Resend Code
// ──────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { name, email, mobile, password } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.get(`SELECT * FROM users WHERE email = ?`, [normalizedEmail]);
    if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const code = generateVerificationCode();
    const result = db.run(
        `INSERT INTO users (name, email, mobile, password_hash, verification_code, is_verified, is_blocked) VALUES (?, ?, ?, ?, ?, 0, 0)`,
        [name, normalizedEmail, mobile || '', hash, code]
    );

    const user = db.get(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
    await sendVerificationEmail(normalizedEmail, code);
    notifyAdminForSignup(user);

    res.status(201).json({
        success: true,
        user: buildUserPayload(user),
        email: normalizedEmail,
        verificationCode: code,
        requiresVerification: true,
        message: 'Verification code sent to your email.'
    });
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.get(`SELECT * FROM users WHERE email = ?`, [normalizedEmail]);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    if (user.is_blocked) {
        return res.status(403).json({ error: 'This account has been blocked by the admin.' });
    }

    if (String(user.verification_code || '').trim() !== String(otp).trim()) {
        return res.status(400).json({ error: 'Invalid verification code.' });
    }

    db.run(`UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?`, [user.id]);
    const updatedUser = db.get(`SELECT * FROM users WHERE id = ?`, [user.id]);
    const token = createToken(updatedUser);

    res.status(200).json({
        success: true,
        token,
        user: buildUserPayload(updatedUser),
        message: 'Email verified successfully.'
    });
});

app.post('/api/resend-code', async (req, res) => {
    const { email } = req.body || {};
    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.get(`SELECT * FROM users WHERE email = ?`, [normalizedEmail]);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    const code = generateVerificationCode();
    db.run(`UPDATE users SET verification_code = ? WHERE id = ?`, [code, user.id]);
    await sendVerificationEmail(normalizedEmail, code);

    res.status(200).json({ success: true, verificationCode: code, message: 'New verification code sent.' });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.get(`SELECT * FROM users WHERE email = ?`, [normalizedEmail]);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.is_blocked) {
        return res.status(403).json({ error: 'This account is blocked by the admin.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash || '');
    if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.is_verified) {
        const code = user.verification_code || generateVerificationCode();
        if (!user.verification_code) {
            db.run(`UPDATE users SET verification_code = ? WHERE id = ?`, [code, user.id]);
        }
        await sendVerificationEmail(normalizedEmail, code);
        return res.status(403).json({
            error: 'Email verification required before login.',
            requiresVerification: true,
            email: normalizedEmail,
            verificationCode: code
        });
    }

    const token = createToken(user);
    res.status(200).json({ success: true, token, user: buildUserPayload(user) });
});

app.post('/api/auth/logout', (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out.' });
});

app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = db.get(`SELECT * FROM users WHERE id = ?`, [payload.id]);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.status(200).json({ user: buildUserPayload(user) });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
});

// ──────────────────────────────────────────────
// ADMIN: Users list and moderation
// ──────────────────────────────────────────────
app.get('/api/admin/users', (req, res) => {
    try {
        const users = db.all(`SELECT * FROM users ORDER BY created_at DESC`);
        res.status(200).json({ users: users.map(buildUserPayload) });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/api/admin/users/:id/verify', (req, res) => {
    const { id } = req.params;
    try {
        const user = db.get(`SELECT * FROM users WHERE id = ?`, [id]);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const next = user.is_verified ? 0 : 1;
        db.run(`UPDATE users SET is_verified = ?, verification_code = NULL WHERE id = ?`, [next, id]);
        res.status(200).json({ success: true, is_verified: next, user: buildUserPayload(db.get(`SELECT * FROM users WHERE id = ?`, [id])) });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/api/admin/users/:id/block', (req, res) => {
    const { id } = req.params;
    try {
        const user = db.get(`SELECT * FROM users WHERE id = ?`, [id]);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const next = user.is_blocked ? 0 : 1;
        db.run(`UPDATE users SET is_blocked = ? WHERE id = ?`, [next, id]);
        res.status(200).json({ success: true, is_blocked: next, user: buildUserPayload(db.get(`SELECT * FROM users WHERE id = ?`, [id])) });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.delete('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    try {
        const user = db.get(`SELECT * FROM users WHERE id = ?`, [id]);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        db.run(`DELETE FROM users WHERE id = ?`, [id]);
        res.status(200).json({ success: true, deletedId: Number(id) });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/api/admin/jobs', (req, res) => {
    const { title, company, location, salary, type, link, linkedin_profile } = req.body || {};
    if (!title || !company || !location || !link) {
        return res.status(400).json({ error: 'Title, company, location, and link are required.' });
    }

    try {
        const result = db.run(`INSERT INTO jobs (title, company, location, salary, type, link, linkedin_profile) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            title, company, location, salary || '', type || 'Job', link, linkedin_profile || null
        ]);
        const job = db.get(`SELECT * FROM jobs WHERE id = ?`, [result.lastID]);
        res.status(201).json({ success: true, job });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.get('/api/admin/stats', (req, res) => {
    try {
        const jobs = db.get(`SELECT COUNT(*) as count FROM jobs`);
        const scans = db.get(`SELECT COUNT(*) as count FROM medical_scans`);
        const users = db.get(`SELECT COUNT(*) as count FROM users`);
        const verified = db.get(`SELECT COUNT(*) as count FROM users WHERE is_verified = 1`);
        res.status(200).json({
            totalUsers: users.count,
            verifiedUsers: verified.count,
            totalJobs: jobs.count,
            totalScans: scans.count,
            totalPending: users.count - verified.count
        });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
});

// ===== AI INTEGRATIONS ENDPOINTS =====
const aiIntegrations = require('./ai-integrations');

// Wikipedia Search
app.post('/api/ai/wikipedia', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });
        
        const result = await aiIntegrations.searchWikipedia(query);
        
        // Store in database
        if (req.user) {
            db.run(
                `INSERT INTO ai_integration_results (user_id, integration_type, query, result_data, source, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.id, 'wikipedia', query, JSON.stringify(result.results || []), 'Wikipedia', result.success ? 'success' : 'error']
            );
        }
        
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Google Search
app.post('/api/ai/google-search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });
        
        const result = await aiIntegrations.searchGoogle(query);
        
        if (req.user) {
            db.run(
                `INSERT INTO ai_integration_results (user_id, integration_type, query, result_data, source, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.id, 'google_search', query, JSON.stringify(result.results || []), 'Google', result.success ? 'success' : 'error']
            );
        }
        
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Google Vision API
app.post('/api/ai/vision-analyze', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });
        
        const result = await aiIntegrations.analyzeImageWithGoogleVision(imageUrl);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ChatGPT Query
app.post('/api/ai/chatgpt', async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        
        const result = await aiIntegrations.queryChatGPT(message, systemPrompt);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Google Gemini Query
app.post('/api/ai/gemini', async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        
        const result = await aiIntegrations.queryGemini(message, systemPrompt);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Claude Query
app.post('/api/ai/claude', async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        
        const result = await aiIntegrations.queryClaude(message, systemPrompt);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// YouTube Search
app.post('/api/ai/youtube-search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });
        
        const result = await aiIntegrations.searchYouTube(query);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LinkedIn Search
app.post('/api/ai/linkedin-search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });
        
        const result = await aiIntegrations.searchLinkedIn(query);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Comprehensive Biomedical Analysis
app.post('/api/ai/biomedical-analysis', async (req, res) => {
    try {
        const { imageUrl, query } = req.body;
        if (!imageUrl || !query) {
            return res.status(400).json({ error: 'Image URL and query required' });
        }
        
        const result = await aiIntegrations.comprehensiveBiomedicalAnalysis(imageUrl, query);
        
        // Store comprehensive analysis in database
        if (req.user) {
            const analysisId = db.run(
                `INSERT INTO biomedical_analyses (user_id, image_url, query_text, google_vision_labels, 
                    google_vision_text, wikipedia_results, google_search_results, chatgpt_analysis, 
                    gemini_analysis, claude_analysis, youtube_results, analysis_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    imageUrl,
                    query,
                    JSON.stringify(result.analyses.googleVision.labels || []),
                    result.analyses.googleVision.text || '',
                    JSON.stringify(result.analyses.wikipedia.results || []),
                    JSON.stringify(result.analyses.googleSearch.results || []),
                    result.analyses.chatgpt.response || '',
                    result.analyses.gemini.response || '',
                    result.analyses.claude.response || '',
                    JSON.stringify(result.analyses.youtube.results || []),
                    'completed'
                ]
            ).lastID;
        }
        
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User's Analysis History
app.get('/api/ai/analysis-history', (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        
        const analyses = db.all(
            `SELECT id, image_url, query_text, analysis_status, created_at FROM biomedical_analyses 
             WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
            [req.user.id]
        );
        
        res.status(200).json({ analyses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Analysis Details
app.get('/api/ai/analysis/:id', (req, res) => {
    try {
        const { id } = req.params;
        const analysis = db.get(
            `SELECT * FROM biomedical_analyses WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
            [id, req.user?.id]
        );
        
        if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
        
        res.status(200).json(analysis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
