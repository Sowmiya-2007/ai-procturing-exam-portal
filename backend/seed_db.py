import os
import sys
from datetime import datetime, timezone, timedelta
import bcrypt

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models import (
    User, Question, Option, Exam, ExamQuestion, 
    ExamSession, Answer, Result, ProctorEvent
)
from app.enums.enums import (
    UserRole, ApprovalStatus, QuestionType, 
    DifficultyLevel, ExamStatus, SessionStatus, ProctorEventType
)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def seed_database():
    """
    Seeds initial development data for the AI-Based Examination Platform.
    Includes Admin, Approved/Pending/Rejected Examiners, Students, Questions, Exams, Sessions, and Telemetry.
    """
    # Create tables if not existing
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Checking existing records...")
        existing_admin = db.query(User).filter(User.email == "admin@examai.edu").first()
        if existing_admin:
            print("Database already contains seed data.")
            return

        print("Seeding users, examiners, and candidates...")
        # 1. Admin User
        admin = User(
            name="Institutional Admin",
            email="admin@examai.edu",
            password_hash=hash_password("Admin@123"),
            role=UserRole.ADMIN,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(admin)
        db.flush()

        # 2. Approved Examiner
        approved_examiner = User(
            name="Prof. Alan Turing",
            email="examiner@examai.edu",
            password_hash=hash_password("Examiner@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.APPROVED,
            approved_by=admin.id,
            approved_at=datetime.now(timezone.utc),
            is_active=True
        )
        db.add(approved_examiner)

        # 3. Pending Examiner (Awaiting Admin Approval)
        pending_examiner = User(
            name="Dr. Ada Lovelace",
            email="pending.examiner@examai.edu",
            password_hash=hash_password("Examiner@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.PENDING,
            is_active=True
        )
        db.add(pending_examiner)

        # 4. Rejected Examiner
        rejected_examiner = User(
            name="Dr. John Doe",
            email="rejected.examiner@examai.edu",
            password_hash=hash_password("Examiner@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.REJECTED,
            approved_by=admin.id,
            approved_at=datetime.now(timezone.utc),
            rejection_reason="Incomplete faculty accreditation and department verification.",
            is_active=True
        )
        db.add(rejected_examiner)

        # 5. Student
        student = User(
            name="Elena Rostova",
            email="student@examai.edu",
            password_hash=hash_password("Student@123"),
            role=UserRole.STUDENT,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(student)
        db.flush()

        print("Seeding question bank items across all 5 question types...")
        # Question 1: MCQ
        q1 = Question(
            subject="Computer Networks",
            question_text="Which OSI layer is responsible for end-to-end reliable communication, error recovery, and flow control?",
            question_type=QuestionType.MCQ,
            difficulty=DifficultyLevel.MEDIUM,
            expected_answer="Transport Layer",
            model_answer="Transport layer (Layer 4) provides transparent transfer of data between end users.",
            max_marks=2.0,
            negative_marks=0.5,
            created_by=approved_examiner.id
        )
        db.add(q1)
        db.flush()

        db.add_all([
            Option(question_id=q1.id, option_text="Network Layer", is_correct=False),
            Option(question_id=q1.id, option_text="Data Link Layer", is_correct=False),
            Option(question_id=q1.id, option_text="Transport Layer", is_correct=True),
            Option(question_id=q1.id, option_text="Session Layer", is_correct=False),
        ])

        # Question 2: Multi-Select
        q2 = Question(
            subject="Data Structures",
            question_text="Which of the following sorting algorithms have a worst-case time complexity of O(N log N)?",
            question_type=QuestionType.MULTI_SELECT,
            difficulty=DifficultyLevel.MEDIUM,
            expected_answer="Merge Sort and Heap Sort",
            model_answer="Merge Sort and Heap Sort maintain O(N log N) worst-case time complexity.",
            max_marks=3.0,
            negative_marks=0.5,
            created_by=approved_examiner.id
        )
        db.add(q2)
        db.flush()

        db.add_all([
            Option(question_id=q2.id, option_text="Merge Sort", is_correct=True),
            Option(question_id=q2.id, option_text="Heap Sort", is_correct=True),
            Option(question_id=q2.id, option_text="Quick Sort", is_correct=False),
            Option(question_id=q2.id, option_text="Bubble Sort", is_correct=False),
        ])

        # Question 3: Short Answer
        q3 = Question(
            subject="Database Management Systems",
            question_text="State the CAP theorem in distributed database systems and define each property.",
            question_type=QuestionType.SHORT_ANSWER,
            difficulty=DifficultyLevel.EASY,
            expected_answer="Consistency, Availability, Partition Tolerance",
            model_answer="The CAP theorem states that a distributed system cannot simultaneously provide more than two out of Consistency, Availability, and Partition Tolerance.",
            max_marks=5.0,
            negative_marks=0.0,
            created_by=approved_examiner.id
        )
        db.add(q3)

        # Question 4: Long Answer
        q4 = Question(
            subject="Artificial Intelligence",
            question_text="Explain the Backpropagation algorithm in Deep Neural Networks. Formulate gradient descent weight updates using the multivariable chain rule.",
            question_type=QuestionType.LONG_ANSWER,
            difficulty=DifficultyLevel.HARD,
            expected_answer="Detailed mathematical derivation of forward pass, loss calculation, backward pass error deltas, and weight matrix updates.",
            model_answer="Comprehensive explanation of error propagation across multi-layer perceptrons with learning rate hyperparameter optimization.",
            max_marks=10.0,
            negative_marks=0.0,
            created_by=approved_examiner.id
        )
        db.add(q4)

        # Question 5: Image Upload
        q5 = Question(
            subject="Computer Architecture",
            question_text="Draw the complete architectural block diagram of an 8-bit Microprocessor including ALU, Accumulator, Flag Register, PC, and Stack Pointer. Upload a clear handwritten schematic.",
            question_type=QuestionType.IMAGE_UPLOAD,
            difficulty=DifficultyLevel.HARD,
            expected_answer="Schematic showing internal bus lines, ALU, register array, timing and control logic.",
            model_answer="Properly labeled diagram illustrating data bus interconnects, address bus latching, and control bus signals.",
            max_marks=15.0,
            negative_marks=0.0,
            created_by=approved_examiner.id
        )
        db.add(q5)
        db.flush()

        print("Seeding sample exam and junction associations...")
        exam = Exam(
            title="Computer Science Comprehensive Midterm 2026",
            subject="Computer Science & Engineering",
            description="Official proctored examination covering Networks, Data Structures, Databases, AI, and Microprocessors.",
            duration_minutes=90,
            total_questions=5,
            randomization_enabled=True,
            negative_marking_enabled=True,
            default_negative_marks=0.5,
            proctoring_enabled=True,
            webcam_monitoring_enabled=True,
            gaze_tracking_enabled=True,
            gaze_sensitivity_threshold=0.75,
            max_tab_switch_warnings=3,
            status=ExamStatus.PUBLISHED,
            created_by=approved_examiner.id,
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(exam)
        db.flush()

        # Link questions to exam via exam_questions
        for order, q in enumerate([q1, q2, q3, q4, q5], start=1):
            db.add(ExamQuestion(
                exam_id=exam.id,
                question_id=q.id,
                question_order=order,
                marks=q.max_marks
            ))
        db.flush()

        print("Seeding exam session, candidate answers, and proctoring telemetry...")
        session = ExamSession(
            exam_id=exam.id,
            student_id=student.id,
            session_token="SESSION-TOKEN-AI-2026-CS001",
            started_at=datetime.now(timezone.utc) - timedelta(minutes=45),
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            status=SessionStatus.SUBMITTED
        )
        db.add(session)
        db.flush()

        # Answers
        db.add(Answer(
            session_id=session.id,
            question_id=q1.id,
            selected_option_ids=[3],
            marks_awarded=2.0
        ))
        db.add(Answer(
            session_id=session.id,
            question_id=q3.id,
            text_answer="CAP theorem specifies Consistency, Availability, and Partition tolerance trade-offs.",
            marks_awarded=5.0
        ))

        # Results
        db.add(Result(
            exam_id=exam.id,
            student_id=student.id,
            total_marks=35.0,
            obtained_marks=32.0,
            percentage=91.4,
            is_approved=True,
            approved_by=examiner.id,
            approved_at=datetime.now(timezone.utc),
            approval_notes="Faculty audited and released scorecard."
        ))

        # Proctor Events
        db.add_all([
            ProctorEvent(
                session_id=session.id,
                event_type=ProctorEventType.WINDOW_FOCUS,
                event_data={"window": "ExamPortal", "fullscreen": True},
                suspicion_score=0.0
            ),
            ProctorEvent(
                session_id=session.id,
                event_type=ProctorEventType.TAB_SWITCH,
                event_data={"switched_to": "ExternalApplication", "duration_ms": 1200},
                suspicion_score=0.45
            ),
            ProctorEvent(
                session_id=session.id,
                event_type=ProctorEventType.GAZE_AWAY,
                event_data={"direction": "BOTTOM_LEFT", "duration_sec": 3.2},
                suspicion_score=0.60
            )
        ])

        db.commit()
        print("Database successfully seeded with all 9 models and test records!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
