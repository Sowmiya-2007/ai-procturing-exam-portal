# 🛡️ AI-Based Intelligent Examination Platform with Automated Proctoring & Candidate Performance Analysis

An Intelligent, Full-Stack Examination & AI-Proctoring Platform built with **FastAPI**, **React (Vite)**, **SQLAlchemy**, and modern real-time candidate monitoring.

---

## ✨ Key Features

- 👨‍💼 **Multi-Role Authentication & Access Control:**
  - **Admin**: Review & approve/reject examiners, candidate governance, system configuration, audit logs.
  - **Examiner**: Question bank management (Single MCQ, Multi-Select, Short Answer, Long Form with Rubrics, Handwritten Image Diagrams), AI/Document question extraction, exam creation with auto-randomization, candidate score audit & overrides.
  - **Student**: Candidate registration, exam schedule viewing, secure exam hall with AI proctoring telemetry.
- 👁️ **AI Proctoring & Integrity Telemetry:**
  - Real-time tab-switching / window blur detection
  - Fullscreen enforcement
  - Multi-face and missing-face alerts
  - Live proctor event logging and audit trails
- 📝 **Rich 5-Type Question Bank Engine:**
  - Multiple Choice (Single Correct)
  - Multiple Choice (Multiple Correct)
  - Short Subjective / Text Formulation
  - Long Descriptive / Comprehensive Essay (with Rubric guidelines)
  - Handwritten Diagram / Image Uploads (with Webcam snapshot & Upload support)
- 📄 **Automated Document Question Extractor:**
  - Import exam questions seamlessly from text, Word, Excel, and PDFs.
- 📊 **Automated & Manual Evaluation:**
  - Instant scoring for objective questions.
  - Examiner evaluation studio for descriptive responses and grade overrides.
  - Candidate performance scorecards and analytics.

---

## 🏗️ Architecture

```
ai-procturing-exam-portal/
├── backend/                  # FastAPI Backend API
│   ├── app/
│   │   ├── core/             # Database, Security, Extractors
│   │   ├── enums/            # Role, QuestionType, ExamStatus enums
│   │   ├── models/           # SQLAlchemy ORM Models
│   │   └── ...
│   ├── routers/              # API Endpoints (Auth, Admin, Exams, Questions, etc.)
│   ├── tests/                # Pytest Test Suite
│   ├── main.py               # FastAPI entry point
│   ├── seed_db.py            # Database seeder with sample data
│   ├── sync_db.py            # SQLite schema synchronizer
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React (Vite) Single Page Application
│   ├── src/
│   │   ├── components/       # UI Components & Proctoring Webcam view
│   │   ├── pages/            # Admin, Examiner, Student views
│   │   ├── services/         # API client & fetch helpers
│   │   └── ...
│   └── package.json          # Frontend dependencies
├── docker-compose.yml        # Multi-container Docker deployment
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (Optional)

### Option 1: Local Setup

1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python sync_db.py
   python seed_db.py
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Access web app: `http://localhost:5173`
   - Access API & Swagger Docs: `http://localhost:8001/docs`

### Option 2: Docker Compose
```bash
docker-compose up --build
```
- **Frontend:** `http://localhost:80`
- **Backend API:** `http://localhost:8001`

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Access Level & Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@examai.edu` | `Admin@123` | Examiner approvals, question bank, exam monitoring |
| **Examiner** | `examiner@examai.edu` | `Examiner@123` | Create & publish exams, question bank, evaluate results |
| **Pending Examiner** | `pending.examiner@examai.edu` | `Examiner@123` | Demonstrates the approval gatekeeper screen |
| **Student** | `student@examai.edu` | `Student@123` | Take scheduled exams, real-time proctoring, view scorecards |

---

## 📄 License
This project is licensed under the MIT License.
