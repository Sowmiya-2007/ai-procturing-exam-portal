from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.exam import Exam, ExamQuestion
from app.models.session import ExamSession
from app.models.result import Result
from app.enums.enums import UserRole, ApprovalStatus, ExamStatus, SessionStatus
from schemas import UserResponse, ExamResultDetailResponse
from auth import get_current_user, require_approved_student
from routers.exam_session_router import calculate_integrity_score

router = APIRouter(prefix="/api/student", tags=["Student Portal"], dependencies=[Depends(require_approved_student)])

@router.get("/dashboard")
def get_student_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_bank_questions = db.query(Question).count()
    
    # Query database exams including creator details
    db_exams = db.query(Exam).options(
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question),
        joinedload(Exam.creator)
    ).order_by(Exam.created_at.desc()).all()

    # Get student's sessions
    student_sessions = db.query(ExamSession).filter(ExamSession.student_id == current_user.id).all()
    sessions_by_exam = {s.exam_id: s for s in student_sessions}

    # Get student's results
    student_results = db.query(Result).options(joinedload(Result.approver)).filter(Result.student_id == current_user.id).all()
    results_by_exam = {r.exam_id: r for r in student_results}

    upcoming_exams = []

    for ex in db_exams:
        sess = sessions_by_exam.get(ex.id)
        res = results_by_exam.get(ex.id)
        
        # If exam is draft and candidate has no active session, skip from available list
        if ex.status == ExamStatus.DRAFT and not sess:
            continue

        status_label = "Available"
        session_token = None
        is_approved = res.is_approved if res else False

        if sess:
            session_token = sess.session_token
            if sess.status == SessionStatus.SUBMITTED:
                status_label = "Completed" if is_approved else "Under Review"
            elif sess.status == SessionStatus.IN_PROGRESS:
                status_label = "In Progress"

        total_m = sum((eq.marks or (eq.question.max_marks if eq.question else 1.0)) for eq in ex.exam_questions) if ex.exam_questions else (getattr(ex, "total_marks", None) or 100.0)
        q_count = len(ex.exam_questions) if ex.exam_questions else (getattr(ex, "total_questions", 0) or 0)
        passing_m = getattr(ex, "passing_marks", None) or round(total_m * 0.4, 2)

        upcoming_exams.append({
            "id": ex.id,
            "code": f"EXAM-2026-CS{ex.id:02d}",
            "title": ex.title,
            "subject": ex.subject,
            "description": ex.description or "Comprehensive proctored assessment.",
            "duration_minutes": ex.duration_minutes,
            "total_marks": total_m,
            "passing_marks": passing_m,
            "total_questions": q_count,
            "status": status_label,
            "exam_status": ex.status.value if hasattr(ex.status, "value") else str(ex.status),
            "creator_name": ex.creator.name if ex.creator else "Faculty Examiner",
            "session_status": sess.status if sess else None,
            "session_token": session_token,
            "is_approved": is_approved,
            "obtained_marks": res.obtained_marks if res else None,
            "percentage": res.percentage if res else None,
            "passed": (res.percentage >= (passing_m or 40.0)) if res else None,
            "proctoring_enabled": ex.proctoring_enabled,
            "webcam_monitoring": ex.webcam_monitoring_enabled,
            "gaze_tracking": ex.gaze_tracking_enabled,
            "created_at": ex.created_at.isoformat() if ex.created_at else None
        })

    # Fallback default exams if none in database yet
    if not upcoming_exams:
        upcoming_exams = [
            {
                "id": 1,
                "code": "EXAM-2026-AI01",
                "title": "Artificial Intelligence & Machine Learning - Midterm Examination",
                "subject": "Artificial Intelligence",
                "description": "Standard departmental assessment covering Neural Networks and Optimization.",
                "duration_minutes": 60,
                "total_marks": 100,
                "passing_marks": 40.0,
                "total_questions": 5,
                "status": "Available",
                "exam_status": "PUBLISHED",
                "creator_name": "Department of AI & CSE",
                "session_status": None,
                "session_token": None,
                "is_approved": False,
                "proctoring_enabled": True,
                "webcam_monitoring": True,
                "gaze_tracking": True
            }
        ]

    # Student's past assessment results summary
    completed_results = []
    for res in student_results:
        exam = db.query(Exam).filter(Exam.id == res.exam_id).first()
        sess = db.query(ExamSession).filter(
            ExamSession.exam_id == res.exam_id,
            ExamSession.student_id == current_user.id
        ).first()

        integrity_score = 100.0
        if sess and sess.proctor_events:
            integrity_score, _, _ = calculate_integrity_score(sess.proctor_events)

        is_app = res.is_approved

        completed_results.append({
            "result_id": res.id,
            "exam_id": res.exam_id,
            "exam_title": exam.title if exam else f"Exam #{res.exam_id}",
            "exam_subject": exam.subject if exam else "General",
            "total_marks": res.total_marks,
            "obtained_marks": res.obtained_marks,
            "percentage": res.percentage,
            "passed": (res.percentage >= 40.0),
            "is_approved": is_app,
            "approved_at": res.approved_at.isoformat() if (is_app and res.approved_at) else None,
            "approval_notes": res.approval_notes,
            "submitted_at": sess.submitted_at.isoformat() if (sess and sess.submitted_at) else res.updated_at.isoformat(),
            "session_token": sess.session_token if sess else None,
            "integrity_score": integrity_score
        })

    announcements = [
        {
            "id": 1,
            "title": "AI Proctoring System Verification Active",
            "content": "Webcam, audio level analysis, and full-screen lockdown are enabled for all official exams.",
            "date": "2026-09-01",
            "tag": "Important"
        },
        {
            "id": 2,
            "title": "Faculty Audit & Scorecard Release Policy",
            "content": "Submitted exam scorecards and detailed solutions are published directly to your portal upon faculty examiner verification.",
            "date": "2026-09-02",
            "tag": "Examinations"
        }
    ]

    return {
        "student": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "register_number": getattr(current_user, "register_number", None) or f"REG{current_user.id:04d}",
            "department": getattr(current_user, "department", None) or "Computer Science",
            "year": getattr(current_user, "year", None) or "3rd Year",
            "approval_status": current_user.approval_status,
            "created_at": current_user.created_at
        },
        "available_questions": total_bank_questions,
        "upcoming_exams": upcoming_exams,
        "completed_results": completed_results,
        "announcements": announcements
    }


@router.get("/results")
def get_student_results(
    current_user: User = Depends(require_approved_student),
    db: Session = Depends(get_db)
):
    """
    Get all past examination scorecards and proctoring summaries for current student.
    """
    student_results = db.query(Result).options(
        joinedload(Result.exam)
    ).filter(Result.student_id == current_user.id).order_by(Result.created_at.desc()).all()

    output = []
    for res in student_results:
        sess = db.query(ExamSession).options(
            joinedload(ExamSession.proctor_events)
        ).filter(
            ExamSession.exam_id == res.exam_id,
            ExamSession.student_id == current_user.id
        ).first()

        integrity_score = 100.0
        viol_count = 0
        if sess and sess.proctor_events:
            integrity_score, viol_count, _ = calculate_integrity_score(sess.proctor_events)

        is_app = res.is_approved

        output.append({
            "result_id": res.id,
            "exam_id": res.exam_id,
            "exam_title": res.exam.title if res.exam else f"Exam #{res.exam_id}",
            "exam_subject": res.exam.subject if res.exam else "General",
            "duration_minutes": res.exam.duration_minutes if res.exam else 60,
            "total_marks": res.total_marks,
            "obtained_marks": res.obtained_marks,
            "percentage": res.percentage,
            "passed": (res.percentage >= 40.0),
            "is_approved": is_app,
            "approved_at": res.approved_at,
            "approval_notes": res.approval_notes,
            "submitted_at": sess.submitted_at if sess else res.updated_at,
            "session_token": sess.session_token if sess else None,
            "integrity_score": integrity_score,
            "violations_count": viol_count
        })

    return output
