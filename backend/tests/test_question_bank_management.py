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
from app.models.question import Question, Option
from app.enums.enums import UserRole, ApprovalStatus, QuestionType, DifficultyLevel
from auth import create_access_token, hash_password
from main import app

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


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


def test_examiner_can_delete_any_question(setup_db, client):
    """Verify that any approved examiner can delete any question in the question bank."""
    db = setup_db
    # Create Examiner 1 (creator)
    examiner1 = User(
        name="Examiner Alpha",
        email="examiner_alpha@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    # Create Examiner 2 (deleter)
    examiner2 = User(
        name="Examiner Beta",
        email="examiner_beta@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add_all([examiner1, examiner2])
    db.commit()

    # Question created by Examiner 1
    q = Question(
        subject="Computer Science",
        topic="Algorithms",
        question_text="What is the runtime of QuickSort in average case?",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.MEDIUM,
        max_marks=2.0,
        created_by=examiner1.id
    )
    db.add(q)
    db.commit()

    opt1 = Option(question_id=q.id, option_text="O(N log N)", is_correct=True)
    opt2 = Option(question_id=q.id, option_text="O(N^2)", is_correct=False)
    db.add_all([opt1, opt2])
    db.commit()

    # Examiner 2 logs in and deletes Examiner 1's question
    token = create_access_token(data={"sub": str(examiner2.id), "role": examiner2.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/questions/{q.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify deleted from DB and options cascaded
    deleted_q = db.query(Question).filter(Question.id == q.id).first()
    assert deleted_q is None

    opts = db.query(Option).filter(Option.question_id == q.id).all()
    assert len(opts) == 0


def test_examiner_can_delete_system_or_unassigned_question(setup_db, client):
    """Verify that an approved examiner can delete questions with created_by=None (e.g. seeded)."""
    db = setup_db
    examiner = User(
        name="Examiner Gamma",
        email="examiner_gamma@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(examiner)
    db.commit()

    # Seeded question with no creator
    q = Question(
        subject="Mathematics",
        question_text="Evaluate the integral of e^x dx.",
        question_type=QuestionType.SHORT_ANSWER,
        difficulty=DifficultyLevel.EASY,
        max_marks=1.0,
        created_by=None
    )
    db.add(q)
    db.commit()

    token = create_access_token(data={"sub": str(examiner.id), "role": examiner.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/questions/{q.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

    deleted_q = db.query(Question).filter(Question.id == q.id).first()
    assert deleted_q is None


def test_student_cannot_delete_question(setup_db, client):
    """Verify students cannot delete questions."""
    db = setup_db
    student = User(
        name="Student User",
        email="student_del@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.STUDENT,
        approval_status=ApprovalStatus.APPROVED
    )
    q = Question(
        subject="Physics",
        question_text="What is Newton's second law?",
        question_type=QuestionType.SHORT_ANSWER,
        difficulty=DifficultyLevel.EASY,
        max_marks=1.0
    )
    db.add_all([student, q])
    db.commit()

    token = create_access_token(data={"sub": str(student.id), "role": student.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/questions/{q.id}", headers=headers)
    assert response.status_code == 403
