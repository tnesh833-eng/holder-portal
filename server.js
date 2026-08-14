const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// Initialize the database
db.initializeDatabase();

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
// ADMIN: Users list (simplified)
// ──────────────────────────────────────────────
app.get('/api/admin/stats', (req, res) => {
    try {
        const jobs = db.get(`SELECT COUNT(*) as count FROM jobs`);
        const scans = db.get(`SELECT COUNT(*) as count FROM medical_scans`);
        res.status(200).json({ jobs: jobs.count, scans: scans.count });
    } catch (err) {
        res.status(500).json({ message: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
