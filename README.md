# Holder Portal - AI-Powered English Communication & Career Growth Platform

A comprehensive full-stack web application that combines English communication learning, career growth resources, biomedical analysis, and AI-powered integrations.

## 📋 Features

### 1. **Core Platform**
- ✅ User authentication with email verification
- ✅ JWT-based session management
- ✅ Secure password encryption (bcryptjs)
- ✅ Role-based access control (User/Admin)
- ✅ Responsive UI with dark/light theme support

### 2. **AI Biomedical Analyzer** 🔬
A powerful medical image analysis tool featuring:
- 📷 Upload medical images (JPG, PNG) or videos (MP4)
- 🔍 **Google Vision API** - Advanced image analysis, OCR, object detection
- 🧠 **ChatGPT (OpenAI)** - AI-powered medical insights
- ✨ **Google Gemini** - Multimodal AI analysis
- 🤖 **Claude (Anthropic)** - Advanced reasoning capabilities
- 📚 **Wikipedia Integration** - Medical references and background
- 🔎 **Google Search** - Latest research and clinical findings
- ▶️ **YouTube** - Educational videos and expert explanations
- 💼 **LinkedIn** - Connect with health professionals
- 📄 **PDF Report Generation** - Export comprehensive analysis reports
- 💾 **Analysis Storage** - SQLite database for storing results

### 3. **Career Portal**
- 🎯 Job and internship listings
- 🏢 Company information
- 📍 Location-based filtering
- 💰 Salary information
- 🔔 Job alerts and notifications

### 4. **Integrations Hub**
- 🌐 Multiple AI services integration
- 🔗 Quick access to essential tools
- 📊 Integration results tracking
- 💾 Search history and bookmarks

### 5. **Admin Dashboard**
- 📊 System statistics and analytics
- 👥 User management
- 🗂️ Content moderation
- 📈 Platform metrics

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.19+
- **Database**: SQLite3 (with node:sqlite for synchronous operations)
- **Authentication**: JWT + bcryptjs
- **File Handling**: Multer
- **Email**: Nodemailer
- **API Integration**: Axios
- **Vision AI**: @google-cloud/vision
- **PDF Generation**: PDFKit

### Frontend
- **HTML5/CSS3** - Responsive design with CSS Grid & Flexbox
- **JavaScript (ES6+)** - Vanilla JS, no heavy frameworks
- **3D Graphics**: Three.js
- **PDF Export**: jsPDF
- **UI Components**: Custom styled components

### External APIs
1. **Google Cloud Platform**
   - Vision API (image analysis)
   - Custom Search API (web search)
   - YouTube API (video search)
   - Gemini API (AI model)

2. **OpenAI**
   - GPT-4 API (ChatGPT)

3. **Anthropic**
   - Claude API (advanced AI)

4. **LinkedIn**
   - Professional network integration (for finding experts)

## 📁 Project Structure

```
holder-portal/
├── frontend/                    # Frontend application
│   ├── index.html              # Main portal page
│   ├── admin.html              # Admin dashboard
│   ├── biomedical-analyzer.html # AI Analyzer interface
│   ├── biomedical-analyzer.js  # Analyzer logic
│   ├── style.css               # Styling
│   └── uploads/                # User file uploads
│
├── backend/                    # Backend server
│   ├── server.js              # Express server & API routes
│   ├── database.js            # SQLite database setup
│   ├── ai-integrations.js     # AI services module
│   ├── crypto-utils.js        # Encryption utilities
│   ├── integrations.js        # External integrations
│   ├── app.js                 # Main app logic
│   ├── backend.js             # Backend utilities
│   ├── package.json           # Dependencies
│   ├── .env.example           # Environment template
│   ├── database.sqlite        # SQLite database file
│   ├── render.yaml            # Deployment config
│   └── node_modules/          # Dependencies
│
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 16.x or higher
- npm or yarn
- API keys for:
  - OpenAI (ChatGPT)
  - Google Cloud (Vision, Custom Search, YouTube, Gemini)
  - Anthropic (Claude)

### 1. Clone the Repository
```bash
git clone https://github.com/tnesh833-eng/Holder.git
cd Holder
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your API keys
# OPENAI_API_KEY=sk-your-key-here
# GOOGLE_API_KEY=your-key-here
# GEMINI_API_KEY=your-key-here
# CLAUDE_API_KEY=sk-ant-your-key-here
# YOUTUBE_API_KEY=your-key-here

# Start the server
npm start
# Server runs on http://localhost:3000
```

### 3. Frontend Setup
```bash
cd frontend

# If using a local server, open in browser:
# http://localhost:3000/index.html

# For development with live reload:
# Use VS Code Live Server or similar
```

## 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Port
PORT=3000

# Database
DATA_DIR=./

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AI APIs
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_API_KEY=your-google-api-key
GOOGLE_APPLICATION_CREDENTIALS=./path-to-google-credentials.json
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
GEMINI_API_KEY=your-gemini-key
CLAUDE_API_KEY=sk-ant-your-claude-key
YOUTUBE_API_KEY=your-youtube-key

# Environment
NODE_ENV=development
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/logout` - Logout

### AI Integrations
- `POST /api/ai/wikipedia` - Search Wikipedia
- `POST /api/ai/google-search` - Google Search
- `POST /api/ai/vision-analyze` - Google Vision analysis
- `POST /api/ai/chatgpt` - ChatGPT query
- `POST /api/ai/gemini` - Gemini query
- `POST /api/ai/claude` - Claude query
- `POST /api/ai/youtube-search` - YouTube video search
- `POST /api/ai/linkedin-search` - LinkedIn professional search
- `POST /api/ai/biomedical-analysis` - Comprehensive biomedical analysis
- `GET /api/ai/analysis-history` - Get user's analysis history
- `GET /api/ai/analysis/:id` - Get specific analysis

### Jobs & Careers
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/apply-job` - Apply for a job

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/logs` - Activity logs

## 📊 Database Schema

### Main Tables
1. **users** - User accounts and profiles
2. **jobs** - Job listings
3. **game_scores** - User game scores
4. **medical_scans** - Medical scan results
5. **notifications** - User notifications
6. **project_blueprints** - Project ideas
7. **prospects** - LinkedIn prospects
8. **biomedical_analyses** - AI analysis results
9. **ai_integration_results** - Integration query results
10. **pdf_reports** - Generated PDF reports

## 🚢 Deployment

### Deploy to Render.com
1. Push code to GitHub
2. Connect GitHub repo to Render
3. Use `render.yaml` for configuration
4. Set environment variables in Render dashboard
5. Deploy!

### Deploy to Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create holder-portal

# Set environment variables
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set GOOGLE_API_KEY=...

# Deploy
git push heroku main
```

### Deploy to Vercel (Frontend only)
```bash
npm install -g vercel
cd frontend
vercel
```

## 🔐 Security Features

- 🔒 Password encryption with bcryptjs
- 🔐 JWT-based authentication
- 📧 Email verification
- 🛡️ CORS protection
- 🚫 SQL injection prevention (parameterized queries)
- 🔑 Secure API key management (.env files)
- 🚫 XSS prevention with input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 👥 Support & Contact

- **GitHub Issues**: [Create an issue](https://github.com/tnesh833-eng/Holder/issues)
- **Email**: For support, contact the project maintainer
- **LinkedIn**: [Connect with us](https://www.linkedin.com)

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced ML models for image analysis
- [ ] Real-time notifications
- [ ] Video call interviews
- [ ] Blockchain-based certificates
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Performance optimization
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] CI/CD pipeline with GitHub Actions

## 🙏 Acknowledgments

- Google Cloud for Vision and Search APIs
- OpenAI for ChatGPT integration
- Anthropic for Claude
- The open-source community
- All contributors and users

---

**Last Updated**: August 2026

For the latest updates and features, visit the [GitHub repository](https://github.com/tnesh833-eng/Holder)
