import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone

from app.core.database import Base, get_db
from app.models.user import User
from app.models.question import Question, Option
from app.models.exam import Exam, ExamQuestion
from app.models.session import ExamSession
from app.models.answer import Answer
from app.models.result import Result
from app.models.proctor_event import ProctorEvent
from app.enums.enums import (
    UserRole, ApprovalStatus, QuestionType, DifficultyLevel, ExamStatus,
    SessionStatus, ProctorEventType
)
from auth import hash_password, create_access_token
from main import app

# Setup in-memory SQLite database with StaticPool
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
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # 1. Admin
    admin = User(
        name="Admin Test",
        email="admin@sessiontest.edu",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(admin)

    # 2. Approved Examiner
    examiner = User(
        name="Prof. Harrison",
        email="prof.harrison@sessiontest.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(examiner)

    # 3. Approved Student
    student = User(
        name="Lucas Vance",
        email="lucas.vance@sessiontest.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.STUDENT,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(student)
    db.commit()
    db.refresh(admin)
    db.refresh(examiner)
    db.refresh(student)

    # 4. Create 5 Questions (one of each type)
    # Q1: MCQ (2 Marks)
    q1 = Question(
        question_text="What is the time complexity of searching in a balanced Binary Search Tree (BST)?",
        question_type=QuestionType.MCQ,
        subject="Data Structures",
        difficulty=DifficultyLevel.EASY,
        max_marks=2.0,
        negative_marks=0.5,
        model_answer="O(log n) because the tree height is logarithmic with n elements.",
        created_by=examiner.id
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    opt1 = Option(question_id=q1.id, option_text="O(1)", is_correct=False)
    opt2 = Option(question_id=q1.id, option_text="O(log n)", is_correct=True)
    opt3 = Option(question_id=q1.id, option_text="O(n)", is_correct=False)
    opt4 = Option(question_id=q1.id, option_text="O(n log n)", is_correct=False)
    db.add_all([opt1, opt2, opt3, opt4])

    # Q2: Multi-Select (4 Marks)
    q2 = Question(
        question_text="Which of the following are non-linear data structures?",
        question_type=QuestionType.MULTI_SELECT,
        subject="Data Structures",
        difficulty=DifficultyLevel.MEDIUM,
        max_marks=4.0,
        negative_marks=0.0,
        model_answer="Trees and Graphs are non-linear data structures.",
        created_by=examiner.id
    )
    db.add(q2)
    db.commit()
    db.refresh(q2)

    opt2_1 = Option(question_id=q2.id, option_text="Tree", is_correct=True)
    opt2_2 = Option(question_id=q2.id, option_text="Graph", is_correct=True)
    opt2_3 = Option(question_id=q2.id, option_text="Array", is_correct=False)
    opt2_4 = Option(question_id=q2.id, option_text="Linked List", is_correct=False)
    db.add_all([opt2_1, opt2_2, opt2_3, opt2_4])

    # Q3: Short Answer (4 Marks)
    q3 = Question(
        question_text="Define the primary difference between a process and a thread.",
        question_type=QuestionType.SHORT_ANSWER,
        subject="Operating Systems",
        difficulty=DifficultyLevel.MEDIUM,
        max_marks=4.0,
        model_answer="A process is an executing program with its own dedicated memory space, whereas a thread is a lightweight unit of execution within a process that shares memory with peer threads.",
        created_by=examiner.id
    )
    db.add(q3)

    # Q4: Long Answer (10 Marks)
    q4 = Question(
        question_text="Explain Dijkstra's shortest path algorithm. Detail the greedy strategy, priority queue optimization, and time complexity.",
        question_type=QuestionType.LONG_ANSWER,
        subject="Algorithms",
        difficulty=DifficultyLevel.HARD,
        max_marks=10.0,
        model_answer="Dijkstra's algorithm finds single-source shortest paths in weighted graphs with non-negative edges using a greedy strategy and min-priority queue with O((V+E) log V) complexity.",
        created_by=examiner.id
    )
    db.add(q4)

    # Q5: Image Upload (10 Marks)
    q5 = Question(
        question_text="Draw a complete Red-Black Tree diagram illustrating the left rotation operation. Upload photo of handwritten diagram.",
        question_type=QuestionType.IMAGE_UPLOAD,
        subject="Data Structures",
        difficulty=DifficultyLevel.HARD,
        max_marks=10.0,
        model_answer="Diagram showing root, pivot node, left/right subtrees before and after left rotation while maintaining BST and coloring invariants.",
        created_by=examiner.id
    )
    db.add(q5)
    db.commit()
    db.refresh(q3)
    db.refresh(q4)
    db.refresh(q5)

    # 5. Create Exam linking all 5 questions
    exam = Exam(
        title="Comprehensive Computer Science Midterm 2026",
        subject="Computer Science & Engineering",
        description="Official proctored examination covering data structures, OS, and algorithms.",
        duration_minutes=90,
        total_questions=5,
        proctoring_enabled=True,
        webcam_monitoring_enabled=True,
        gaze_tracking_enabled=True,
        status=ExamStatus.PUBLISHED,
        created_by=examiner.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    eqs = [
        ExamQuestion(exam_id=exam.id, question_id=q1.id, marks=2.0, question_order=1),
        ExamQuestion(exam_id=exam.id, question_id=q2.id, marks=4.0, question_order=2),
        ExamQuestion(exam_id=exam.id, question_id=q3.id, marks=4.0, question_order=3),
        ExamQuestion(exam_id=exam.id, question_id=q4.id, marks=10.0, question_order=4),
        ExamQuestion(exam_id=exam.id, question_id=q5.id, marks=10.0, question_order=5),
    ]
    db.add_all(eqs)
    db.commit()

    yield

    Base.metadata.drop_all(bind=test_engine)


def get_token(email: str, role: UserRole):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    assert user is not None, f"User {email} not found"
    return create_access_token({"sub": str(user.id), "role": role.value})


def test_start_exam_session_sanitized():
    """Verify starting an exam session returns sanitized questions (no answer leak in network response)."""
    token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/exams/1/start", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["exam_title"] == "Comprehensive Computer Science Midterm 2026"
    assert data["session_token"].startswith("sess_")
    assert data["questions_count"] == 5
    assert data["status"] == "IN_PROGRESS"

    # Check question sanitization
    for q in data["questions"]:
        assert "model_answer" not in q or q.get("model_answer") is None
        assert "expected_answer" not in q or q.get("expected_answer") is None
        assert "evaluation_guidelines" not in q or q.get("evaluation_guidelines") is None
        for opt in q["options"]:
            assert "is_correct" not in opt, f"Security vulnerability: is_correct leaked in option {opt}!"


def test_resume_active_session():
    """Verify resuming an active session with token works."""
    token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    headers = {"Authorization": f"Bearer {token}"}

    start_res = client.post("/api/exams/1/start", headers=headers)
    session_token = start_res.json()["session_token"]

    resume_res = client.get(f"/api/exams/sessions/{session_token}/active", headers=headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["session_token"] == session_token


def test_autosave_answers():
    """Verify autosaving student answers across all question types."""
    token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    headers = {"Authorization": f"Bearer {token}"}

    start_res = client.post("/api/exams/1/start", headers=headers)
    session_token = start_res.json()["session_token"]
    questions = start_res.json()["questions"]

    # 1. Answer Q1 (MCQ) - Pick correct option (O(log n))
    q1 = next(q for q in questions if q["question_type"] == "MCQ")
    opt_correct = next(opt for opt in q1["options"] if "log" in opt["option_text"])
    
    save_mcq = client.post(
        f"/api/exams/sessions/{session_token}/answers",
        json={"question_id": q1["question_id"], "selected_option_ids": [opt_correct["id"]]},
        headers=headers
    )
    assert save_mcq.status_code == 200
    assert save_mcq.json()["success"] is True

    # 2. Answer Q2 (Multi-Select) - Pick Tree and Graph
    q2 = next(q for q in questions if q["question_type"] == "MULTI_SELECT")
    correct_opts = [opt["id"] for opt in q2["options"] if opt["option_text"] in ["Tree", "Graph"]]
    save_multi = client.post(
        f"/api/exams/sessions/{session_token}/answers",
        json={"question_id": q2["question_id"], "selected_option_ids": correct_opts},
        headers=headers
    )
    assert save_multi.status_code == 200

    # 3. Answer Q3 (Short Answer)
    q3 = next(q for q in questions if q["question_type"] == "SHORT_ANSWER")
    save_short = client.post(
        f"/api/exams/sessions/{session_token}/answers",
        json={
            "question_id": q3["question_id"],
            "text_answer": "A process has its own isolated memory address space, while a thread is a lightweight execution unit inside a process sharing memory."
        },
        headers=headers
    )
    assert save_short.status_code == 200

    # 4. Answer Q4 (Long Answer)
    q4 = next(q for q in questions if q["question_type"] == "LONG_ANSWER")
    save_long = client.post(
        f"/api/exams/sessions/{session_token}/answers",
        json={
            "question_id": q4["question_id"],
            "text_answer": "Dijkstra's shortest path algorithm operates using a greedy choice property. It initializes distances to infinity, uses a min-priority queue to greedily extract the vertex with minimum tentative distance, relaxes adjacent edges, and achieves an efficient time complexity of O((V+E) log V) with a binary heap."
        },
        headers=headers
    )
    assert save_long.status_code == 200

    # 5. Answer Q5 (Image Upload)
    q5 = next(q for q in questions if q["question_type"] == "IMAGE_UPLOAD")
    save_img = client.post(
        f"/api/exams/sessions/{session_token}/answers",
        json={
            "question_id": q5["question_id"],
            "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        headers=headers
    )
    assert save_img.status_code == 200


def test_log_proctor_events_and_integrity_score():
    """Verify recording proctoring events during the active exam session."""
    token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    headers = {"Authorization": f"Bearer {token}"}

    start_res = client.post("/api/exams/1/start", headers=headers)
    session_token = start_res.json()["session_token"]

    # Log Tab Switch event
    ev1 = client.post(
        f"/api/exams/sessions/{session_token}/proctor-event",
        json={"event_type": "TAB_SWITCH", "details": "Switched to background tab for 2 seconds"},
        headers=headers
    )
    assert ev1.status_code == 200
    assert ev1.json()["event_type"] == "TAB_SWITCH"

    # Log Gaze Away event
    ev2 = client.post(
        f"/api/exams/sessions/{session_token}/proctor-event",
        json={"event_type": "GAZE_AWAY", "details": "Gaze diverged rightward"},
        headers=headers
    )
    assert ev2.status_code == 200


def test_submit_exam_and_automated_grading():
    """Verify exam submission triggers automated AI grading across all 5 question types."""
    token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    headers = {"Authorization": f"Bearer {token}"}

    start_res = client.post("/api/exams/1/start", headers=headers)
    session_token = start_res.json()["session_token"]

    # Submit
    submit_res = client.post(
        f"/api/exams/sessions/{session_token}/submit",
        json={"final_confirmation": True},
        headers=headers
    )
    assert submit_res.status_code == 200, submit_res.text
    result_data = submit_res.json()

    assert result_data["status"] == "SUBMITTED"
    assert result_data["total_marks"] == 30.0
    assert result_data["obtained_marks"] > 20.0 # High score based on our correct answers
    assert result_data["percentage"] > 70.0
    assert result_data["passed"] is True
    assert result_data["answered_count"] == 5
    # On student submit: question_breakdown is masked (empty) until faculty approval
    assert len(result_data["question_breakdown"]) == 0

    # Verify AI Proctoring summary
    assert result_data["proctoring_summary"]["total_events"] >= 2
    assert result_data["proctoring_summary"]["integrity_score"] < 100.0 # Deductions from TAB_SWITCH and GAZE_AWAY
    assert result_data["proctoring_summary"]["integrity_score"] >= 80.0


def test_cannot_edit_or_restart_after_submission():
    """Verify submitting locks the session against edits and prevents restarting."""
    token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    headers = {"Authorization": f"Bearer {token}"}

    start_res = client.post("/api/exams/1/start", headers=headers)
    assert start_res.status_code == 400
    assert "already completed and submitted" in start_res.json()["detail"]


def test_examiner_can_view_submissions_and_override_grade():
    """Verify examiners can view submissions and override subjective marks."""
    examiner_token = get_token("prof.harrison@sessiontest.edu", UserRole.EXAMINER)
    headers = {"Authorization": f"Bearer {examiner_token}"}

    # 1. View exam submissions
    sub_res = client.get("/api/exams/1/submissions", headers=headers)
    assert sub_res.status_code == 200
    subs = sub_res.json()
    assert len(subs) == 1
    assert subs[0]["student_name"] == "Lucas Vance"
    assert subs[0]["percentage"] > 70.0

    # 2. Examiner overrides grade for Answer #3 (Short Answer)
    db = TestingSessionLocal()
    ans = db.query(Answer).filter(Answer.text_answer.isnot(None)).first()
    assert ans is not None
    ans_id = ans.id
    db.close()

    override_res = client.put(
        f"/api/exams/answers/{ans_id}/grade",
        json={"marks_awarded": 4.0, "feedback": "Manual full credit confirmed by faculty Harrison."},
        headers=headers
    )
    assert override_res.status_code == 200
    assert override_res.json()["success"] is True
    assert override_res.json()["marks_awarded"] == 4.0


def test_student_results_endpoint_and_examiner_approval():
    """Verify student results are masked until examiner approves."""
    student_token = get_token("lucas.vance@sessiontest.edu", UserRole.STUDENT)
    student_headers = {"Authorization": f"Bearer {student_token}"}
    examiner_token = get_token("prof.harrison@sessiontest.edu", UserRole.EXAMINER)
    examiner_headers = {"Authorization": f"Bearer {examiner_token}"}

    # 1. Before examiner approval: result is unapproved but preliminary marks are visible; deep breakdown is masked
    results_res = client.get("/api/student/results", headers=student_headers)
    assert results_res.status_code == 200
    results = results_res.json()
    assert len(results) == 1
    assert results[0]["exam_title"] == "Comprehensive Computer Science Midterm 2026"
    assert results[0]["is_approved"] is False
    assert results[0]["passed"] is True
    assert results[0]["obtained_marks"] is not None
    assert results[0]["obtained_marks"] > 20.0
    assert results[0]["session_token"] is not None
    session_token = results[0]["session_token"]

    # Student session result endpoint returns preliminary marks, with empty question breakdown
    sess_res = client.get(f"/api/exams/sessions/{session_token}/result", headers=student_headers)
    assert sess_res.status_code == 200
    sess_data = sess_res.json()
    assert sess_data["is_approved"] is False
    assert sess_data["obtained_marks"] > 20.0
    assert len(sess_data["question_breakdown"]) == 0

    # 2. Examiner approves the candidate's result
    approve_res = client.put(
        f"/api/exams/sessions/{session_token}/approve-result",
        json={"notes": "All solutions and proctoring telemetry audited and approved."},
        headers=examiner_headers
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["is_approved"] is True

    # 3. After approval: student gets full scorecard and full 5-question breakdown
    results_after = client.get("/api/student/results", headers=student_headers)
    assert results_after.status_code == 200
    res_after = results_after.json()[0]
    assert res_after["is_approved"] is True
    assert res_after["passed"] is True
    assert res_after["obtained_marks"] is not None

    sess_after = client.get(f"/api/exams/sessions/{session_token}/result", headers=student_headers)
    assert sess_after.status_code == 200
    assert sess_after.json()["is_approved"] is True
    assert len(sess_after.json()["question_breakdown"]) == 5

