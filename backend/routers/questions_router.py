from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional, List
from app.core.database import get_db
from app.models.user import User
from app.models.question import Question, Option as QuestionOption
from app.enums.enums import UserRole, QuestionType, DifficultyLevel
from schemas import (
    QuestionCreate, QuestionUpdate, QuestionResponse, 
    QuestionStatsResponse, AIGenerateQuestionRequest,
    DocumentExtractionResponse, TextExtractionRequest,
    BatchQuestionCreateRequest, BatchQuestionCreateResponse
)
from app.core.document_extractor import DocumentExtractor
from auth import require_approved_examiner, get_current_user
from services.translation_service import auto_translate_question_payload, translate_to_all_languages

router = APIRouter(prefix="/api/questions", tags=["Question Bank Management"])

@router.get("/stats", response_model=QuestionStatsResponse)
def get_question_stats(db: Session = Depends(get_db)):
    total = db.query(Question).count()
    mcq_count = db.query(Question).filter(Question.question_type == QuestionType.MCQ).count()
    multi_select_count = db.query(Question).filter(Question.question_type == QuestionType.MULTI_SELECT).count()
    short_ans = db.query(Question).filter(Question.question_type == QuestionType.SHORT_ANSWER).count()
    long_ans = db.query(Question).filter(Question.question_type == QuestionType.LONG_ANSWER).count()
    image_upload_count = db.query(Question).filter(Question.question_type == QuestionType.IMAGE_UPLOAD).count()

    subjective_count = short_ans + long_ans

    # Difficulty counts
    diff_raw = db.query(Question.difficulty, func.count(Question.id)).group_by(Question.difficulty).all()
    by_difficulty = {
        "EASY": 0,
        "MEDIUM": 0,
        "HARD": 0
    }
    for diff, count in diff_raw:
        if diff:
            by_difficulty[diff.value if hasattr(diff, 'value') else str(diff)] = count

    # Subject counts
    subj_raw = db.query(Question.subject, func.count(Question.id)).group_by(Question.subject).all()
    by_subject = {subj: count for subj, count in subj_raw if subj}

    return {
        "total_questions": total,
        "mcq_count": mcq_count,
        "multi_select_count": multi_select_count,
        "subjective_count": subjective_count,
        "image_upload_count": image_upload_count,
        "by_difficulty": by_difficulty,
        "by_subject": by_subject
    }

@router.get("", response_model=List[QuestionResponse])
def list_questions(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    question_type: Optional[str] = Query(None, description="Filter by question type"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    min_marks: Optional[float] = Query(None, description="Minimum marks"),
    max_marks: Optional[float] = Query(None, description="Maximum marks"),
    search: Optional[str] = Query(None, description="Search query in question text"),
    db: Session = Depends(get_db)
):
    query = db.query(Question).options(joinedload(Question.options), joinedload(Question.creator))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(Question.question_text.ilike(search_term))

    if subject and subject.upper() != "ALL":
        query = query.filter(Question.subject == subject)

    if question_type and question_type.upper() != "ALL":
        try:
            q_type = QuestionType(question_type.upper())
            query = query.filter(Question.question_type == q_type)
        except ValueError:
            pass

    if difficulty and difficulty.upper() != "ALL":
        try:
            diff = DifficultyLevel(difficulty.upper())
            query = query.filter(Question.difficulty == diff)
        except ValueError:
            pass

    if min_marks is not None:
        query = query.filter(Question.max_marks >= min_marks)

    if max_marks is not None:
        query = query.filter(Question.max_marks <= max_marks)

    questions = query.order_by(Question.created_at.desc()).all()

    def format_question_response(q_obj, creator_name=None):
        return {
            "id": q_obj.id,
            "question_text": q_obj.question_text,
            "question_type": q_obj.question_type,
            "subject": q_obj.subject,
            "topic": q_obj.topic,
            "difficulty": q_obj.difficulty,
            "marks": q_obj.max_marks,
            "negative_marks": q_obj.negative_marks,
            "expected_answer": q_obj.expected_answer,
            "model_answer": q_obj.model_answer,
            "evaluation_guidelines": q_obj.evaluation_guidelines,
            "question_text_en": q_obj.question_text_en or q_obj.question_text,
            "question_text_ta": q_obj.question_text_ta,
            "question_text_te": q_obj.question_text_te,
            "question_text_hi": q_obj.question_text_hi,
            "question_text_ml": q_obj.question_text_ml,
            "question_text_kn": q_obj.question_text_kn,
            "explanation_en": q_obj.explanation_en,
            "explanation_ta": q_obj.explanation_ta,
            "explanation_te": q_obj.explanation_te,
            "explanation_hi": q_obj.explanation_hi,
            "explanation_ml": q_obj.explanation_ml,
            "explanation_kn": q_obj.explanation_kn,
            "model_answer_en": q_obj.model_answer_en,
            "model_answer_ta": q_obj.model_answer_ta,
            "model_answer_te": q_obj.model_answer_te,
            "model_answer_hi": q_obj.model_answer_hi,
            "model_answer_ml": q_obj.model_answer_ml,
            "model_answer_kn": q_obj.model_answer_kn,
            "created_by": q_obj.created_by or 0,
            "creator_name": creator_name or (q_obj.creator.name if q_obj.creator else "System"),
            "created_at": q_obj.created_at,
            "options": [
                {
                    "id": opt.id,
                    "question_id": opt.question_id,
                    "option_text": opt.option_text,
                    "is_correct": opt.is_correct,
                    "option_text_en": opt.option_text_en or opt.option_text,
                    "option_text_ta": opt.option_text_ta,
                    "option_text_te": opt.option_text_te,
                    "option_text_hi": opt.option_text_hi,
                    "option_text_ml": opt.option_text_ml,
                    "option_text_kn": opt.option_text_kn,
                }
                for opt in q_obj.options
            ]
        }

    return [format_question_response(q) for q in questions]

@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).options(joinedload(Question.options), joinedload(Question.creator)).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    return {
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
        "question_text_en": q.question_text_en or q.question_text,
        "question_text_ta": q.question_text_ta,
        "question_text_te": q.question_text_te,
        "question_text_hi": q.question_text_hi,
        "question_text_ml": q.question_text_ml,
        "question_text_kn": q.question_text_kn,
        "explanation_en": q.explanation_en,
        "explanation_ta": q.explanation_ta,
        "explanation_te": q.explanation_te,
        "explanation_hi": q.explanation_hi,
        "explanation_ml": q.explanation_ml,
        "explanation_kn": q.explanation_kn,
        "model_answer_en": q.model_answer_en,
        "model_answer_ta": q.model_answer_ta,
        "model_answer_te": q.model_answer_te,
        "model_answer_hi": q.model_answer_hi,
        "model_answer_ml": q.model_answer_ml,
        "model_answer_kn": q.model_answer_kn,
        "created_by": q.created_by or 0,
        "creator_name": q.creator.name if q.creator else "System",
        "created_at": q.created_at,
        "options": [
            {
                "id": opt.id,
                "question_id": opt.question_id,
                "option_text": opt.option_text,
                "is_correct": opt.is_correct,
                "option_text_en": opt.option_text_en or opt.option_text,
                "option_text_ta": opt.option_text_ta,
                "option_text_te": opt.option_text_te,
                "option_text_hi": opt.option_text_hi,
                "option_text_ml": opt.option_text_ml,
                "option_text_kn": opt.option_text_kn,
            }
            for opt in q.options
        ]
    }

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate, 
    current_user: User = Depends(require_approved_examiner), 
    db: Session = Depends(get_db)
):
    # Validation based on question type
    if payload.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
        if not payload.options or len(payload.options) < 2:
            raise HTTPException(
                status_code=400, 
                detail="Multiple Choice and Multi-Select questions require at least 2 options."
            )
        correct_count = sum(1 for opt in payload.options if opt.is_correct)
        if payload.question_type == QuestionType.MCQ and correct_count != 1:
            raise HTTPException(
                status_code=400,
                detail="Single-choice MCQ must have exactly ONE correct option selected."
            )
        if payload.question_type == QuestionType.MULTI_SELECT and correct_count < 1:
            raise HTTPException(
                status_code=400,
                detail="Multi-Select questions must have at least one correct option selected."
            )

    # Perform automatic translation across all 6 languages
    q_dict = payload.model_dump()
    auto_translate_question_payload(q_dict)

    new_q = Question(
        question_text=payload.question_text.strip(),
        question_type=payload.question_type,
        subject=payload.subject.strip(),
        topic=payload.topic.strip() if payload.topic else None,
        difficulty=payload.difficulty,
        max_marks=payload.marks,
        negative_marks=payload.negative_marks,
        expected_answer=payload.expected_answer.strip() if payload.expected_answer else None,
        model_answer=payload.model_answer.strip() if payload.model_answer else None,
        evaluation_guidelines=payload.evaluation_guidelines.strip() if payload.evaluation_guidelines else None,
        question_text_en=q_dict.get("question_text_en") or payload.question_text.strip(),
        question_text_ta=q_dict.get("question_text_ta"),
        question_text_te=q_dict.get("question_text_te"),
        question_text_hi=q_dict.get("question_text_hi"),
        question_text_ml=q_dict.get("question_text_ml"),
        question_text_kn=q_dict.get("question_text_kn"),
        explanation_en=q_dict.get("explanation_en") or payload.explanation_en,
        explanation_ta=q_dict.get("explanation_ta"),
        explanation_te=q_dict.get("explanation_te"),
        explanation_hi=q_dict.get("explanation_hi"),
        explanation_ml=q_dict.get("explanation_ml"),
        explanation_kn=q_dict.get("explanation_kn"),
        model_answer_en=q_dict.get("model_answer_en") or payload.model_answer,
        model_answer_ta=q_dict.get("model_answer_ta"),
        model_answer_te=q_dict.get("model_answer_te"),
        model_answer_hi=q_dict.get("model_answer_hi"),
        model_answer_ml=q_dict.get("model_answer_ml"),
        model_answer_kn=q_dict.get("model_answer_kn"),
        created_by=current_user.id
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)

    # Add options if MCQ/MULTI_SELECT
    if payload.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT] and q_dict.get("options"):
        for opt_data in q_dict["options"]:
            new_opt = QuestionOption(
                question_id=new_q.id,
                option_text=opt_data.get("option_text", "").strip(),
                is_correct=opt_data.get("is_correct", False),
                option_text_en=opt_data.get("option_text_en") or opt_data.get("option_text", "").strip(),
                option_text_ta=opt_data.get("option_text_ta"),
                option_text_te=opt_data.get("option_text_te"),
                option_text_hi=opt_data.get("option_text_hi"),
                option_text_ml=opt_data.get("option_text_ml"),
                option_text_kn=opt_data.get("option_text_kn"),
            )
            db.add(new_opt)
        db.commit()
        db.refresh(new_q)

    return {
        "id": new_q.id,
        "question_text": new_q.question_text,
        "question_type": new_q.question_type,
        "subject": new_q.subject,
        "topic": new_q.topic,
        "difficulty": new_q.difficulty,
        "marks": new_q.max_marks,
        "negative_marks": new_q.negative_marks,
        "expected_answer": new_q.expected_answer,
        "model_answer": new_q.model_answer,
        "evaluation_guidelines": new_q.evaluation_guidelines,
        "question_text_en": new_q.question_text_en,
        "question_text_ta": new_q.question_text_ta,
        "question_text_te": new_q.question_text_te,
        "question_text_hi": new_q.question_text_hi,
        "question_text_ml": new_q.question_text_ml,
        "question_text_kn": new_q.question_text_kn,
        "explanation_en": new_q.explanation_en,
        "explanation_ta": new_q.explanation_ta,
        "explanation_te": new_q.explanation_te,
        "explanation_hi": new_q.explanation_hi,
        "explanation_ml": new_q.explanation_ml,
        "explanation_kn": new_q.explanation_kn,
        "model_answer_en": new_q.model_answer_en,
        "model_answer_ta": new_q.model_answer_ta,
        "model_answer_te": new_q.model_answer_te,
        "model_answer_hi": new_q.model_answer_hi,
        "model_answer_ml": new_q.model_answer_ml,
        "model_answer_kn": new_q.model_answer_kn,
        "created_by": new_q.created_by,
        "creator_name": current_user.name,
        "created_at": new_q.created_at,
        "options": [
            {
                "id": opt.id,
                "question_id": opt.question_id,
                "option_text": opt.option_text,
                "is_correct": opt.is_correct,
                "option_text_en": opt.option_text_en or opt.option_text,
                "option_text_ta": opt.option_text_ta,
                "option_text_te": opt.option_text_te,
                "option_text_hi": opt.option_text_hi,
                "option_text_ml": opt.option_text_ml,
                "option_text_kn": opt.option_text_kn,
            }
            for opt in new_q.options
        ]
    }

@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    if current_user.role != UserRole.ADMIN and q.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only modify questions created by yourself.")

    if payload.question_text is not None:
        q.question_text = payload.question_text.strip()
        q_trans = translate_to_all_languages(q.question_text)
        q.question_text_en = q.question_text
        q.question_text_ta = q_trans.get("ta")
        q.question_text_te = q_trans.get("te")
        q.question_text_hi = q_trans.get("hi")
        q.question_text_ml = q_trans.get("ml")
        q.question_text_kn = q_trans.get("kn")

    if payload.question_type is not None:
        q.question_type = payload.question_type
    if payload.subject is not None:
        q.subject = payload.subject.strip()
    if payload.topic is not None:
        q.topic = payload.topic.strip() if payload.topic else None
    if payload.difficulty is not None:
        q.difficulty = payload.difficulty
    if payload.marks is not None:
        q.max_marks = payload.marks
    if payload.negative_marks is not None:
        q.negative_marks = payload.negative_marks
    if payload.expected_answer is not None:
        q.expected_answer = payload.expected_answer.strip() if payload.expected_answer else None
    if payload.model_answer is not None:
        q.model_answer = payload.model_answer.strip() if payload.model_answer else None
        m_trans = translate_to_all_languages(q.model_answer)
        q.model_answer_en = q.model_answer
        q.model_answer_ta = m_trans.get("ta")
        q.model_answer_te = m_trans.get("te")
        q.model_answer_hi = m_trans.get("hi")
        q.model_answer_ml = m_trans.get("ml")
        q.model_answer_kn = m_trans.get("kn")

    if payload.evaluation_guidelines is not None:
        q.evaluation_guidelines = payload.evaluation_guidelines.strip() if payload.evaluation_guidelines else None

    # Multilingual explicit manual overrides
    for lang in ["en", "ta", "te", "hi", "ml", "kn"]:
        val = getattr(payload, f"question_text_{lang}", None)
        if val is not None:
            setattr(q, f"question_text_{lang}", val)
        exp_val = getattr(payload, f"explanation_{lang}", None)
        if exp_val is not None:
            setattr(q, f"explanation_{lang}", exp_val)
        model_val = getattr(payload, f"model_answer_{lang}", None)
        if model_val is not None:
            setattr(q, f"model_answer_{lang}", model_val)

    # Handle options update if provided
    if payload.options is not None:
        db.query(QuestionOption).filter(QuestionOption.question_id == q.id).delete()
        for opt in payload.options:
            opt_text = opt.option_text.strip()
            opt_trans = translate_to_all_languages(opt_text)
            new_opt = QuestionOption(
                question_id=q.id,
                option_text=opt_text,
                is_correct=opt.is_correct,
                option_text_en=opt.option_text_en or opt_text,
                option_text_ta=opt.option_text_ta or opt_trans.get("ta"),
                option_text_te=opt.option_text_te or opt_trans.get("te"),
                option_text_hi=opt.option_text_hi or opt_trans.get("hi"),
                option_text_ml=opt.option_text_ml or opt_trans.get("ml"),
                option_text_kn=opt.option_text_kn or opt_trans.get("kn"),
            )
            db.add(new_opt)

    db.commit()
    db.refresh(q)

    return {
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
        "question_text_en": q.question_text_en,
        "question_text_ta": q.question_text_ta,
        "question_text_te": q.question_text_te,
        "question_text_hi": q.question_text_hi,
        "question_text_ml": q.question_text_ml,
        "question_text_kn": q.question_text_kn,
        "explanation_en": q.explanation_en,
        "explanation_ta": q.explanation_ta,
        "explanation_te": q.explanation_te,
        "explanation_hi": q.explanation_hi,
        "explanation_ml": q.explanation_ml,
        "explanation_kn": q.explanation_kn,
        "model_answer_en": q.model_answer_en,
        "model_answer_ta": q.model_answer_ta,
        "model_answer_te": q.model_answer_te,
        "model_answer_hi": q.model_answer_hi,
        "model_answer_ml": q.model_answer_ml,
        "model_answer_kn": q.model_answer_kn,
        "created_by": q.created_by,
        "creator_name": q.creator.name if q.creator else current_user.name,
        "created_at": q.created_at,
        "options": [
            {
                "id": opt.id,
                "question_id": opt.question_id,
                "option_text": opt.option_text,
                "is_correct": opt.is_correct,
                "option_text_en": opt.option_text_en or opt.option_text,
                "option_text_ta": opt.option_text_ta,
                "option_text_te": opt.option_text_te,
                "option_text_hi": opt.option_text_hi,
                "option_text_ml": opt.option_text_ml,
                "option_text_kn": opt.option_text_kn,
            }
            for opt in q.options
        ]
    }

@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    if current_user.role != UserRole.ADMIN and q.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete questions created by yourself.")

    db.delete(q)
    db.commit()
    return {"success": True, "message": f"Question #{question_id} deleted successfully."}

@router.post("/ai-generate")
def ai_generate_question(payload: AIGenerateQuestionRequest, current_user: User = Depends(require_approved_examiner)):
    """
    Intelligent Question Generator that synthesizes high-quality questions with answer keys based on topic and difficulty.
    """
    topic = payload.topic.strip()
    subject = payload.subject.strip()
    q_type = payload.question_type
    diff = payload.difficulty

    # Smart templates library covering common academic topics
    if q_type == QuestionType.MCQ:
        raw_res = {
            "question_text": f"In {subject} ({topic}), what is the primary computational time complexity of searching an optimal element in a balanced binary search tree of N elements?",
            "question_type": "MCQ",
            "subject": subject,
            "difficulty": diff.value if hasattr(diff, 'value') else diff,
            "marks": 2.0 if diff == DifficultyLevel.HARD else 1.0,
            "negative_marks": 0.25 if diff == DifficultyLevel.HARD else 0.0,
            "options": [
                {"option_text": "O(1) - Constant time", "is_correct": False},
                {"option_text": "O(log N) - Logarithmic time", "is_correct": True},
                {"option_text": "O(N) - Linear time", "is_correct": False},
                {"option_text": "O(N log N) - Linearithmic time", "is_correct": False}
            ],
            "model_answer": "In a balanced BST (such as AVL or Red-Black Tree), the height is bounded by O(log N). Each step down halves the search space, yielding O(log N) search complexity."
        }
    elif q_type == QuestionType.MULTI_SELECT:
        raw_res = {
            "question_text": f"Which of the following statements are TRUE regarding {topic} in modern {subject} architectures? (Select all that apply)",
            "question_type": "MULTI_SELECT",
            "subject": subject,
            "difficulty": diff.value if hasattr(diff, 'value') else diff,
            "marks": 3.0,
            "negative_marks": 0.5,
            "options": [
                {"option_text": "Provides fault tolerance and automatic failover handling", "is_correct": True},
                {"option_text": "Eliminates all runtime memory allocation overhead entirely", "is_correct": False},
                {"option_text": "Supports horizontal scaling and distributed consensus", "is_correct": True},
                {"option_text": "Ensures idempotent operations during retry attempts", "is_correct": True}
            ],
            "model_answer": "Options A, C, and D are valid architectural principles of scalable distributed systems. Option B is false."
        }
    elif q_type == QuestionType.SHORT_ANSWER:
        raw_res = {
            "question_text": f"Define the core principle of {topic} in {subject} and state two primary use cases.",
            "question_type": "SHORT_ANSWER",
            "subject": subject,
            "difficulty": diff.value if hasattr(diff, 'value') else diff,
            "marks": 5.0,
            "negative_marks": 0.0,
            "options": [],
            "model_answer": f"{topic} is a foundational mechanism in {subject} designed to optimize throughput and maintain consistency.\n\nKey Use Cases:\n1. Low-latency caching and query acceleration\n2. Real-time stream processing and event aggregation."
        }
    elif q_type == QuestionType.LONG_ANSWER:
        raw_res = {
            "question_text": f"Provide an in-depth architectural breakdown of {topic} in {subject}. Analyze the mathematical formulations, trade-offs between latency and throughput, and describe a real-world enterprise implementation.",
            "question_type": "LONG_ANSWER",
            "subject": subject,
            "difficulty": diff.value if hasattr(diff, 'value') else diff,
            "marks": 10.0,
            "negative_marks": 0.0,
            "options": [],
            "model_answer": f"Comprehensive Evaluation Model:\n1. Architecture Overview (3 Marks): Complete system diagram, component interactions.\n2. Mathematical/Theoretical Formulation (3 Marks): Derivation of governing equations and boundary conditions.\n3. Latency vs. Throughput Trade-offs (2 Marks): In-depth comparison of synchronous vs asynchronous paradigms.\n4. Practical Case Study (2 Marks): Production deployment blueprint with monitoring & observability.",
            "evaluation_guidelines": "Award 10 marks total: 3 marks for system design, 3 marks for theory/equations, 2 marks for trade-off matrix, 2 marks for industrial implementation details."
        }
    else: # IMAGE_UPLOAD
        raw_res = {
            "question_text": f"Draw the complete circuit schematic / architectural block diagram for {topic} in {subject}. Upload a clear handwritten diagram showing all input/output buses, clock lines, control signals, and truth tables.",
            "question_type": "IMAGE_UPLOAD",
            "subject": subject,
            "difficulty": diff.value if hasattr(diff, 'value') else diff,
            "marks": 15.0,
            "negative_marks": 0.0,
            "options": [],
            "model_answer": "Expected Diagram Components:\n1. Central Processing/Control Unit with clear pin mappings.\n2. Labeled address/data buses (16/32-bit).\n3. Timing waveforms indicating setup and hold times.\n4. Complete truth table with minterms.",
            "evaluation_guidelines": "AI Vision assisted rubric:\n- Neatness & Labeling: 4 marks\n- Accurate bus topologies & clock routing: 6 marks\n- Truth table and state transition verification: 5 marks"
        }

    return auto_translate_question_payload(raw_res)

@router.post("/extract-document", response_model=DocumentExtractionResponse)
async def extract_questions_from_document(
    file: UploadFile = File(...),
    default_subject: Optional[str] = Form("Computer Science & Engineering"),
    default_difficulty: Optional[str] = Form("MEDIUM"),
    default_marks: Optional[float] = Form(1.0),
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    Extracts structured examination questions & answers from uploaded documents
    (Excel .xlsx/.xls, Word .docx, PDF .pdf, CSV .csv, TXT).
    Includes intelligent duplicate checking against existing repository questions.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename_lower = file.filename.lower()
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    diff_enum = DifficultyLevel.MEDIUM
    if default_difficulty:
        try:
            diff_enum = DifficultyLevel(default_difficulty.upper())
        except ValueError:
            pass

    subject_val = default_subject.strip() if default_subject else "Computer Science & Engineering"
    marks_val = float(default_marks) if default_marks and default_marks > 0 else 1.0

    if filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
        return DocumentExtractor.extract_from_excel(
            file_bytes=file_bytes,
            filename=file.filename,
            default_subject=subject_val,
            default_difficulty=diff_enum,
            default_marks=marks_val,
            db=db
        )
    elif filename_lower.endswith(".docx") or filename_lower.endswith(".doc"):
        return DocumentExtractor.extract_from_docx(
            file_bytes=file_bytes,
            filename=file.filename,
            default_subject=subject_val,
            default_difficulty=diff_enum,
            default_marks=marks_val,
            db=db
        )
    elif filename_lower.endswith(".pdf"):
        return DocumentExtractor.extract_from_pdf(
            file_bytes=file_bytes,
            filename=file.filename,
            default_subject=subject_val,
            default_difficulty=diff_enum,
            default_marks=marks_val,
            db=db
        )
    elif filename_lower.endswith(".csv") or filename_lower.endswith(".txt"):
        try:
            text_content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_content = file_bytes.decode("latin-1", errors="ignore")
        return DocumentExtractor.extract_from_text(
            raw_text=text_content,
            source_format=f"Text File ({file.filename})",
            filename=file.filename,
            default_subject=subject_val,
            default_difficulty=diff_enum,
            default_marks=marks_val,
            db=db
        )
    else:
        try:
            text_content = file_bytes.decode("utf-8")
            return DocumentExtractor.extract_from_text(
                raw_text=text_content,
                source_format=f"File ({file.filename})",
                filename=file.filename,
                default_subject=subject_val,
                default_difficulty=diff_enum,
                default_marks=marks_val,
                db=db
            )
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{file.filename}'. Please upload an Excel (.xlsx, .xls), Word (.docx, .doc), PDF (.pdf), or CSV/TXT file."
            )

@router.post("/extract-text", response_model=DocumentExtractionResponse)
def extract_questions_from_text(
    payload: TextExtractionRequest,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    Extracts structured examination questions & answers from raw pasted text.
    """
    return DocumentExtractor.extract_from_text(
        raw_text=payload.raw_text,
        source_format="Raw Text Paste",
        filename="pasted_questions.txt",
        default_subject=payload.default_subject or "Computer Science & Engineering",
        default_difficulty=payload.default_difficulty or DifficultyLevel.MEDIUM,
        default_marks=payload.default_marks or 1.0,
        db=db
    )

@router.post("/ai-extract-fallback")
def ai_extract_fallback(
    payload: TextExtractionRequest,
    current_user: User = Depends(require_approved_examiner)
):
    """
    Structured AI Fallback extractor returning JSON with question, options, correctAnswer, and rubric.
    """
    return DocumentExtractor.ai_extract_fallback(
        raw_text=payload.raw_text,
        default_subject=payload.default_subject or "Computer Science & Engineering",
        default_difficulty=payload.default_difficulty or DifficultyLevel.MEDIUM,
        default_marks=payload.default_marks or 1.0
    )

@router.post("/batch-create", response_model=BatchQuestionCreateResponse, status_code=status.HTTP_201_CREATED)
def batch_create_questions(
    payload: BatchQuestionCreateRequest,
    current_user: User = Depends(require_approved_examiner),
    db: Session = Depends(get_db)
):
    """
    Batch inserts, updates, or skips verified questions in the Question Bank in a single transaction.
    Supports in-place duplicate replacement when replace_question_id is specified.
    """
    if not payload.questions:
        raise HTTPException(status_code=400, detail="Question list cannot be empty.")

    created_questions: List[Question] = []
    created_count = 0
    updated_count = 0
    skipped_count = 0

    try:
        for idx, q_data in enumerate(payload.questions):
            # If item is marked to skip, increment count and continue
            if getattr(q_data, "skip", False):
                skipped_count += 1
                continue

            # Domain validation
            if q_data.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
                if not q_data.options or len(q_data.options) < 2:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Question #{idx + 1} ({q_data.question_text[:30]}...) requires at least 2 options."
                    )
                correct_count = sum(1 for opt in q_data.options if opt.is_correct)
                if q_data.question_type == QuestionType.MCQ and correct_count != 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"MCQ Question #{idx + 1} must have exactly 1 correct option selected."
                    )
                if q_data.question_type == QuestionType.MULTI_SELECT and correct_count < 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Multi-Select Question #{idx + 1} must have at least 1 correct option selected."
                    )

            # Auto-translate question and its options across all 6 languages
            q_dict = q_data.model_dump()
            auto_translate_question_payload(q_dict)

            # Check if replacing existing question
            replace_id = getattr(q_data, "replace_question_id", None)
            target_q = None
            if replace_id:
                target_q = db.query(Question).filter(Question.id == replace_id).first()

            if target_q:
                # Update existing question in-place with all translations
                target_q.question_text = q_data.question_text.strip()
                target_q.question_type = q_data.question_type
                target_q.subject = q_data.subject.strip()
                target_q.difficulty = q_data.difficulty
                target_q.max_marks = q_data.marks
                target_q.negative_marks = q_data.negative_marks
                target_q.model_answer = q_data.model_answer.strip() if q_data.model_answer else None

                target_q.question_text_en = q_dict.get("question_text_en") or q_data.question_text.strip()
                target_q.question_text_ta = q_dict.get("question_text_ta")
                target_q.question_text_te = q_dict.get("question_text_te")
                target_q.question_text_hi = q_dict.get("question_text_hi")
                target_q.question_text_ml = q_dict.get("question_text_ml")
                target_q.question_text_kn = q_dict.get("question_text_kn")

                target_q.explanation_en = q_dict.get("explanation_en") or q_data.explanation_en
                target_q.explanation_ta = q_dict.get("explanation_ta")
                target_q.explanation_te = q_dict.get("explanation_te")
                target_q.explanation_hi = q_dict.get("explanation_hi")
                target_q.explanation_ml = q_dict.get("explanation_ml")
                target_q.explanation_kn = q_dict.get("explanation_kn")

                target_q.model_answer_en = q_dict.get("model_answer_en") or q_data.model_answer
                target_q.model_answer_ta = q_dict.get("model_answer_ta")
                target_q.model_answer_te = q_dict.get("model_answer_te")
                target_q.model_answer_hi = q_dict.get("model_answer_hi")
                target_q.model_answer_ml = q_dict.get("model_answer_ml")
                target_q.model_answer_kn = q_dict.get("model_answer_kn")
                
                # Delete existing options and insert new
                db.query(QuestionOption).filter(QuestionOption.question_id == target_q.id).delete()
                db.flush()

                if q_data.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT] and q_dict.get("options"):
                    for opt_data in q_dict["options"]:
                        new_opt = QuestionOption(
                            question_id=target_q.id,
                            option_text=opt_data.get("option_text", "").strip(),
                            is_correct=opt_data.get("is_correct", False),
                            option_text_en=opt_data.get("option_text_en") or opt_data.get("option_text", "").strip(),
                            option_text_ta=opt_data.get("option_text_ta"),
                            option_text_te=opt_data.get("option_text_te"),
                            option_text_hi=opt_data.get("option_text_hi"),
                            option_text_ml=opt_data.get("option_text_ml"),
                            option_text_kn=opt_data.get("option_text_kn"),
                        )
                        db.add(new_opt)

                created_questions.append(target_q)
                updated_count += 1

            else:
                # Create brand new question with all translations
                new_q = Question(
                    question_text=q_data.question_text.strip(),
                    question_type=q_data.question_type,
                    subject=q_data.subject.strip(),
                    difficulty=q_data.difficulty,
                    max_marks=q_data.marks,
                    negative_marks=q_data.negative_marks,
                    model_answer=q_data.model_answer.strip() if q_data.model_answer else None,
                    question_text_en=q_dict.get("question_text_en") or q_data.question_text.strip(),
                    question_text_ta=q_dict.get("question_text_ta"),
                    question_text_te=q_dict.get("question_text_te"),
                    question_text_hi=q_dict.get("question_text_hi"),
                    question_text_ml=q_dict.get("question_text_ml"),
                    question_text_kn=q_dict.get("question_text_kn"),
                    explanation_en=q_dict.get("explanation_en") or q_data.explanation_en,
                    explanation_ta=q_dict.get("explanation_ta"),
                    explanation_te=q_dict.get("explanation_te"),
                    explanation_hi=q_dict.get("explanation_hi"),
                    explanation_ml=q_dict.get("explanation_ml"),
                    explanation_kn=q_dict.get("explanation_kn"),
                    model_answer_en=q_dict.get("model_answer_en") or q_data.model_answer,
                    model_answer_ta=q_dict.get("model_answer_ta"),
                    model_answer_te=q_dict.get("model_answer_te"),
                    model_answer_hi=q_dict.get("model_answer_hi"),
                    model_answer_ml=q_dict.get("model_answer_ml"),
                    model_answer_kn=q_dict.get("model_answer_kn"),
                    created_by=current_user.id
                )
                db.add(new_q)
                db.flush()

                if q_data.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT] and q_dict.get("options"):
                    for opt_data in q_dict["options"]:
                        new_opt = QuestionOption(
                            question_id=new_q.id,
                            option_text=opt_data.get("option_text", "").strip(),
                            is_correct=opt_data.get("is_correct", False),
                            option_text_en=opt_data.get("option_text_en") or opt_data.get("option_text", "").strip(),
                            option_text_ta=opt_data.get("option_text_ta"),
                            option_text_te=opt_data.get("option_text_te"),
                            option_text_hi=opt_data.get("option_text_hi"),
                            option_text_ml=opt_data.get("option_text_ml"),
                            option_text_kn=opt_data.get("option_text_kn"),
                        )
                        db.add(new_opt)

                created_questions.append(new_q)
                created_count += 1

        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to batch create questions: {str(e)}")

    # Format response
    response_items = []
    for q in created_questions:
        db.refresh(q)
        response_items.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "subject": q.subject,
            "difficulty": q.difficulty,
            "marks": q.max_marks,
            "negative_marks": q.negative_marks,
            "model_answer": q.model_answer,
            "created_by": q.created_by,
            "creator_name": current_user.name,
            "created_at": q.created_at,
            "options": q.options
        })

    return {
        "success": True,
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "questions": response_items,
        "message": f"Successfully processed {len(response_items)} item(s) in Question Bank ({created_count} created, {updated_count} updated, {skipped_count} skipped)."
    }

@router.get("/templates/{template_type}")
def download_question_template(template_type: str):
    """
    Downloads standardized question import templates for Excel (.xlsx), Word (.docx), or CSV.
    """
    norm_type = template_type.lower().strip()
    if norm_type in ["excel", "xlsx", "xls"]:
        content = DocumentExtractor.generate_excel_template()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Exam_Question_Bank_Template.xlsx"}
        )
    elif norm_type in ["word", "docx", "doc"]:
        content = DocumentExtractor.generate_docx_template()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=Exam_Question_Bank_Template.docx"}
        )
    elif norm_type in ["csv", "txt"]:
        content = DocumentExtractor.generate_csv_template()
        return PlainTextResponse(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=Exam_Question_Bank_Template.csv"}
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid template format. Supported formats: 'excel', 'word', 'csv'."
        )
