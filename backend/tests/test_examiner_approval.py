import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.models.user import User
from app.models.question import Question
from app.models.exam import Exam
from app.enums.enums import UserRole, ApprovalStatus, QuestionType, DifficultyLevel, ExamStatus
from auth import hash_password, create_access_token
from main import app

# Setup in-memory SQLite database with StaticPool for persistent in-memory schema across threads
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Create Admin
    admin = User(
        name="Admin Test",
        email="admin@test.edu",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(admin)

    # Create Approved Examiner
    approved_ex = User(
        name="Approved Examiner",
        email="approved.ex@test.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(approved_ex)

    # Create Pending Examiner
    pending_ex = User(
        name="Pending Examiner",
        email="pending.ex@test.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.PENDING
    )
    db.add(pending_ex)

    # Create Rejected Examiner
    rejected_ex = User(
        name="Rejected Examiner",
        email="rejected.ex@test.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.REJECTED,
        rejection_reason="Invalid credentials"
    )
    db.add(rejected_ex)

    # Create Student
    student = User(
        name="Student Test",
        email="student@test.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.STUDENT,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(student)

    db.commit()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_token(setup_db):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "admin@test.edu").first()
    db.close()
    assert user is not None
    return create_access_token(data={"sub": str(user.id), "role": user.role.value})

@pytest.fixture
def approved_examiner_token(setup_db):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "approved.ex@test.edu").first()
    db.close()
    assert user is not None
    return create_access_token(data={"sub": str(user.id), "role": user.role.value})

@pytest.fixture
def pending_examiner_token(setup_db):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "pending.ex@test.edu").first()
    db.close()
    assert user is not None
    return create_access_token(data={"sub": str(user.id), "role": user.role.value})

@pytest.fixture
def rejected_examiner_token(setup_db):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "rejected.ex@test.edu").first()
    db.close()
    assert user is not None
    return create_access_token(data={"sub": str(user.id), "role": user.role.value})

@pytest.fixture
def student_token(setup_db):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "student@test.edu").first()
    db.close()
    assert user is not None
    return create_access_token(data={"sub": str(user.id), "role": user.role.value})

# =========================================================================
# 1. REGISTRATION TESTS
# =========================================================================

def test_student_registration_active(client):
    """Student registration -> status is APPROVED / ACTIVE immediately."""
    payload = {
        "name": "Active Student",
        "email": "active.student@test.edu",
        "register_number": "REG2026NEW",
        "department": "Computer Science",
        "year": "1st Year",
        "password": "Password@123",
        "role": "STUDENT"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "APPROVED"
    assert "Student registration successful" in data["message"] or "active" in data["message"].lower()

def test_examiner_registration_pending(client):
    """Examiner registration -> status is PENDING."""
    payload = {
        "name": "New Professor",
        "email": "new.prof@test.edu",
        "department": "Artificial Intelligence",
        "password": "Password@123",
        "role": "EXAMINER"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "PENDING"
    assert "pending administrator approval" in data["message"].lower()

def test_admin_registration_restrictions(client):
    """Direct registration as ADMIN role must be strictly rejected."""
    payload = {
        "name": "Rogue Admin",
        "email": "rogue.admin@test.edu",
        "password": "Password@123",
        "role": "ADMIN"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 403
    assert "restricted" in response.json()["detail"].lower()

def test_pending_examiner_login_blocked_with_pending_status(client):
    """Pending examiner cannot log in -> returns 403 Forbidden displaying PENDING status."""
    payload = {
        "identifier": "pending.ex@test.edu",
        "password": "Pass@123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 403
    data = response.json()
    assert "pending admin approval" in data["detail"].lower()
    assert "PENDING" in data["detail"]

def test_approved_examiner_login_successful(client):
    """Approved examiner logs in successfully and receives access token."""
    payload = {
        "identifier": "approved.ex@test.edu",
        "password": "Pass@123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "EXAMINER"
    assert data["user"]["approval_status"] == "APPROVED"

def test_rejected_examiner_login_blocked_with_rejected_status(client):
    """Rejected examiner cannot log in -> returns 403 Forbidden displaying REJECTED status."""
    payload = {
        "identifier": "rejected.ex@test.edu",
        "password": "Pass@123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 403
    data = response.json()
    assert "REJECTED" in data["detail"] or "not approved" in data["detail"].lower()


# =========================================================================
# 2. APPROVAL TESTS
# =========================================================================

def test_admin_can_approve_examiner(client, admin_token):
    """Admin can approve a pending examiner, setting status, approved_by and approved_at."""
    # Register an examiner to approve
    reg_res = client.post("/api/auth/register", json={
        "name": "Examiner To Approve",
        "email": "to_approve@test.edu",
        "department": "Data Science",
        "password": "Password@123",
        "role": "EXAMINER"
    })
    examiner_id = reg_res.json()["user_id"]

    # Admin approves
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.put(f"/api/admin/examiners/{examiner_id}/approve", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["approval_status"] == "APPROVED"
    assert data["examiner_id"] == examiner_id
    assert data["approved_by"] is not None

def test_admin_can_reject_examiner_with_reason(client, admin_token):
    """Admin can reject a pending examiner with a custom reason."""
    reg_res = client.post("/api/auth/register", json={
        "name": "Examiner To Reject",
        "email": "to_reject@test.edu",
        "department": "Mechanical",
        "password": "Password@123",
        "role": "EXAMINER"
    })
    examiner_id = reg_res.json()["user_id"]

    headers = {"Authorization": f"Bearer {admin_token}"}
    reject_payload = {"rejection_reason": "Incomplete verification documents."}
    response = client.put(f"/api/admin/examiners/{examiner_id}/reject", json=reject_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["approval_status"] == "REJECTED"
    assert data["rejection_reason"] == "Incomplete verification documents."

def test_non_admin_cannot_approve_examiner(client, student_token, approved_examiner_token):
    """Non-admin users (students or examiners) cannot call examiner approval endpoints."""
    # Student attempt
    headers_student = {"Authorization": f"Bearer {student_token}"}
    res1 = client.put("/api/admin/examiners/2/approve", headers=headers_student)
    assert res1.status_code == 403

    # Examiner attempt
    headers_examiner = {"Authorization": f"Bearer {approved_examiner_token}"}
    res2 = client.put("/api/admin/examiners/2/approve", headers=headers_examiner)
    assert res2.status_code == 403

# =========================================================================
# 3. QUESTION MANAGEMENT ENFORCEMENT
# =========================================================================

def test_pending_examiner_cannot_create_question(client, pending_examiner_token):
    """Pending examiner cannot create question -> 403 Forbidden with exact message."""
    headers = {"Authorization": f"Bearer {pending_examiner_token}"}
    payload = {
        "question_text": "Sample question by pending examiner?",
        "question_type": "SHORT_ANSWER",
        "subject": "Computer Science",
        "difficulty": "EASY",
        "marks": 5.0
    }
    response = client.post("/api/questions", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Your examiner account is awaiting admin approval."

def test_approved_examiner_can_create_question(client, approved_examiner_token):
    """Approved examiner can create questions successfully."""
    headers = {"Authorization": f"Bearer {approved_examiner_token}"}
    payload = {
        "question_text": "Valid question created by approved examiner?",
        "question_type": "SHORT_ANSWER",
        "subject": "Data Structures",
        "difficulty": "EASY",
        "marks": 5.0
    }
    response = client.post("/api/questions", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["id"] is not None

def test_rejected_examiner_cannot_create_question(client, rejected_examiner_token):
    """Rejected examiner cannot create questions -> 403 Forbidden with exact message."""
    headers = {"Authorization": f"Bearer {rejected_examiner_token}"}
    payload = {
        "question_text": "Question attempt by rejected examiner?",
        "question_type": "SHORT_ANSWER",
        "subject": "Networks",
        "difficulty": "MEDIUM",
        "marks": 5.0
    }
    response = client.post("/api/questions", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Your examiner account has been rejected. Please contact the administrator."

# =========================================================================
# 4. EXAM MANAGEMENT ENFORCEMENT
# =========================================================================

def test_pending_examiner_cannot_create_exam(client, pending_examiner_token):
    """Pending examiner cannot create exam -> 403 Forbidden."""
    headers = {"Authorization": f"Bearer {pending_examiner_token}"}
    payload = {
        "title": "Pending Exam Test",
        "subject": "Artificial Intelligence",
        "duration_minutes": 60,
        "total_marks": 100.0
    }
    response = client.post("/api/exams", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Your examiner account is awaiting admin approval."

def test_approved_examiner_can_create_exam(client, approved_examiner_token):
    """Approved examiner can create exams successfully."""
    headers = {"Authorization": f"Bearer {approved_examiner_token}"}
    payload = {
        "title": "Approved Exam Midterm",
        "subject": "Algorithms",
        "duration_minutes": 90,
        "total_marks": 50.0
    }
    response = client.post("/api/exams", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["id"] is not None

def test_rejected_examiner_cannot_create_exam(client, rejected_examiner_token):
    """Rejected examiner cannot create exams -> 403 Forbidden."""
    headers = {"Authorization": f"Bearer {rejected_examiner_token}"}
    payload = {
        "title": "Rejected Exam Attempt",
        "subject": "Cybersecurity",
        "duration_minutes": 60,
        "total_marks": 50.0
    }
    response = client.post("/api/exams", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Your examiner account has been rejected. Please contact the administrator."

def test_approved_examiner_can_get_random_questions(client, approved_examiner_token):
    """Approved examiner can request random questions from question pool."""
    headers = {"Authorization": f"Bearer {approved_examiner_token}"}
    payload = {
        "subject": "Data Structures",
        "question_count": 3
    }
    response = client.post("/api/exams/random-questions", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_pending_examiner_blocked_from_random_questions(client, pending_examiner_token):
    """Pending examiner is blocked from requesting random questions -> 403 Forbidden."""
    headers = {"Authorization": f"Bearer {pending_examiner_token}"}
    payload = {
        "question_count": 5
    }
    response = client.post("/api/exams/random-questions", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Your examiner account is awaiting admin approval."


# =========================================================================
# 5. SECURITY & ADMIN EXAMINERS LISTING
# =========================================================================

def test_admin_get_pending_examiners(client, admin_token):
    """GET /admin/examiners/pending returns all pending examiners."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/examiners/pending", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for ex in data:
        assert ex["approval_status"] == "PENDING"

def test_security_direct_api_access_without_token(client):
    """Direct access to protected endpoints without authentication returns 401."""
    res1 = client.post("/api/questions", json={})
    assert res1.status_code == 401

    res2 = client.post("/api/exams", json={})
    assert res2.status_code == 401

    res3 = client.get("/api/admin/examiners")
    assert res3.status_code == 401
