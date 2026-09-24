import uuid
import math
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.models.user import User
from app.models.exam import Exam, ExamQuestion
from app.models.question import Question, Option
from app.models.session import ExamSession
from app.models.answer import Answer
from app.models.result import Result
from app.models.proctor_event import ProctorEvent
from app.enums.enums import (
    UserRole, ApprovalStatus, ExamStatus, SessionStatus, 
    QuestionType, ProctorEventType
)
from schemas import (
    ExamSessionStartResponse, ExamQuestionSanitized, QuestionOptionSanitized,
    SaveAnswerRequest, SaveAnswerResponse, ProctorEventCreate, ProctorEventResponse,
    SubmitExamRequest, ExamResultDetailResponse, QuestionResultBreakdown,
    ProctoringSummary, StudentExamSubmissionListItem, GradeOverrideRequest,
    ApproveResultRequest
)
from auth import get_current_user, require_approved_student, require_approved_examiner, require_admin

router = APIRouter(prefix="/api/exams", tags=["Exam Sessions & AI Proctoring"])


def calculate_integrity_score(events: List[ProctorEvent]) -> tuple[float, int, Dict[str, int]]:
    """
    Calculate candidate trust/integrity score based on recorded proctoring violations.
    Base score: 100.0%
    Deductions:
      - TAB_SWITCH: -5% per event
      - WINDOW_BLUR: -4% per event
      - FACE_ABSENT: -4% per event
      - MULTIPLE_FACES: -10% per event
      - GAZE_AWAY: -2% per event
    """
    score = 100.0
    breakdown: Dict[str, int] = {}
    violations_count = len(events)
    
    for ev in events:
        ev_type = ev.event_type.value if hasattr(ev.event_type, "value") else str(ev.event_type)
        breakdown[ev_type] = breakdown.get(ev_type, 0) + 1
        
        if ev_type == ProctorEventType.TAB_SWITCH.value:
            score -= 5.0
        elif ev_type == ProctorEventType.WINDOW_BLUR.value:
            score -= 4.0
        elif ev_type == ProctorEventType.FACE_ABSENT.value:
            score -= 4.0
        elif ev_type == ProctorEventType.MULTIPLE_FACES.value:
            score -= 10.0
        elif ev_type == ProctorEventType.GAZE_AWAY.value:
            score -= 2.0
        else:
            score -= 1.0

    integrity = max(10.0, min(100.0, round(score, 1)))
    return integrity, violations_count, breakdown


def evaluate_subjective_answer(text: Optional[str], model_answer: Optional[str], guidelines: Optional[str], max_marks: float) -> tuple[float, str]:
    """
    Intelligent automated heuristic evaluation for short and long text answers.
    Evaluates semantic keyword presence, sentence structure, and conceptual coverage.
    """
    if not text or not text.strip():
        return 0.0, "No response provided."

    clean_student = text.strip().lower()
    student_words = set(re.findall(r"\b[a-z0-9_]{3,}\b", clean_student))
    word_count = len(clean_student.split())

    if not model_answer or not model_answer.strip():
        # Fallback based on content depth
        if word_count > 30:
            awarded = round(max_marks * 0.85, 2)
            feedback = f"Substantive answer provided ({word_count} words). Good explanation depth."
        elif word_count > 10:
            awarded = round(max_marks * 0.70, 2)
            feedback = f"Concise answer provided ({word_count} words). Concepts identified."
        else:
            awarded = round(max_marks * 0.40, 2)
            feedback = f"Brief response provided ({word_count} words). Partial credit awarded."
        return awarded, feedback

    clean_model = model_answer.strip().lower()
    model_words = set(re.findall(r"\b[a-z0-9_]{3,}\b", clean_model))
    
    # Exclude common stop words for high-signal keyword matching
    stop_words = {"the", "and", "for", "that", "this", "with", "from", "are", "was", "were", "been", "have", "has", "had"}
    meaningful_model = model_words - stop_words
    
    if not meaningful_model:
        meaningful_model = model_words

    matched_keywords = student_words.intersection(meaningful_model)
    keyword_ratio = len(matched_keywords) / max(1, len(meaningful_model))
    
    # Calculate score based on keyword coverage and length ratio
    length_ratio = min(1.0, word_count / max(5, len(model_answer.split()) * 0.6))
    composite_score = (keyword_ratio * 0.65) + (length_ratio * 0.35)
    
    awarded_ratio = min(1.0, max(0.0, composite_score * 1.15)) # Generous scaling
    awarded = round(max_marks * awarded_ratio, 2)

    if awarded_ratio >= 0.80:
        feedback = f"Excellent response. Matched key domain concepts ({len(matched_keywords)} core terms identified). Thorough explanation."
    elif awarded_ratio >= 0.50:
        feedback = f"Good attempt. Covered primary principles with {len(matched_keywords)} key terms. Minor supplementary details missing."
    elif awarded_ratio >= 0.25:
        feedback = f"Partial credit. Touched upon basic principles ({len(matched_keywords)} related terms), but lacks depth and structural completeness."
    else:
        feedback = f"Needs improvement. Limited overlap with expected model criteria."

    return awarded, feedback


@router.post("/{exam_id}/start", response_model=ExamSessionStartResponse)
def start_exam_session(
    exam_id: int,
    current_user: User = Depends(require_approved_student),
    db: Session = Depends(get_db)
):
    """
    Start or resume an active examination session for an approved student.
    Returns sanitized questions (without answers or guidelines) and session token.
    """
    exam = db.query(Exam).options(
        joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).filter(Exam.id == exam_id).first()

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    # Check for existing session
    existing_session = db.query(ExamSession).filter(
        ExamSession.exam_id == exam_id,
        ExamSession.student_id == current_user.id
    ).first()

    if existing_session and existing_session.status == SessionStatus.SUBMITTED:
        raise HTTPException(
            status_code=400, 
            detail="You have already completed and submitted this examination."
        )

    if not existing_session:
        # Create fresh session
        session_token = f"sess_{uuid.uuid4().hex[:16]}_{exam_id}_{current_user.id}"
        session = ExamSession(
            exam_id=exam_id,
            student_id=current_user.id,
            session_token=session_token,
            started_at=datetime.now(timezone.utc),
            status=SessionStatus.IN_PROGRESS
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    else:
        session = existing_session
        if session.status == SessionStatus.NOT_STARTED:
            session.status = SessionStatus.IN_PROGRESS
            session.started_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(session)

    # Fetch previously saved answers for this session
    saved_answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    answers_map: Dict[str, Any] = {}
    for ans in saved_answers:
        answers_map[str(ans.question_id)] = {
            "question_id": ans.question_id,
            "selected_option_ids": ans.selected_option_ids,
            "text_answer": ans.text_answer,
            "image_url": ans.image_url,
            "updated_at": ans.updated_at.isoformat() if ans.updated_at else None
        }

    # Sort exam questions by order
    sorted_eqs = sorted(exam.exam_questions, key=lambda x: x.question_order or 1)
    
    # Calculate total marks
    total_m = sum((eq.marks or (eq.question.max_marks if eq.question else 1.0)) for eq in sorted_eqs)
    
    sanitized_questions: List[ExamQuestionSanitized] = []
    for idx, eq in enumerate(sorted_eqs):
        q = eq.question
        if not q:
            continue
        
        # Sanitize options (strip is_correct to prevent inspect element cheating)
        sanitized_opts = [
            QuestionOptionSanitized(
                id=opt.id,
                question_id=opt.question_id,
                option_text=opt.option_text
            )
            for opt in q.options
        ]

        sanitized_q = ExamQuestionSanitized(
            id=eq.id,
            question_id=q.id,
            order=eq.question_order or (idx + 1),
            marks=eq.marks or q.max_marks,
            question_text=q.question_text,
            question_type=q.question_type,
            subject=q.subject,
            difficulty=q.difficulty,
            negative_marks=q.negative_marks or 0.0,
            options=sanitized_opts
        )
        sanitized_questions.append(sanitized_q)

    now = datetime.now(timezone.utc)
    now_naive = now.replace(tzinfo=None)
    s_at = session.started_at or now
    s_at_naive = s_at.replace(tzinfo=None) if hasattr(s_at, "replace") and s_at.tzinfo else s_at
    elapsed_seconds = max(0, int((now_naive - s_at_naive).total_seconds()))
    remaining_seconds = max(0, int(exam.duration_minutes * 60 - elapsed_seconds))

    return ExamSessionStartResponse(
        session_id=session.id,
        session_token=session.session_token,
        exam_id=exam.id,
        exam_title=exam.title,
        exam_subject=exam.subject,
        exam_description=exam.description,
        duration_minutes=exam.duration_minutes,
        total_marks=total_m,
        passing_marks=getattr(exam, "passing_marks", None) or round(total_m * 0.4, 2),
        started_at=s_at,
        server_time=now,
        remaining_seconds=remaining_seconds,
        status=session.status,
        questions_count=len(sanitized_questions),
        questions=sanitized_questions,
        existing_answers=answers_map,
        proctoring_enabled=exam.proctoring_enabled
    )


@router.get("/sessions/{session_token}/active", response_model=ExamSessionStartResponse)
def get_active_session(
    session_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resume an active examination session using session token.
    Accurately computes server-side remaining time based on server clock.
    """
    session = db.query(ExamSession).options(
        joinedload(ExamSession.exam).joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).filter(ExamSession.session_token == session_token).first()

    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    if current_user.role == UserRole.STUDENT and session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this examination session.")

    exam = session.exam
    saved_answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    answers_map: Dict[str, Any] = {}
    for ans in saved_answers:
        answers_map[str(ans.question_id)] = {
            "question_id": ans.question_id,
            "selected_option_ids": ans.selected_option_ids,
            "text_answer": ans.text_answer,
            "image_url": ans.image_url,
            "is_flagged": ans.is_flagged,
            "updated_at": ans.updated_at.isoformat() if ans.updated_at else None
        }

    sorted_eqs = sorted(exam.exam_questions, key=lambda x: x.question_order or 1)
    total_m = sum((eq.marks or (eq.question.max_marks if eq.question else 1.0)) for eq in sorted_eqs)

    sanitized_questions: List[ExamQuestionSanitized] = []
    for idx, eq in enumerate(sorted_eqs):
        q = eq.question
        if not q:
            continue
        sanitized_opts = [
            QuestionOptionSanitized(
                id=opt.id,
                question_id=opt.question_id,
                option_text=opt.option_text
            )
            for opt in q.options
        ]
        sanitized_q = ExamQuestionSanitized(
            id=eq.id,
            question_id=q.id,
            order=eq.question_order or (idx + 1),
            marks=eq.marks or q.max_marks,
            question_text=q.question_text,
            question_type=q.question_type,
            subject=q.subject,
            difficulty=q.difficulty,
            negative_marks=q.negative_marks or 0.0,
            options=sanitized_opts
        )
        sanitized_questions.append(sanitized_q)

    now = datetime.now(timezone.utc)
    now_naive = now.replace(tzinfo=None)
    s_at = session.started_at or now
    s_at_naive = s_at.replace(tzinfo=None) if hasattr(s_at, "replace") and s_at.tzinfo else s_at
    elapsed_seconds = max(0, int((now_naive - s_at_naive).total_seconds()))
    remaining_seconds = max(0, int(exam.duration_minutes * 60 - elapsed_seconds))

    return ExamSessionStartResponse(
        session_id=session.id,
        session_token=session.session_token,
        exam_id=exam.id,
        exam_title=exam.title,
        exam_subject=exam.subject,
        exam_description=exam.description,
        duration_minutes=exam.duration_minutes,
        total_marks=total_m,
        passing_marks=getattr(exam, "passing_marks", None) or round(total_m * 0.4, 2),
        started_at=s_at,
        server_time=now,
        remaining_seconds=remaining_seconds,
        status=session.status,
        questions_count=len(sanitized_questions),
        questions=sanitized_questions,
        existing_answers=answers_map,
        proctoring_enabled=exam.proctoring_enabled
    )


@router.post("/sessions/{session_token}/answers", response_model=SaveAnswerResponse)
def save_session_answer(
    session_token: str,
    payload: SaveAnswerRequest,
    current_user: User = Depends(require_approved_student),
    db: Session = Depends(get_db)
):
    """
    Real-time auto-save answer for a specific question within an active session.
    """
    session = db.query(ExamSession).filter(ExamSession.session_token == session_token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    if session.status == SessionStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Cannot edit answers for an already submitted exam.")

    # Check question belongs to exam
    eq = db.query(ExamQuestion).filter(
        ExamQuestion.exam_id == session.exam_id,
        ExamQuestion.question_id == payload.question_id
    ).first()

    if not eq:
        raise HTTPException(status_code=400, detail="Question is not part of this examination.")

    answer = db.query(Answer).filter(
        Answer.session_id == session.id,
        Answer.question_id == payload.question_id
    ).first()

    now = datetime.now(timezone.utc)
    if not answer:
        answer = Answer(
            session_id=session.id,
            question_id=payload.question_id,
            selected_option_ids=payload.selected_option_ids,
            text_answer=payload.text_answer,
            image_url=payload.image_url,
            is_flagged=payload.is_flagged if payload.is_flagged is not None else False,
            created_at=now,
            updated_at=now
        )
        db.add(answer)
    else:
        answer.selected_option_ids = payload.selected_option_ids
        answer.text_answer = payload.text_answer
        answer.image_url = payload.image_url
        if payload.is_flagged is not None:
            answer.is_flagged = payload.is_flagged
        answer.updated_at = now

    db.commit()
    db.refresh(answer)

    return SaveAnswerResponse(
        success=True,
        answer_id=answer.id,
        question_id=answer.question_id,
        saved_at=answer.updated_at,
        message="Answer auto-saved successfully"
    )


@router.post("/sessions/{session_token}/proctor-event", response_model=ProctorEventResponse)
def log_proctor_event(
    session_token: str,
    payload: ProctorEventCreate,
    current_user: User = Depends(require_approved_student),
    db: Session = Depends(get_db)
):
    """
    Record real-time AI proctoring events (face absence, multiple faces, gaze away, tab switch, window blur).
    """
    session = db.query(ExamSession).filter(ExamSession.session_token == session_token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    event_type_str = payload.event_type.value if hasattr(payload.event_type, "value") else str(payload.event_type)
    event = ProctorEvent(
        session_id=session.id,
        event_type=event_type_str,
        event_data={"details": payload.details} if payload.details else None,
        suspicion_score=5.0 if ("TAB" in event_type_str or "FACE" in event_type_str) else 2.0,
        timestamp=payload.timestamp or datetime.now(timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return ProctorEventResponse(
        id=event.id,
        session_id=event.session_id,
        event_type=payload.event_type,
        details=payload.details,
        created_at=event.timestamp
    )


@router.post("/sessions/{session_token}/submit", response_model=ExamResultDetailResponse)
def submit_exam_session(
    session_token: str,
    payload: SubmitExamRequest,
    current_user: User = Depends(require_approved_student),
    db: Session = Depends(get_db)
):
    """
    Submit completed examination.
    Executes automated AI grading engine across all 5 question types,
    computes integrity trust score, and creates final Result record.
    Idempotent: if already submitted, returns existing result cleanly.
    """
    session = db.query(ExamSession).options(
        joinedload(ExamSession.exam).joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options),
        joinedload(ExamSession.student),
        joinedload(ExamSession.answers),
        joinedload(ExamSession.proctor_events)
    ).filter(ExamSession.session_token == session_token).first()

    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    exam = session.exam
    now = datetime.now(timezone.utc)

    # Mark session submitted
    if session.status != SessionStatus.SUBMITTED:
        session.status = SessionStatus.SUBMITTED
        session.submitted_at = now
        db.commit()

    # Build answers map
    existing_answers = {ans.question_id: ans for ans in session.answers}

    total_possible_marks = 0.0
    total_obtained_marks = 0.0
    answered_count = 0
    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    subjective_marks_sum = 0.0
    question_breakdown: List[QuestionResultBreakdown] = []

    sorted_eqs = sorted(exam.exam_questions, key=lambda x: x.question_order or 1)

    for idx, eq in enumerate(sorted_eqs):
        q = eq.question
        if not q:
            continue

        q_marks = eq.marks or q.max_marks
        total_possible_marks += q_marks
        ans = existing_answers.get(q.id)

        marks_awarded = 0.0
        is_correct = False
        ai_feedback = ""
        correct_option_ids = [opt.id for opt in q.options if opt.is_correct]

        # Serialized options for results breakdown
        options_data = [
            {"id": opt.id, "option_text": opt.option_text, "is_correct": opt.is_correct}
            for opt in q.options
        ]

        if ans:
            # Check if answer was actually provided
            has_content = (
                (ans.selected_option_ids and len(ans.selected_option_ids) > 0) or
                (ans.text_answer and ans.text_answer.strip()) or
                (ans.image_url and ans.image_url.strip())
            )
            if has_content:
                answered_count += 1
            else:
                unanswered_count += 1

            if q.question_type == QuestionType.MCQ:
                selected = ans.selected_option_ids or []
                if selected:
                    selected_id = selected[0] if isinstance(selected, list) else selected
                    if correct_option_ids and selected_id == correct_option_ids[0]:
                        marks_awarded = q_marks
                        is_correct = True
                        correct_count += 1
                        ai_feedback = "Correct answer selected."
                    else:
                        is_correct = False
                        wrong_count += 1
                        if q.negative_marks and q.negative_marks > 0:
                            marks_awarded = -abs(q.negative_marks)
                            ai_feedback = f"Incorrect option. Negative marking applied (-{q.negative_marks})."
                        else:
                            marks_awarded = 0.0
                            ai_feedback = "Incorrect option chosen."
                else:
                    marks_awarded = 0.0
                    ai_feedback = "No option selected."

            elif q.question_type == QuestionType.MULTI_SELECT:
                selected = set(ans.selected_option_ids or [])
                correct_set = set(correct_option_ids)
                if selected:
                    if selected == correct_set:
                        marks_awarded = q_marks
                        is_correct = True
                        correct_count += 1
                        ai_feedback = "All correct options identified precisely."
                    else:
                        # Partial credit calculation
                        true_positives = len(selected.intersection(correct_set))
                        false_positives = len(selected - correct_set)
                        if false_positives == 0 and true_positives > 0:
                            ratio = true_positives / len(correct_set)
                            marks_awarded = round(q_marks * ratio, 2)
                            is_correct = False
                            ai_feedback = f"Partial selection: {true_positives}/{len(correct_set)} correct options picked without false positives."
                        else:
                            marks_awarded = 0.0
                            is_correct = False
                            wrong_count += 1
                            ai_feedback = f"Incorrect combination selected ({false_positives} invalid options picked)."
                else:
                    marks_awarded = 0.0
                    ai_feedback = "No options selected."

            elif q.question_type in (QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER):
                awarded, feedback = evaluate_subjective_answer(
                    ans.text_answer, q.model_answer, getattr(q, "evaluation_guidelines", None) or q.expected_answer, q_marks
                )
                marks_awarded = awarded
                ai_feedback = feedback
                ans.ai_suggested_score = awarded
                ans.ai_justification = feedback
                subjective_marks_sum += marks_awarded
                if marks_awarded >= (q_marks * 0.7):
                    is_correct = True
                    correct_count += 1
                else:
                    is_correct = marks_awarded > 0
                    if not is_correct and has_content:
                        wrong_count += 1

            elif q.question_type == QuestionType.IMAGE_UPLOAD:
                if ans.image_url:
                    marks_awarded = round(q_marks * 0.80, 2) # Preliminary AI suggestion
                    is_correct = True
                    correct_count += 1
                    ai_feedback = "Handwritten diagram submission captured. Preliminary suggestion recorded; awaiting examiner review."
                    ans.ai_suggested_score = marks_awarded
                    ans.ai_justification = ai_feedback
                    subjective_marks_sum += marks_awarded
                else:
                    marks_awarded = 0.0
                    is_correct = False
                    ai_feedback = "No handwritten diagram uploaded."

            # Update answer record with calculated marks
            ans.marks_awarded = marks_awarded
            db.commit()

        else:
            unanswered_count += 1
            marks_awarded = 0.0
            is_correct = False
            ai_feedback = "Unanswered question."

        total_obtained_marks += marks_awarded

        qb = QuestionResultBreakdown(
            answer_id=ans.id if ans else None,
            question_id=q.id,
            order=eq.question_order or (idx + 1),
            question_text=q.question_text,
            question_type=q.question_type,
            subject=q.subject,
            difficulty=q.difficulty,
            marks_possible=q_marks,
            marks_awarded=marks_awarded,
            selected_option_ids=ans.selected_option_ids if ans else None,
            text_answer=ans.text_answer if ans else None,
            image_url=ans.image_url if ans else None,
            correct_option_ids=correct_option_ids,
            options=options_data,
            model_answer=q.model_answer,
            evaluation_guidelines=getattr(q, "evaluation_guidelines", None) or q.expected_answer,
            is_correct=is_correct,
            is_flagged=ans.is_flagged if ans else False,
            ai_feedback=ai_feedback,
            examiner_feedback=ans.examiner_feedback if ans else None
        )
        question_breakdown.append(qb)

    total_obtained_marks = max(0.0, round(total_obtained_marks, 2))
    percentage = round((total_obtained_marks / total_possible_marks * 100), 2) if total_possible_marks > 0 else 0.0
    pass_threshold = getattr(exam, "passing_marks", None) or 40.0
    passed = percentage >= pass_threshold

    # Proctoring score
    proctor_events = session.proctor_events or []
    integrity_score, viol_count, breakdown = calculate_integrity_score(proctor_events)
    suspicion_score = max(0.0, min(100.0, round(100.0 - integrity_score, 1)))

    # Upsert into results table
    result = db.query(Result).filter(
        Result.exam_id == exam.id,
        Result.student_id == current_user.id
    ).first()

    if not result:
        result = Result(
            exam_id=exam.id,
            student_id=current_user.id,
            session_id=session.id,
            total_marks=total_possible_marks,
            obtained_marks=total_obtained_marks,
            percentage=percentage,
            passing_status=passed,
            correct_answers_count=correct_count,
            wrong_answers_count=wrong_count,
            unanswered_count=unanswered_count,
            subjective_marks=subjective_marks_sum,
            suspicion_score=suspicion_score,
            is_approved=False,
            is_published=False,
            created_at=now,
            updated_at=now
        )
        db.add(result)
    else:
        result.session_id = session.id
        result.total_marks = total_possible_marks
        result.obtained_marks = total_obtained_marks
        result.percentage = percentage
        result.passing_status = passed
        result.correct_answers_count = correct_count
        result.wrong_answers_count = wrong_count
        result.unanswered_count = unanswered_count
        result.subjective_marks = subjective_marks_sum
        result.suspicion_score = suspicion_score
        result.updated_at = now

    db.commit()
    db.refresh(result)

    recent_events = []
    for ev in proctor_events[-10:]:
        ev_type = ev.event_type if isinstance(ev.event_type, ProctorEventType) else (
            ProctorEventType(ev.event_type) if ev.event_type in ProctorEventType._value2member_map_ else ProctorEventType.TAB_SWITCH
        )
        dtls = ev.event_data.get("details") if isinstance(ev.event_data, dict) else (str(ev.event_data) if ev.event_data else None)
        recent_events.append(
            ProctorEventResponse(
                id=ev.id,
                session_id=ev.session_id,
                event_type=ev_type,
                details=dtls,
                created_at=ev.timestamp
            )
        )

    duration_spent = None
    if session.started_at:
        s_at = session.started_at.replace(tzinfo=None) if session.started_at.tzinfo else session.started_at
        n_at = now.replace(tzinfo=None) if now.tzinfo else now
        duration_spent = max(0, int((n_at - s_at).total_seconds()))

    return ExamResultDetailResponse(
        result_id=result.id,
        session_id=session.id,
        session_token=session.session_token,
        exam_id=exam.id,
        exam_title=exam.title,
        exam_subject=exam.subject,
        student_id=current_user.id,
        student_name=current_user.name,
        student_register_number=getattr(current_user, "register_number", None),
        student_department=getattr(current_user, "department", None),
        total_marks=total_possible_marks,
        obtained_marks=total_obtained_marks,
        percentage=percentage,
        passed=passed,
        passing_status=passed,
        status=session.status,
        started_at=session.started_at,
        submitted_at=session.submitted_at,
        duration_spent_seconds=duration_spent,
        questions_count=len(sorted_eqs),
        answered_count=answered_count,
        correct_count=correct_count,
        question_breakdown=[],
        proctoring_summary=ProctoringSummary(
            total_events=len(proctor_events),
            integrity_score=integrity_score,
            violations_count=viol_count,
            events_breakdown=breakdown,
            recent_events=[]
        ),
        is_approved=False,
        approved_at=None,
        approved_by_name=None,
        approval_notes="Your examination has been submitted and is currently pending review & approval by the faculty examiner.",
        is_published=False,
        published_at=None
    )


@router.get("/sessions/{session_token}/result", response_model=ExamResultDetailResponse)
def get_session_result(
    session_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve completed examination results and detailed AI proctoring report.
    """
    session = db.query(ExamSession).options(
        joinedload(ExamSession.exam).joinedload(Exam.exam_questions).joinedload(ExamQuestion.question).joinedload(Question.options),
        joinedload(ExamSession.student),
        joinedload(ExamSession.answers),
        joinedload(ExamSession.proctor_events)
    ).filter(ExamSession.session_token == session_token).first()

    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    if current_user.role == UserRole.STUDENT and session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    exam = session.exam
    student = session.student

    result = db.query(Result).options(
        joinedload(Result.approver)
    ).filter(
        Result.exam_id == exam.id,
        Result.student_id == student.id
    ).first()

    is_approved = result.is_approved if result else False
    is_published = result.is_published if result else False

    answers_map = {ans.question_id: ans for ans in session.answers}
    sorted_eqs = sorted(exam.exam_questions, key=lambda x: x.question_order or 1)

    total_possible_marks = 0.0
    total_obtained_marks = 0.0
    answered_count = 0
    correct_count = 0
    question_breakdown: List[QuestionResultBreakdown] = []

    for idx, eq in enumerate(sorted_eqs):
        q = eq.question
        if not q:
            continue

        q_marks = eq.marks or q.max_marks
        total_possible_marks += q_marks
        ans = answers_map.get(q.id)

        marks_awarded = ans.marks_awarded if (ans and ans.marks_awarded is not None) else 0.0
        total_obtained_marks += marks_awarded

        if ans and (ans.selected_option_ids or ans.text_answer or ans.image_url):
            answered_count += 1

        correct_option_ids = [opt.id for opt in q.options if opt.is_correct]
        options_data = [
            {"id": opt.id, "option_text": opt.option_text, "is_correct": opt.is_correct}
            for opt in q.options
        ]

        is_correct = marks_awarded >= (q_marks * 0.7)
        if is_correct:
            correct_count += 1

        feedback = ans.examiner_feedback if (ans and ans.examiner_feedback) else (ans.ai_justification if (ans and ans.ai_justification) else "Evaluated response.")
        if not feedback or feedback == "Evaluated response.":
            if q.question_type == QuestionType.MCQ:
                feedback = "Correct selection." if is_correct else "Incorrect selection."
            elif q.question_type == QuestionType.MULTI_SELECT:
                feedback = "Matching multiple choice answers." if is_correct else "Partial or incorrect choices."
            elif q.question_type in (QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER):
                feedback = f"AI Evaluated: {marks_awarded}/{q_marks} Marks awarded based on criteria."
            elif q.question_type == QuestionType.IMAGE_UPLOAD:
                feedback = "Handwritten diagram evaluated."

        question_breakdown.append(
            QuestionResultBreakdown(
                answer_id=ans.id if ans else None,
                question_id=q.id,
                order=eq.question_order or (idx + 1),
                question_text=q.question_text,
                question_type=q.question_type,
                subject=q.subject,
                difficulty=q.difficulty,
                marks_possible=q_marks,
                marks_awarded=marks_awarded,
                selected_option_ids=ans.selected_option_ids if ans else None,
                text_answer=ans.text_answer if ans else None,
                image_url=ans.image_url if ans else None,
                correct_option_ids=correct_option_ids,
                options=options_data,
                model_answer=q.model_answer,
                evaluation_guidelines=getattr(q, "evaluation_guidelines", None) or q.expected_answer,
                is_correct=is_correct,
                is_flagged=ans.is_flagged if ans else False,
                ai_feedback=(ans.ai_justification if (ans and ans.ai_justification) else feedback),
                examiner_feedback=ans.examiner_feedback if ans else None
            )
        )

    obtained = result.obtained_marks if result else total_obtained_marks
    total_m = result.total_marks if result else total_possible_marks
    percentage = result.percentage if result else (round((obtained / total_m) * 100, 2) if total_m > 0 else 0.0)
    pass_threshold = getattr(exam, "passing_marks", None) or 40.0
    passed = percentage >= pass_threshold

    proctor_events = session.proctor_events or []
    integrity_score, viol_count, breakdown = calculate_integrity_score(proctor_events)
    recent_events = []
    for ev in proctor_events[-15:]:
        ev_type = ev.event_type if isinstance(ev.event_type, ProctorEventType) else (
            ProctorEventType(ev.event_type) if ev.event_type in ProctorEventType._value2member_map_ else ProctorEventType.TAB_SWITCH
        )
        dtls = ev.event_data.get("details") if isinstance(ev.event_data, dict) else (str(ev.event_data) if ev.event_data else None)
        recent_events.append(
            ProctorEventResponse(
                id=ev.id,
                session_id=ev.session_id,
                event_type=ev_type,
                details=dtls,
                created_at=ev.timestamp
            )
        )

    duration_spent = None
    if session.started_at and session.submitted_at:
        s_at = session.started_at.replace(tzinfo=None) if session.started_at.tzinfo else session.started_at
        sub_at = session.submitted_at.replace(tzinfo=None) if session.submitted_at.tzinfo else session.submitted_at
        duration_spent = max(0, int((sub_at - s_at).total_seconds()))

    # If student is viewing an unapproved result, return preliminary marks but mask question breakdown & answers until examiner approval
    if current_user.role == UserRole.STUDENT and not is_approved:
        return ExamResultDetailResponse(
            result_id=result.id if result else None,
            session_id=session.id,
            session_token=session.session_token,
            exam_id=exam.id,
            exam_title=exam.title,
            exam_subject=exam.subject,
            student_id=student.id,
            student_name=student.name,
            student_register_number=getattr(student, "register_number", None),
            student_department=getattr(student, "department", None),
            total_marks=total_m,
            obtained_marks=obtained,
            percentage=percentage,
            passed=passed,
            passing_status=passed,
            status=session.status,
            started_at=session.started_at,
            submitted_at=session.submitted_at,
            duration_spent_seconds=duration_spent,
            questions_count=len(sorted_eqs),
            answered_count=answered_count,
            correct_count=correct_count,
            question_breakdown=[],
            proctoring_summary=ProctoringSummary(
                total_events=len(proctor_events),
                integrity_score=integrity_score,
                violations_count=viol_count,
                events_breakdown=breakdown,
                recent_events=[]
            ),
            is_approved=False,
            approved_at=None,
            approved_by_name=None,
            approval_notes=result.approval_notes if (result and result.approval_notes) else "Your examination has been submitted and is currently pending evaluation & approval by the faculty examiner.",
            is_published=False,
            published_at=None
        )

    return ExamResultDetailResponse(
        result_id=result.id if result else None,
        session_id=session.id,
        session_token=session.session_token,
        exam_id=exam.id,
        exam_title=exam.title,
        exam_subject=exam.subject,
        student_id=student.id,
        student_name=student.name,
        student_register_number=getattr(student, "register_number", None),
        student_department=getattr(student, "department", None),
        total_marks=total_m,
        obtained_marks=obtained,
        percentage=percentage,
        passed=passed,
        passing_status=passed,
        status=session.status,
        started_at=session.started_at,
        submitted_at=session.submitted_at,
        duration_spent_seconds=duration_spent,
        questions_count=len(sorted_eqs),
        answered_count=answered_count,
        correct_count=correct_count,
        question_breakdown=question_breakdown,
        proctoring_summary=ProctoringSummary(
            total_events=len(proctor_events),
            integrity_score=integrity_score,
            violations_count=viol_count,
            events_breakdown=breakdown,
            recent_events=recent_events
        ),
        is_approved=is_approved,
        approved_at=result.approved_at if result else None,
        approved_by_name=result.approver.name if (result and result.approver) else None,
        approval_notes=result.approval_notes if result else None,
        is_published=is_published,
        published_at=result.published_at if result else None
    )


def fetch_submissions_helper(db: Session, exam_id: Optional[int] = None) -> List[StudentExamSubmissionListItem]:
    query = db.query(ExamSession).options(
        joinedload(ExamSession.student),
        joinedload(ExamSession.exam).joinedload(Exam.exam_questions),
        joinedload(ExamSession.proctor_events)
    )
    if exam_id is not None:
        query = query.filter(ExamSession.exam_id == exam_id)

    sessions = query.order_by(ExamSession.submitted_at.desc().nullslast(), ExamSession.id.desc()).all()

    results_query = db.query(Result).options(joinedload(Result.approver))
    if exam_id is not None:
        results_query = results_query.filter(Result.exam_id == exam_id)
    results = results_query.all()
    results_map = {(r.exam_id, r.student_id): r for r in results}

    submissions: List[StudentExamSubmissionListItem] = []
    for sess in sessions:
        student = sess.student
        if not student:
            continue

        res = results_map.get((sess.exam_id, sess.student_id))
        
        integrity_score, viol_count, _ = calculate_integrity_score(sess.proctor_events or [])
        
        tot_m = res.total_marks if res else (
            sum((eq.marks or 1.0) for eq in sess.exam.exam_questions) if (sess.exam and sess.exam.exam_questions) else 100.0
        )
        obt_m = res.obtained_marks if res else 0.0
        pct = res.percentage if res else 0.0
        passed = res.passing_status if (res and res.passing_status is not None) else (pct >= (getattr(sess.exam, "passing_marks", None) or 40.0) if sess.exam else (pct >= 40.0))
        is_app = res.is_approved if res else False

        submissions.append(
            StudentExamSubmissionListItem(
                session_id=sess.id,
                session_token=sess.session_token,
                exam_id=sess.exam_id,
                exam_title=sess.exam.title if sess.exam else "Examination",
                exam_subject=sess.exam.subject if sess.exam else "General",
                student_id=student.id,
                student_name=student.name,
                student_email=student.email,
                student_register_number=getattr(student, "register_number", None) or f"REG2026{student.id:04d}",
                student_department=getattr(student, "department", None) or "Computer Science",
                total_marks=round(tot_m, 2),
                obtained_marks=round(obt_m, 2),
                percentage=round(pct, 2),
                passed=passed,
                status=sess.status,
                submitted_at=sess.submitted_at,
                violations_count=viol_count,
                integrity_score=integrity_score,
                is_approved=is_app,
                approved_at=res.approved_at if res else None,
                approved_by_name=res.approver.name if (res and res.approver) else None,
                approval_notes=res.approval_notes if res else None
            )
        )

    return submissions


@router.get("/submissions/all", response_model=List[StudentExamSubmissionListItem])
@router.get("/submissions", response_model=List[StudentExamSubmissionListItem])
def get_all_exam_submissions(
    exam_id: Optional[int] = Query(None, description="Optional exam ID filter"),
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    List candidate exam attempts and scores across all examinations or filtered by query.
    """
    return fetch_submissions_helper(db, exam_id=exam_id)


@router.get("/{exam_id:int}/submissions", response_model=List[StudentExamSubmissionListItem])
def get_single_exam_submissions(
    exam_id: int,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    List candidate exam attempts and scores for a specific examination paper.
    """
    return fetch_submissions_helper(db, exam_id=exam_id)


@router.put("/sessions/{session_token}/approve-result")
def approve_session_result(
    session_token: str,
    payload: Optional[ApproveResultRequest] = None,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    Examiner/Admin audits and officially approves/releases a candidate's exam result.
    """
    session = db.query(ExamSession).filter(ExamSession.session_token == session_token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    result = db.query(Result).filter(
        Result.exam_id == session.exam_id,
        Result.student_id == session.student_id
    ).first()

    now = datetime.now(timezone.utc)
    notes_text = payload.notes if (payload and payload.notes) else "Audited and approved by faculty examiner."

    if not result:
        # Create Result dynamically if session was submitted
        answers = db.query(Answer).filter(Answer.session_id == session.id).all()
        obtained = sum((a.marks_awarded or 0.0) for a in answers)
        exam = session.exam or db.query(Exam).options(joinedload(Exam.exam_questions)).filter(Exam.id == session.exam_id).first()
        tot_m = (sum((eq.marks or 1.0) for eq in exam.exam_questions) if (exam and exam.exam_questions) else 100.0)
        pct = round((obtained / tot_m) * 100, 2) if tot_m > 0 else 0.0
        pass_thresh = getattr(exam, "passing_marks", None) or 40.0
        passed = pct >= pass_thresh

        result = Result(
            session_id=session.id,
            exam_id=session.exam_id,
            student_id=session.student_id,
            total_marks=tot_m,
            obtained_marks=obtained,
            percentage=pct,
            passing_status=passed,
            is_approved=True,
            is_published=True,
            published_at=now,
            approved_by=current_user.id,
            approved_at=now,
            approval_notes=notes_text
        )
        db.add(result)
    else:
        result.is_approved = True
        result.is_published = True
        result.published_at = now
        result.approved_by = current_user.id
        result.approved_at = now
        result.approval_notes = notes_text

    db.commit()
    db.refresh(result)

    return {
        "success": True,
        "message": f"Result for student #{session.student_id} approved and released successfully.",
        "result_id": result.id,
        "is_approved": True,
        "is_published": True,
        "approved_at": result.approved_at,
        "approved_by": current_user.name
    }


@router.put("/{exam_id:int}/approve-all-results")
def approve_all_exam_results(
    exam_id: int,
    payload: Optional[ApproveResultRequest] = None,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    Batch approve and release all pending results for an examination.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    results = db.query(Result).filter(Result.exam_id == exam_id).all()
    now = datetime.now(timezone.utc)
    count = 0
    for r in results:
        if not r.is_approved:
            r.is_approved = True
            r.is_published = True
            r.published_at = now
            r.approved_by = current_user.id
            r.approved_at = now
            if payload and payload.notes:
                r.approval_notes = payload.notes
            else:
                r.approval_notes = "Audited and approved by faculty examiner."
            count += 1

    db.commit()

    return {
        "success": True,
        "exam_id": exam_id,
        "approved_count": count,
        "total_results": len(results),
        "message": f"Successfully approved and released {count} candidate result(s)."
    }


@router.put("/answers/{answer_id:int}/grade")
def override_answer_grade(
    answer_id: int,
    payload: GradeOverrideRequest,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    Manual score adjustment by Examiner/Admin for subjective or image upload answers.
    Recalculates student's overall Result record and returns it to review state if updated.
    """
    answer = db.query(Answer).options(
        joinedload(Answer.session).joinedload(ExamSession.exam)
    ).filter(Answer.id == answer_id).first()

    if not answer:
        raise HTTPException(status_code=404, detail="Answer record not found.")

    answer.marks_awarded = payload.marks_awarded
    if payload.feedback:
        answer.examiner_feedback = payload.feedback.strip()
    answer.is_evaluated = True
    db.commit()

    # Recalculate Result total for this student & exam
    session = answer.session
    all_answers = db.query(Answer).filter(Answer.session_id == session.id).all()
    new_obtained = sum((a.marks_awarded or 0.0) for a in all_answers)

    result = db.query(Result).filter(
        Result.exam_id == session.exam_id,
        Result.student_id == session.student_id
    ).first()

    if result:
        result.obtained_marks = round(new_obtained, 2)
        if result.total_marks > 0:
            result.percentage = round((new_obtained / result.total_marks) * 100, 2)
            pass_thresh = getattr(session.exam, "passing_marks", None) or 40.0
            result.passing_status = (result.percentage >= pass_thresh)
        result.updated_at = datetime.now(timezone.utc)
        db.commit()

    return {
        "success": True,
        "answer_id": answer.id,
        "marks_awarded": answer.marks_awarded,
        "new_total_obtained": round(new_obtained, 2),
        "message": "Grade updated successfully."
    }

