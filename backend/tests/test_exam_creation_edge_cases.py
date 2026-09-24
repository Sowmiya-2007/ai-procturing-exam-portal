import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, get_db
from app.models.user import User
from app.models.question import Question, Option
from app.models.exam import Exam, ExamQuestion
from app.enums.enums import UserRole, ApprovalStatus, QuestionType, DifficultyLevel, ExamStatus
from auth import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture
def test_env():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())

    # Create approved examiner
    examiner = db.query(User).filter(User.email == "exam.creator.test@examai.edu").first()
    if not examiner:
        examiner = User(
            name="Prof. Exam Creator",
            email="exam.creator.test@examai.edu",
            password_hash=hash_password("Password@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(examiner)
        db.commit()
        db.refresh(examiner)

    # Create test questions
    q1 = Question(
        subject="Computer Networks",
        question_text="Which layer handles end-to-end reliability in OSI model?",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        max_marks=2.0,
        negative_marks=0.5,
        created_by=examiner.id
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    db.add_all([
        Option(question_id=q1.id, option_text="Physical", is_correct=False),
        Option(question_id=q1.id, option_text="Transport", is_correct=True),
        Option(question_id=q1.id, option_text="Application", is_correct=False)
    ])
    db.commit()

    q2 = Question(
        subject="Operating Systems",
        question_text="Explain the concept of virtual memory and paging in modern operating systems.",
        question_type=QuestionType.LONG_ANSWER,
        difficulty=DifficultyLevel.HARD,
        max_marks=10.0,
        negative_marks=0.0,
        created_by=examiner.id
    )
    db.add(q2)
    db.commit()
    db.refresh(q2)

    token = create_access_token(data={
        "sub": str(examiner.id),
        "role": examiner.role.value,
        "approval_status": examiner.approval_status.value
    })

    yield {
        "db": db,
        "examiner": examiner,
        "q1": q1,
        "q2": q2,
        "token": token
    }


def test_create_published_exam_success(test_env):
    """Test creating and publishing an exam with questions."""
    token = test_env["token"]
    q1_id = test_env["q1"].id
    q2_id = test_env["q2"].id

    payload = {
        "title": "Comprehensive Midterm 2026",
        "subject": "Computer Science & Engineering",
        "description": "Midterm test for 3rd year engineering candidates.",
        "duration_minutes": 90,
        "total_marks": 12.0,
        "passing_marks": 4.8,
        "status": "PUBLISHED",
        "proctoring_enabled": True,
        "webcam_monitoring_enabled": True,
        "gaze_tracking_enabled": True,
        "max_tab_switch_warnings": 3,
        "questions": [
            {"question_id": q1_id, "marks": 2.0, "order": 1},
            {"question_id": q2_id, "marks": 10.0, "order": 2}
        ]
    }

    res = client.post("/api/exams", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["title"] == "Comprehensive Midterm 2026"
    assert data["status"] == "PUBLISHED"
    assert len(data["exam_questions"]) == 2
    assert data["total_marks"] == 12.0
    assert data["passing_marks"] == 4.8


def test_create_draft_exam_without_questions(test_env):
    """Test creating a draft exam with 0 questions is allowed."""
    token = test_env["token"]

    payload = {
        "title": "Draft Exam Blueprint",
        "subject": "Artificial Intelligence",
        "description": "Blueprint without finalized questions yet.",
        "duration_minutes": 60,
        "total_marks": 0.0,
        "passing_marks": 0.0,
        "status": "DRAFT",
        "questions": []
    }

    res = client.post("/api/exams", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["title"] == "Draft Exam Blueprint"
    assert data["status"] == "DRAFT"
    assert len(data["exam_questions"]) == 0


def test_create_published_exam_without_questions_fails(test_env):
    """Test publishing an exam with 0 questions is rejected with clean 400 error."""
    token = test_env["token"]

    payload = {
        "title": "Empty Published Exam",
        "subject": "Data Structures",
        "duration_minutes": 60,
        "total_marks": 100.0,
        "passing_marks": 40.0,
        "status": "PUBLISHED",
        "questions": []
    }

    res = client.post("/api/exams", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert "Cannot publish an exam without questions" in res.json()["detail"]


def test_create_exam_with_nonexistent_question_id_fails_cleanly(test_env):
    """Test that specifying non-existent question IDs yields a clear 400 error instead of 500 DB exception."""
    token = test_env["token"]

    payload = {
        "title": "Invalid Questions Exam",
        "subject": "Cybersecurity",
        "duration_minutes": 45,
        "total_marks": 5.0,
        "status": "PUBLISHED",
        "questions": [
            {"question_id": 999999, "marks": 5.0, "order": 1}
        ]
    }

    res = client.post("/api/exams", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert "were not found in the Question Bank" in res.json()["detail"]


def test_get_random_questions_endpoint(test_env):
    """Test random question pool query with broad fallback."""
    token = test_env["token"]

    # 1. Random query across all subjects
    res = client.post(
        "/api/exams/random-questions",
        json={"question_count": 2},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200, res.text
    questions = res.json()
    assert len(questions) >= 1
    assert "id" in questions[0]
    assert "question_text" in questions[0]

    # 2. Random query with subject filter that falls back gracefully
    res2 = client.post(
        "/api/exams/random-questions",
        json={"question_count": 5, "subject": "NonExistentSubject123"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200, res2.text
    questions2 = res2.json()
    assert len(questions2) >= 1


def test_toggle_exam_status(test_env):
    """Test toggling an exam from DRAFT to PUBLISHED and back."""
    token = test_env["token"]
    q1_id = test_env["q1"].id

    # Create draft with 1 question
    payload = {
        "title": "Toggle Status Exam",
        "subject": "Computer Networks",
        "duration_minutes": 30,
        "status": "DRAFT",
        "questions": [{"question_id": q1_id, "marks": 2.0, "order": 1}]
    }
    create_res = client.post("/api/exams", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    exam_id = create_res.json()["id"]
    assert create_res.json()["status"] == "DRAFT"

    # Toggle to PUBLISHED
    toggle_res = client.post(f"/api/exams/{exam_id}/toggle-status", headers={"Authorization": f"Bearer {token}"})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "PUBLISHED"

    # Toggle back to DRAFT
    toggle_res2 = client.post(f"/api/exams/{exam_id}/toggle-status", headers={"Authorization": f"Bearer {token}"})
    assert toggle_res2.status_code == 200
    assert toggle_res2.json()["status"] == "DRAFT"
