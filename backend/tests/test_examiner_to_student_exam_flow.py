import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import Base, engine, get_db
from app.models.user import User
from app.models.question import Question, Option
from app.models.exam import Exam, ExamQuestion
from app.models.session import ExamSession
from app.models.answer import Answer
from app.models.result import Result
from app.enums.enums import UserRole, ApprovalStatus, QuestionType, DifficultyLevel, ExamStatus, SessionStatus
from auth import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture
def setup_flow_data():
    """Setup examiner, student, and questions for end-to-end flow test."""
    Base.metadata.create_all(bind=engine)
    db = next(get_db())

    # Create approved examiner
    examiner = db.query(User).filter(User.email == "flow.examiner@examai.edu").first()
    if not examiner:
        examiner = User(
            name="Prof. Flow Examiner",
            email="flow.examiner@examai.edu",
            password_hash=hash_password("Password@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(examiner)
        db.commit()
        db.refresh(examiner)

    # Create approved student
    student = db.query(User).filter(User.email == "flow.student@examai.edu").first()
    if not student:
        student = User(
            name="Flow Test Student",
            email="flow.student@examai.edu",
            register_number="REG2026FLOW01",
            department="Computer Science & Engineering",
            year="3rd Year",
            password_hash=hash_password("Password@123"),
            role=UserRole.STUDENT,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    # Create a question for the examiner
    q1 = Question(
        subject="Computer Science & Engineering",
        question_text="What is the time complexity of binary search on a sorted array?",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        expected_answer="O(log N)",
        model_answer="Binary search halves the search space each step: O(log N).",
        max_marks=2.0,
        negative_marks=0.5,
        created_by=examiner.id
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    db.add_all([
        Option(question_id=q1.id, option_text="O(1)", is_correct=False),
        Option(question_id=q1.id, option_text="O(log N)", is_correct=True),
        Option(question_id=q1.id, option_text="O(N)", is_correct=False),
        Option(question_id=q1.id, option_text="O(N log N)", is_correct=False),
    ])
    db.commit()

    examiner_token = create_access_token(data={"sub": str(examiner.id), "role": examiner.role.value, "approval_status": examiner.approval_status.value})
    student_token = create_access_token(data={"sub": str(student.id), "role": student.role.value, "approval_status": student.approval_status.value})

    yield {
        "db": db,
        "examiner": examiner,
        "student": student,
        "question": q1,
        "examiner_token": examiner_token,
        "student_token": student_token
    }


def test_examiner_creates_exam_and_student_sees_available(setup_flow_data):
    """
    Test that when an examiner creates and publishes an exam:
    1. The exam is stored with all questions and proctoring configs.
    2. The student dashboard immediately shows the exam under 'upcoming_exams' with status 'Available'.
    3. The student can commence the exam session and receive the sanitized questions.
    """
    data = setup_flow_data
    examiner_headers = {"Authorization": f"Bearer {data['examiner_token']}"}
    student_headers = {"Authorization": f"Bearer {data['student_token']}"}

    # 1. Examiner creates and publishes a new exam
    exam_payload = {
        "title": "Algorithms Mastery Assessment 2026",
        "subject": "Computer Science & Engineering",
        "description": "Comprehensive algorithms benchmark assessment.",
        "duration_minutes": 45,
        "total_marks": 20.0,
        "passing_marks": 8.0,
        "status": "PUBLISHED",
        "proctoring_enabled": True,
        "webcam_monitoring_enabled": True,
        "gaze_tracking_enabled": True,
        "max_tab_switch_warnings": 3,
        "questions": [
            {
                "question_id": data["question"].id,
                "marks": 2.0,
                "order": 1
            }
        ]
    }

    create_res = client.post("/api/exams", json=exam_payload, headers=examiner_headers)
    assert create_res.status_code == 201, create_res.text
    created_exam = create_res.json()
    assert created_exam["title"] == "Algorithms Mastery Assessment 2026"
    assert created_exam["status"] == "PUBLISHED"
    assert created_exam["creator_name"] == "Prof. Flow Examiner"
    assert created_exam["proctoring_enabled"] is True
    exam_id = created_exam["id"]

    # 2. Student calls get_student_dashboard
    student_dash_res = client.get("/api/student/dashboard", headers=student_headers)
    assert student_dash_res.status_code == 200, student_dash_res.text
    dash_data = student_dash_res.json()

    upcoming = dash_data["upcoming_exams"]
    matching_exam = next((ex for ex in upcoming if ex["id"] == exam_id), None)
    assert matching_exam is not None, f"Created exam #{exam_id} was not found in student's upcoming exams!"
    assert matching_exam["title"] == "Algorithms Mastery Assessment 2026"
    assert matching_exam["status"] == "Available"
    assert matching_exam["creator_name"] == "Prof. Flow Examiner"
    assert matching_exam["total_questions"] == 1
    assert matching_exam["duration_minutes"] == 45
    assert matching_exam["proctoring_enabled"] is True

    # 3. Student commences exam session
    start_res = client.post(f"/api/exams/{exam_id}/start", headers=student_headers)
    assert start_res.status_code == 200, start_res.text
    start_data = start_res.json()
    assert "session_token" in start_data
    session_token = start_data["session_token"]
    assert len(start_data["questions"]) == 1
    assert start_data["questions"][0]["question_id"] == data["question"].id

    # 4. Student dashboard now shows exam as "In Progress"
    dash_in_prog = client.get("/api/student/dashboard", headers=student_headers).json()
    in_prog_exam = next((ex for ex in dash_in_prog["upcoming_exams"] if ex["id"] == exam_id), None)
    assert in_prog_exam["status"] == "In Progress"

    # 5. Examiner toggles status to DRAFT
    toggle_res = client.post(f"/api/exams/{exam_id}/toggle-status", headers=examiner_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "DRAFT"

    # 6. Examiner toggles status back to PUBLISHED
    toggle_res2 = client.post(f"/api/exams/{exam_id}/toggle-status", headers=examiner_headers)
    assert toggle_res2.status_code == 200
    assert toggle_res2.json()["status"] == "PUBLISHED"
