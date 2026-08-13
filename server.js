const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the parent directory (frontend)
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-jwt-key-for-future-india';

// Configure Nodemailer for Gmail
// Note: To use this with a real Gmail account, you must enable 2-Step Verification 
// and generate an "App Password". Replace the user/pass below with your own.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gokulsharmila82@gmail.com', // TODO: Replace with your Gmail
        pass: 'safg mdhm fajs gbue'     // TODO: Replace with your Gmail App Password
    }
});

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. REGISTER API
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, mobile } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = generateOTP();

        db.run(
            `INSERT INTO users (name, email, password_hash, mobile, otp_code, is_verified) VALUES (?, ?, ?, ?, ?, 0)`,
            [name, email, hashedPassword, mobile, otpCode],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ message: 'Email already exists' });
                    }
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }

                // Send OTP via Email
                const mailOptions = {
                    from: 'your_email@gmail.com',
                    to: email,
                    subject: 'Future India Placement - Verification OTP',
                    html: `
                        <h2>Welcome to Future India Placement Portal</h2>
                        <p>Hello ${name},</p>
                        <p>Your verification OTP is: <strong>${otpCode}</strong></p>
                        <p>This OTP is valid for a limited time. Please enter it on the website to verify your account.</p>
                    `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email:', error);
                        // For development purposes, if email fails (e.g. invalid credentials), we still return success 
                        // but log the OTP so we can test the flow.
                        console.log(`[DEV MODE] Email failed. OTP is: ${otpCode}`);
                    }
                });

                res.status(201).json({ message: 'Registration successful. Please check your email for OTP.' });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 2. VERIFY OTP API
app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    db.get(`SELECT id, otp_code, is_verified FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (row.is_verified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        if (row.otp_code === otp) {
            db.run(`UPDATE users SET is_verified = 1, otp_code = NULL WHERE email = ?`, [email], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ message: 'Error updating user verification status' });
                }
                res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
            });
        } else {
            res.status(400).json({ message: 'Invalid OTP code' });
        }
    });
});

// 3. LOGIN API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Please verify your email via OTP before logging in' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile
            }
        });
    });
});

// 3.5. GET CURRENT USER (Auto-login)
app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const userId = decoded.userId;
        db.get(`SELECT id, name, email, mobile FROM users WHERE id = ? AND is_verified = 1`, [userId], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ user });
        });
    });
});

// 4. ADMIN API (Hidden route to view users)
app.get('/api/admin/users', (req, res) => {
    // In a real production app, you would add an Admin password/token check here!
    // For this project, we'll leave it open for you to view easily.
    db.all(`SELECT id, name, email, mobile, is_verified FROM users`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json(rows);
    });
});

// 5. DEACTIVATE ACCOUNT API
app.delete('/api/auth/deactivate', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const userId = decoded.userId;
        db.run(`DELETE FROM users WHERE id = ?`, [userId], function (err) {
            if (err) {
                return res.status(500).json({ message: 'Database error while deactivating account' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'Account deleted successfully' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
