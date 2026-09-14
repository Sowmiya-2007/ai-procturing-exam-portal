# 🛡️ AI Proctoring Exam Portal

An Intelligent, Full-Stack Examination & AI-Proctoring Platform built with **FastAPI**, **React (Vite)**, **SQLAlchemy**, and modern real-time candidate monitoring.

---

## ✨ Key Features

- 👨‍💼 **Multi-Role Authentication & Access Control:**
  - **Admin**: Review & approve/reject examiners, system configuration, audit logs.
  - **Examiner**: Question bank management (Multiple Choice, Multiple Response, True/False, Coding, Descriptive), AI/Document question extraction, exam creation, live proctoring dashboard.
  - **Student**: Candidate registration, exam schedule viewing, secure exam hall with AI proctoring telemetry.
- 👁️ **AI Proctoring & Integrity Telemetry:**
  - Real-time tab-switching / window blur detection
  - Fullscreen enforcement
  - Multi-face and missing-face alerts
  - Live proctor event logging and audit trails
- 📝 **Rich Question Bank Engine:**
  - Multiple Choice (Single Correct)
  - Multiple Choice (Multiple Correct)
  - True / False
  - Coding Questions (with automated test suites)
  - Short / Long Descriptive Questions
- 📄 **Automated Document Question Extractor:**
  - Import exam questions seamlessly from text/documents.
- 📊 **Automated & Manual Evaluation:**
  - Instant scoring for objective questions.
  - Examiner evaluation studio for descriptive responses.
  - Certificate/Result generation and analytics.

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
│   ├── main.py               # FastAPI entry point
│   ├── seed_db.py            # Database seeder with sample data
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

### Option 1: Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python seed_db.py
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```
- **Backend API:** `http://localhost:8001`
- **Swagger Docs:** `http://localhost:8001/docs`

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- **Frontend App:** `http://localhost:5173`

---

### Option 2: Docker Compose
```bash
docker-compose up --build
```
- **Frontend:** `http://localhost:80`
- **Backend API:** `http://localhost:8001`

---

## 🔑 Demo Login Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@examai.edu` | `Admin@123` |
| **Examiner** | `examiner@examai.edu` | `Examiner@123` |
| **Student** | `student@examai.edu` | `Student@123` |

---

## 📄 License
This project is licensed under the MIT License.
