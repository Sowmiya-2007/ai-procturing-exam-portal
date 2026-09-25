from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.user import User
from app.models.exam import Exam, ExamQuestion
from app.models.question import Question
from app.models.session import ExamSession
from app.models.result import Result
from app.enums.enums import UserRole, ApprovalStatus, ExamStatus
from schemas import (
    ExamCreate, ExamUpdate, ExamResponse, ExamQuestionLink, 
    ExamQuestionResponse, QuestionResponse, RandomQuestionsRequest,
    EnrolledStudentResponse, EnrolledStudentsSummaryResponse
)
from auth import require_approved_examiner, get_current_user
from routers.exam_session_router import calculate_integrity_score

router = APIRouter(prefix="/api/exams", tags=["Exam Management"])

def serialize_exam(exam: Exam, db: Optional[Session] = None) -> dict:
    total_m = sum((eq.marks or (eq.question.max_marks if eq.question else 1.0)) for eq in exam.exam_questions) if exam.exam_questions else (getattr(exam, "total_marks", None) or 0.0)
    
    # Candidate completion and enrollment counts
    completed_count = 0
    in_progress_count = 0
    enrolled_count = 0
    if hasattr(exam, "sessions") and exam.sessions is not None:
        for s in exam.sessions:
            s_val = s.status.value if hasattr(s.status, "value") else str(s.status)
            if s_val == "SUBMITTED":
                completed_count += 1
            elif s_val == "IN_PROGRESS":
                in_progress_count += 1
        enrolled_count = len(exam.sessions)
    elif db is not None:
        sessions = db.query(ExamSession).filter(ExamSession.exam_id == exam.id).all()
        for s in sessions:
            s_val = s.status.value if hasattr(s.status, "value") else str(s.status)
            if s_val == "SUBMITTED":
                completed_count += 1
            elif s_val == "IN_PROGRESS":
                in_progress_count += 1
        enrolled_count = len(sessions)

    return {
        "id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "description": exam.description,
        "title_en": getattr(exam, "title_en", None) or exam.title,
        "title_ta": getattr(exam, "title_ta", None),
        "title_te": getattr(exam, "title_te", None),
        "title_hi": getattr(exam, "title_hi", None),
        "title_ml": getattr(exam, "title_ml", None),
        "title_kn": getattr(exam, "title_kn", None),
        "subject_en": getattr(exam, "subject_en", None) or exam.subject,
        "subject_ta": getattr(exam, "subject_ta", None),
        "subject_te": getattr(exam, "subject_te", None),
        "subject_hi": getattr(exam, "subject_hi", None),
        "subject_ml": getattr(exam, "subject_ml", None),
        "subject_kn": getattr(exam, "subject_kn", None),
        "description_en": getattr(exam, "description_en", None) or exam.description,
        "description_ta": getattr(exam, "description_ta", None),
        "description_te": getattr(exam, "description_te", None),
        "description_hi": getattr(exam, "description_hi", None),
        "description_ml": getattr(exam, "description_ml", None),
        "description_kn": getattr(exam, "description_kn", None),
        "duration_minutes": exam.duration_minutes,
        "total_marks": total_m,
        "passing_marks": getattr(exam, "passing_marks", None) if getattr(exam, "passing_marks", None) is not None else round(total_m * 0.4, 2),
        "status": exam.status,
        "difficulty_distribution": None,
        "type_distribution": None,
        "proctoring_config": f"proctoring={exam.proctoring_enabled}, webcam={exam.webcam_monitoring_enabled}, gaze={exam.gaze_tracking_enabled}",
        "proctoring_enabled": exam.proctoring_enabled,
        "webcam_monitoring_enabled": exam.webcam_monitoring_enabled,
        "gaze_tracking_enabled": exam.gaze_tracking_enabled,
        "created_by": exam.created_by or 0,
        "creator_name": exam.creator.name if exam.creator else "Faculty Examiner",
        "created_at": exam.created_at,
        "updated_at": exam.updated_at,
        "questions_count": len(exam.exam_questions),
        "enrolled_count": enrolled_count,
        "completed_count": completed_count,
        "in_progress_count": in_progress_count,
        "exam_questions": [
            {
                "id": eq.id,
                "exam_id": eq.exam_id,
                "question_id": eq.question_id,
                "marks": eq.marks or (eq.question.max_marks if eq.question else 1.0),
                "order": eq.question_order or 1,
                "question": {
                    "id": eq.question.id,
                    "question_text": eq.question.question_text,
                    "question_type": eq.question.question_type,
                    "subject": eq.question.subject,
                    "topic": eq.question.topic,
                    "difficulty": eq.question.difficulty,
                    "marks": eq.marks or eq.question.max_marks or 1.0,
                    "negative_marks": eq.question.negative_marks or 0.0,
                    "expected_answer": eq.question.expected_answer,
                    "model_answer": eq.question.model_answer,
                    "evaluation_guidelines": eq.question.evaluation_guidelines,
                    "question_text_en": getattr(eq.question, "question_text_en", None) or eq.question.question_text,
                    "question_text_ta": getattr(eq.question, "question_text_ta", None),
                    "question_text_te": getattr(eq.question, "question_text_te", None),
                    "question_text_hi": getattr(eq.question, "question_text_hi", None),
                    "question_text_ml": getattr(eq.question, "question_text_ml", None),
                    "question_text_kn": getattr(eq.question, "question_text_kn", None),
                    "explanation_en": getattr(eq.question, "explanation_en", None),
                    "explanation_ta": getattr(eq.question, "explanation_ta", None),
                    "explanation_te": getattr(eq.question, "explanation_te", None),
                    "explanation_hi": getattr(eq.question, "explanation_hi", None),
                    "explanation_ml": getattr(eq.question, "explanation_ml", None),
                    "explanation_kn": getattr(eq.question, "explanation_kn", None),
                    "model_answer_en": getattr(eq.question, "model_answer_en", None),
                    "model_answer_ta": getattr(eq.question, "model_answer_ta", None),
                    "model_answer_te": getattr(eq.question, "model_answer_te", None),
                    "model_answer_hi": getattr(eq.question, "model_answer_hi", None),
                    "model_answer_ml": getattr(eq.question, "model_answer_ml", None),
                    "model_answer_kn": getattr(eq.question, "model_answer_kn", None),
                    "created_by": eq.question.created_by or 0,
                    "creator_name": getattr(eq.question.creator, "name", None) if getattr(eq.question, "creator", None) else "System",
                    "created_at": eq.question.created_at,
                    "options": [
                        {
                            "id": opt.id,
                            "question_id": opt.question_id,
                            "option_text": opt.option_text,
                            "option_text_en": getattr(opt, "option_text_en", None) or opt.option_text,
                            "option_text_ta": getattr(opt, "option_text_ta", None),
                            "option_text_te": getattr(opt, "option_text_te", None),
                            "option_text_hi": getattr(opt, "option_text_hi", None),
                            "option_text_ml": getattr(opt, "option_text_ml", None),
                            "option_text_kn": getattr(opt, "option_text_kn", None),
                            "is_correct": opt.is_correct
                        }
                        for opt in (eq.question.options or [])
                    ]
                } if eq.question else None
            }
            for eq in exam.exam_questions
        ]
    }

@router.get("", response_model=List[ExamResponse])
def list_exams(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PUBLISHED, CLOSED)"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    db: Session = Depends(get_db)
):
    query = db.query(Exam).options(
        joinedload(Exam.creator), 
        joinedload(Exam.sessions),
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    )

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(or_(Exam.title.ilike(search_term), Exam.description.ilike(search_term)))

    if subject and subject.upper() != "ALL":
        query = query.filter(Exam.subject == subject)

    if status and status.upper() != "ALL":
        try:
            status_enum = ExamStatus(status.upper())
            query = query.filter(Exam.status == status_enum)
        except ValueError:
            pass

    exams = query.order_by(Exam.created_at.desc()).all()
    return [serialize_exam(exam, db) for exam in exams]

@router.post("/random-questions", response_model=List[QuestionResponse])
def get_random_questions(
    payload: RandomQuestionsRequest,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    query = db.query(Question).options(joinedload(Question.options), joinedload(Question.creator))
    
    if payload.subject and payload.subject.upper() != "ALL":
        query = query.filter(Question.subject.ilike(f"%{payload.subject.strip()}%"))
        
    if payload.difficulty:
        query = query.filter(Question.difficulty == payload.difficulty)
        
    if payload.question_type:
        query = query.filter(Question.question_type == payload.question_type)
        
    questions = query.order_by(func.random()).limit(payload.question_count).all()
    
    # If no questions match specific filters and subject was provided, fallback to matching subject
    if len(questions) < payload.question_count and (payload.difficulty or payload.question_type):
        existing_ids = [q.id for q in questions]
        fallback_query = db.query(Question).options(joinedload(Question.options), joinedload(Question.creator))
        if payload.subject and payload.subject.upper() != "ALL":
            fallback_query = fallback_query.filter(Question.subject.ilike(f"%{payload.subject.strip()}%"))
        if existing_ids:
            fallback_query = fallback_query.filter(Question.id.notin_(existing_ids))
        additional = fallback_query.order_by(func.random()).limit(payload.question_count - len(questions)).all()
        questions.extend(additional)

    # Global fallback if still needed across any subject
    if len(questions) < payload.question_count:
        existing_ids = [q.id for q in questions]
        fallback_query = db.query(Question).options(joinedload(Question.options), joinedload(Question.creator))
        if existing_ids:
            fallback_query = fallback_query.filter(Question.id.notin_(existing_ids))
        additional = fallback_query.order_by(func.random()).limit(payload.question_count - len(questions)).all()
        questions.extend(additional)

    result = []
    for q in questions:
        q_dict = {
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "subject": q.subject,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "marks": q.max_marks,
            "negative_marks": q.negative_marks,
            "expected_answer": q.expected_answer,
            "model_answer": q.model_answer,
            "evaluation_guidelines": q.evaluation_guidelines,
            "created_by": q.created_by or 0,
            "creator_name": q.creator.name if q.creator else "System",
            "created_at": q.created_at,
            "options": [
                {
                    "id": opt.id,
                    "question_id": opt.question_id,
                    "option_text": opt.option_text,
                    "is_correct": opt.is_correct
                }
                for opt in (q.options or [])
            ]
        }
        result.append(q_dict)

    return result

def get_enrolled_candidates_list(
    db: Session,
    exam_id: Optional[int] = None,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    department: Optional[str] = None
) -> EnrolledStudentsSummaryResponse:
    # 1. Get Exams
    exam_query = db.query(Exam).options(
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question)
    )
    if exam_id is not None:
        exam_query = exam_query.filter(Exam.id == exam_id)
    
    exams = exam_query.order_by(Exam.created_at.desc()).all()
    if exam_id is not None and not exams:
        raise HTTPException(status_code=404, detail=f"Exam #{exam_id} not found.")
    
    exams_map = {e.id: e for e in exams}

    # 2. Get all approved students
    student_query = db.query(User).filter(
        User.role == UserRole.STUDENT,
        User.approval_status == ApprovalStatus.APPROVED
    )
    if search:
        st = f"%{search.strip()}%"
        student_query = student_query.filter(
            or_(
                User.name.ilike(st), 
                User.email.ilike(st)
            )
        )
    
    students = student_query.order_by(User.name.asc()).all()

    # 3. Get all sessions and results for these exams
    exam_ids = list(exams_map.keys())
    if not exam_ids:
        return EnrolledStudentsSummaryResponse(
            total_enrolled=0,
            completed_count=0,
            in_progress_count=0,
            not_started_count=0,
            students=[]
        )

    sessions = db.query(ExamSession).options(
        joinedload(ExamSession.proctor_events),
        joinedload(ExamSession.student)
    ).filter(ExamSession.exam_id.in_(exam_ids)).all()

    results = db.query(Result).filter(Result.exam_id.in_(exam_ids)).all()

    sessions_map = {(s.exam_id, s.student_id): s for s in sessions}
    results_map = {(r.exam_id, r.student_id): r for r in results}

    enrolled_list: List[EnrolledStudentResponse] = []
    
    for ex in exams:
        total_m = sum((eq.marks or (eq.question.max_marks if eq.question else 1.0)) for eq in ex.exam_questions) if ex.exam_questions else 100.0

        for st in students:
            sess = sessions_map.get((ex.id, st.id))
            res = results_map.get((ex.id, st.id))

            status_str = "NOT_STARTED"
            started_at = None
            submitted_at = None
            session_token = None
            session_id = None
            integrity_score = 100.0
            violations_count = 0

            if sess:
                session_id = sess.id
                session_token = sess.session_token
                status_str = sess.status.value if hasattr(sess.status, "value") else str(sess.status)
                started_at = sess.started_at
                submitted_at = sess.submitted_at
                if sess.proctor_events:
                    integrity_score, violations_count, _ = calculate_integrity_score(sess.proctor_events)

            obt_m = res.obtained_marks if res else None
            pct = res.percentage if res else None
            passed = (pct >= (getattr(ex, "passing_marks", None) or 40.0)) if pct is not None else None

            # Apply Status Filter if specified
            if status_filter and status_filter.upper() != "ALL":
                sf = status_filter.upper()
                if sf in ("COMPLETED", "SUBMITTED"):
                    if status_str != "SUBMITTED":
                        continue
                elif sf == "IN_PROGRESS":
                    if status_str != "IN_PROGRESS":
                        continue
                elif sf == "NOT_STARTED":
                    if status_str != "NOT_STARTED":
                        continue

            reg_num = getattr(st, "register_number", None) or f"REG2026{st.id:04d}"
            dept = getattr(st, "department", None) or "Computer Science"
            year = getattr(st, "year", None) or "3rd Year"

            if department and department.upper() != "ALL":
                if dept.lower() != department.lower():
                    continue

            enrolled_list.append(
                EnrolledStudentResponse(
                    student_id=st.id,
                    student_name=st.name,
                    student_email=st.email,
                    student_register_number=reg_num,
                    student_department=dept,
                    student_year=year,
                    exam_id=ex.id,
                    exam_title=ex.title,
                    exam_subject=ex.subject,
                    duration_minutes=ex.duration_minutes,
                    session_id=session_id,
                    session_token=session_token,
                    status=status_str,
                    started_at=started_at,
                    submitted_at=submitted_at,
                    total_marks=round(total_m, 2),
                    obtained_marks=obt_m,
                    percentage=pct,
                    passed=passed,
                    violations_count=violations_count,
                    integrity_score=integrity_score
                )
            )

    completed_cnt = sum(1 for item in enrolled_list if item.status == "SUBMITTED")
    in_progress_cnt = sum(1 for item in enrolled_list if item.status == "IN_PROGRESS")
    not_started_cnt = sum(1 for item in enrolled_list if item.status == "NOT_STARTED")

    return EnrolledStudentsSummaryResponse(
        total_enrolled=len(enrolled_list),
        completed_count=completed_cnt,
        in_progress_count=in_progress_cnt,
        not_started_count=not_started_cnt,
        students=enrolled_list
    )

@router.get("/enrolled-students/all", response_model=EnrolledStudentsSummaryResponse)
@router.get("/enrolled-students", response_model=EnrolledStudentsSummaryResponse)
def get_all_enrolled_students(
    exam_id: Optional[int] = Query(None, description="Optional exam ID filter"),
    search: Optional[str] = Query(None, description="Search by student name or email"),
    status: Optional[str] = Query(None, description="Filter by status (ALL, NOT_STARTED, IN_PROGRESS, SUBMITTED)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    List all enrolled students across examinations with their status, score and AI integrity trust rating.
    """
    return get_enrolled_candidates_list(db, exam_id=exam_id, search=search, status_filter=status, department=department)

@router.get("/{exam_id:int}/enrolled-students", response_model=EnrolledStudentsSummaryResponse)
def get_exam_enrolled_students(
    exam_id: int,
    search: Optional[str] = Query(None, description="Search by student name or email"),
    status: Optional[str] = Query(None, description="Filter by status (ALL, NOT_STARTED, IN_PROGRESS, SUBMITTED)"),
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    List all enrolled candidates for a specific examination.
    """
    return get_enrolled_candidates_list(db, exam_id=exam_id, search=search, status_filter=status)

@router.get("/{exam_id:int}", response_model=ExamResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).options(
        joinedload(Exam.creator), 
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).filter(Exam.id == exam_id).first()

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    return serialize_exam(exam, db)

@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreate, 
    current_user: User = Depends(require_approved_examiner), 
    db: Session = Depends(get_db)
):
    if payload.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Exam duration must be greater than zero minutes.")

    if payload.status == ExamStatus.PUBLISHED and (not payload.questions or len(payload.questions) == 0):
        raise HTTPException(status_code=400, detail="Cannot publish an exam without questions. Please add questions or save as DRAFT.")

    # Validate questions exist if provided
    valid_qids_set = set()
    if payload.questions:
        requested_qids = [q.question_id for q in payload.questions]
        existing_q_rows = db.query(Question.id).filter(Question.id.in_(requested_qids)).all()
        valid_qids_set = {r[0] for r in existing_q_rows}
        missing_ids = [qid for qid in requested_qids if qid not in valid_qids_set]
        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Question(s) with ID {missing_ids} were not found in the Question Bank. Please re-select questions."
            )

    proctoring = payload.proctoring_enabled if payload.proctoring_enabled is not None else True
    webcam = payload.webcam_monitoring_enabled if payload.webcam_monitoring_enabled is not None else True
    gaze = payload.gaze_tracking_enabled if payload.gaze_tracking_enabled is not None else True
    max_warnings = payload.max_tab_switch_warnings if payload.max_tab_switch_warnings is not None else 3

    # Calculate default passing marks if not specified
    calc_total_marks = sum(q.marks or 1.0 for q in payload.questions) if payload.questions else (payload.total_marks or 0.0)
    calc_passing_marks = payload.passing_marks if payload.passing_marks is not None else round(calc_total_marks * 0.4, 2)

    new_exam = Exam(
        title=payload.title.strip(),
        subject=payload.subject.strip(),
        description=payload.description.strip() if payload.description else None,
        duration_minutes=payload.duration_minutes,
        total_questions=len(valid_qids_set) if payload.questions else 0,
        passing_marks=calc_passing_marks,
        randomization_enabled=True,
        negative_marking_enabled=False,
        default_negative_marks=0.0,
        proctoring_enabled=proctoring,
        webcam_monitoring_enabled=webcam,
        gaze_tracking_enabled=gaze,
        max_tab_switch_warnings=max_warnings,
        status=payload.status,
        created_by=current_user.id
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)

    # Link questions if provided (ensuring no duplicate question IDs)
    if payload.questions:
        seen_qids = set()
        for idx, q_link in enumerate(payload.questions):
            if q_link.question_id in seen_qids or q_link.question_id not in valid_qids_set:
                continue
            seen_qids.add(q_link.question_id)
            eq = ExamQuestion(
                exam_id=new_exam.id,
                question_id=q_link.question_id,
                marks=q_link.marks or 1.0,
                question_order=q_link.order or (idx + 1)
            )
            db.add(eq)
        new_exam.total_questions = len(seen_qids)
        db.commit()
        db.refresh(new_exam)

    # Invalidate session cache to ensure clean joined load
    db.expire_all()

    # Reload with relationships
    created = db.query(Exam).options(
        joinedload(Exam.creator),
        joinedload(Exam.sessions),
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).filter(Exam.id == new_exam.id).first()

    if not created:
        raise HTTPException(status_code=500, detail="Failed to load newly created exam.")

    return serialize_exam(created, db)

@router.put("/{exam_id:int}", response_model=ExamResponse)
def update_exam(
    exam_id: int,
    payload: ExamUpdate,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).options(joinedload(Exam.exam_questions)).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    if current_user.role != UserRole.ADMIN and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only modify exams created by yourself.")

    if payload.duration_minutes is not None:
        if payload.duration_minutes <= 0:
            raise HTTPException(status_code=400, detail="Exam duration must be greater than 0.")
        exam.duration_minutes = payload.duration_minutes

    if payload.title is not None:
        exam.title = payload.title.strip()
    if payload.subject is not None:
        exam.subject = payload.subject.strip()
    if payload.description is not None:
        exam.description = payload.description.strip()
    if payload.passing_marks is not None:
        exam.passing_marks = payload.passing_marks
    if payload.status is not None:
        if payload.status == ExamStatus.PUBLISHED and len(exam.exam_questions) == 0:
            raise HTTPException(status_code=400, detail="Cannot publish an exam with 0 questions. Please add questions first.")
        exam.status = payload.status
    if payload.proctoring_enabled is not None:
        exam.proctoring_enabled = payload.proctoring_enabled
    if payload.webcam_monitoring_enabled is not None:
        exam.webcam_monitoring_enabled = payload.webcam_monitoring_enabled
    if payload.gaze_tracking_enabled is not None:
        exam.gaze_tracking_enabled = payload.gaze_tracking_enabled
    if payload.max_tab_switch_warnings is not None:
        exam.max_tab_switch_warnings = payload.max_tab_switch_warnings

    exam.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(exam)

    updated = db.query(Exam).options(
        joinedload(Exam.creator),
        joinedload(Exam.sessions),
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).filter(Exam.id == exam.id).first()

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to reload updated exam.")

    return serialize_exam(updated, db)

@router.post("/{exam_id:int}/toggle-status", response_model=ExamResponse)
def toggle_exam_status(
    exam_id: int,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).options(joinedload(Exam.exam_questions)).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    if current_user.role != UserRole.ADMIN and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only toggle status of exams created by yourself.")

    # Toggle between PUBLISHED and DRAFT
    if exam.status == ExamStatus.PUBLISHED:
        exam.status = ExamStatus.DRAFT
    else:
        if len(exam.exam_questions) == 0:
            raise HTTPException(status_code=400, detail="Cannot publish an exam with 0 questions. Please add questions first.")
        exam.status = ExamStatus.PUBLISHED

    exam.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(exam)

    updated = db.query(Exam).options(
        joinedload(Exam.creator),
        joinedload(Exam.sessions),
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).filter(Exam.id == exam.id).first()

    return serialize_exam(updated, db)

@router.delete("/{exam_id:int}")
def delete_exam(
    exam_id: int,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    if current_user.role != UserRole.ADMIN and exam.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete exams created by yourself.")

    db.delete(exam)
    db.commit()
    return {"success": True, "message": f"Exam #{exam_id} deleted successfully."}
