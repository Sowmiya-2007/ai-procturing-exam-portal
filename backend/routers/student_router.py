from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.question import Question
from app.models.exam import Exam, ExamQuestion
from app.models.session import ExamSession
from app.models.result import Result
from app.enums.enums import UserRole, ApprovalStatus, ExamStatus, SessionStatus
from schemas import UserResponse, ExamResultDetailResponse
from auth import get_current_user, require_approved_student
from routers.exam_session_router import calculate_integrity_score, resolve_multilingual_field

router = APIRouter(prefix="/api/student", tags=["Student Portal"], dependencies=[Depends(require_approved_student)])

@router.get("/dashboard")
def get_student_dashboard(
    language: Optional[str] = Query("en", description="Requested student language code (en, ta, te, hi, ml, kn)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
            "title": resolve_multilingual_field(ex, "title", language),
            "subject": resolve_multilingual_field(ex, "subject", language),
            "description": resolve_multilingual_field(ex, "description", language) or "Comprehensive proctored assessment.",
            "title_en": getattr(ex, "title_en", None) or ex.title,
            "title_ta": getattr(ex, "title_ta", None),
            "title_te": getattr(ex, "title_te", None),
            "title_hi": getattr(ex, "title_hi", None),
            "title_ml": getattr(ex, "title_ml", None),
            "title_kn": getattr(ex, "title_kn", None),
            "subject_en": getattr(ex, "subject_en", None) or ex.subject,
            "subject_ta": getattr(ex, "subject_ta", None),
            "subject_te": getattr(ex, "subject_te", None),
            "subject_hi": getattr(ex, "subject_hi", None),
            "subject_ml": getattr(ex, "subject_ml", None),
            "subject_kn": getattr(ex, "subject_kn", None),
            "description_en": getattr(ex, "description_en", None) or ex.description,
            "description_ta": getattr(ex, "description_ta", None),
            "description_te": getattr(ex, "description_te", None),
            "description_hi": getattr(ex, "description_hi", None),
            "description_ml": getattr(ex, "description_ml", None),
            "description_kn": getattr(ex, "description_kn", None),
            "instructions_en": getattr(ex, "instructions_en", None),
            "instructions_ta": getattr(ex, "instructions_ta", None),
            "instructions_te": getattr(ex, "instructions_te", None),
            "instructions_hi": getattr(ex, "instructions_hi", None),
            "instructions_ml": getattr(ex, "instructions_ml", None),
            "instructions_kn": getattr(ex, "instructions_kn", None),
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
            "exam_title": resolve_multilingual_field(exam, "title", language) if exam else f"Exam #{res.exam_id}",
            "exam_subject": resolve_multilingual_field(exam, "subject", language) if exam else "General",
            "exam_title_en": getattr(exam, "title_en", None) or (exam.title if exam else f"Exam #{res.exam_id}"),
            "exam_title_ta": getattr(exam, "title_ta", None),
            "exam_title_te": getattr(exam, "title_te", None),
            "exam_title_hi": getattr(exam, "title_hi", None),
            "exam_title_ml": getattr(exam, "title_ml", None),
            "exam_title_kn": getattr(exam, "title_kn", None),
            "exam_subject_en": getattr(exam, "subject_en", None) or (exam.subject if exam else "General"),
            "exam_subject_ta": getattr(exam, "subject_ta", None),
            "exam_subject_te": getattr(exam, "subject_te", None),
            "exam_subject_hi": getattr(exam, "subject_hi", None),
            "exam_subject_ml": getattr(exam, "subject_ml", None),
            "exam_subject_kn": getattr(exam, "subject_kn", None),
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

    announcements_catalog = [
        {
            "id": 1,
            "title_en": "AI Proctoring System Verification Active",
            "title_ta": "AI கண்காணிப்பு அமைப்பு சரிபார்ப்பு செயலில் உள்ளது",
            "title_te": "AI ప్రోక్టరింగ్ సిస్టమ్ ధృవీకరణ యాక్టివ్‌గా ఉంది",
            "title_hi": "AI प्रॉक्टरिंग सिस्टम सत्यापन सक्रिय है",
            "title_ml": "AI പ്രോക്ടറിംഗ് സിസ്റ്റം പരിശോധന സജീവമാണ്",
            "title_kn": "AI ಪ್ರಾಕ್ಟರಿಂಗ್ ಸಿಸ್ಟಮ್ ಪರಿಶೀಲನೆ ಸಕ್ರಿಯವಾಗಿದೆ",
            "content_en": "Webcam, audio level analysis, and full-screen lockdown are enabled for all official exams.",
            "content_ta": "அனைத்து அதிகாரப்பூர்வ தேர்வுகளுக்கும் வெப்கேம், ஆடியோ அளவு பகுப்பாய்வு மற்றும் முழுத்திரை பூட்டுதல் இயக்கப்பட்டிருக்கும்.",
            "content_te": "అన్ని అధికారిక పరీక్షల కోసం వెబ్‌క్యామ్, ఆడియో స్థాయి విశ్లేషణ మరియు పూర్తి స్క్రీన్ లాక్‌డౌన్ ప్రారంభించబడ్డాయి.",
            "content_hi": "सभी आधिकारिक परीक्षाओं के लिए वेबकैम, ऑडियो स्तर विश्लेषण और पूर्ण-स्क्रीन लॉकडाउन सक्षम हैं।",
            "content_ml": "എല്ലാ ഔദ്യോഗിക പരീക്ഷകൾക്കും വെബ്‌ക്യാം, ഓഡിയോ ലെവൽ വിശകലനം, പൂർണ്ണ സ്‌ക്രീൻ ലോക്ക്ഡൗൺ എന്നിവ പ്രവർത്തനക്ഷമമാക്കിയിരിക്കുന്നു.",
            "content_kn": "ಎಲ್ಲಾ ಅಧಿಕೃತ ಪರೀಕ್ಷೆಗಳಿಗಾಗಿ ವೆಬ್‌ಕ್ಯಾಮ್, ಆಡಿಯೊ ಮಟ್ಟದ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಪೂರ್ಣ-ಪರದೆಯ ಲಾಕ್‌ಡೌನ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ.",
            "date": "2026-09-01",
            "tag_en": "Important",
            "tag_ta": "முக்கியமானது",
            "tag_te": "ముఖ్యం",
            "tag_hi": "महत्वपूर्ण",
            "tag_ml": "പ്രധാനം",
            "tag_kn": "ಮುಖ್ಯವಾದದ್ದು"
        },
        {
            "id": 2,
            "title_en": "Faculty Audit & Scorecard Release Policy",
            "title_ta": "பேராசிரியர் தணிக்கை & மதிப்பெண் அட்டை வெளியீட்டுக் கொள்கை",
            "title_te": "ఫ్యాకల్టీ ఆడిట్ & స్కోర్‌కార్డ్ విడుదల విధానం",
            "title_hi": "संकाय ऑडिट और स्कोरकार्ड जारी करने की नीति",
            "title_ml": "ഫാക്കൽറ്റി ഓഡിറ്റും സ്കോർകാർഡ് റിലീസ് നയവും",
            "title_kn": "ಅಧ್ಯಾಪಕರ ಲೆಕ್ಕಪರಿಶೋಧನೆ ಮತ್ತು ಸ್ಕೋರ್‌ಕಾರ್ಡ್ ಬಿಡುಗಡೆ ನೀತಿ",
            "content_en": "Submitted exam scorecards and detailed solutions are published directly to your portal upon faculty examiner verification.",
            "content_ta": "சமர்ப்பிக்கப்பட்ட தேர்வு மதிப்பெண் அட்டைகள் மற்றும் விரிவான விடைகள் பேராசிரியர் தேர்வாளர் சரிபார்த்தவுடன் உங்கள் தளத்தில் நேரடியாக வெளியிடப்படும்.",
            "content_te": "సమర్పించిన పరీక్ష స్కోర్‌కార్డ్‌లు మరియు వివరణాత్మక పరిష్కారాలు ఫ్యాకల్టీ ఎగ్జామినర్ ధృవీకరణ తర్వాత నేరుగా మీ పోర్టల్‌లో ప్రచురించబడతాయి.",
            "content_hi": "जमा किए गए परीक्षा स्कोरकार्ड और विस्तृत समाधान संकाय परीक्षक सत्यापन के बाद सीधे आपके पोर्टल पर प्रकाशित किए जाते हैं।",
            "content_ml": "സമർപ്പിച്ച പരീക്ഷാ സ്കോർകാർഡുകളും വിശദമായ പരിഹാരങ്ങളും ഫാക്കൽറ്റി എക്സാമിനറുടെ പരിശോധനയ്ക്ക് ശേഷം നേരിട്ട് നിങ്ങളുടെ പോർട്ടലിൽ പ്രസിദ്ധീകരിക്കും.",
            "content_kn": "ಸಲ್ಲಿಸಿದ ಪರೀಕ್ಷೆಯ ಸ್ಕೋರ್‌ಕಾರ್ಡ್‌ಗಳು ಮತ್ತು ವಿವರವಾದ ಪರಿಹಾರಗಳನ್ನು ಅಧ್ಯಾಪಕ ಪರೀಕ್ಷಕರ ಪರಿಶೀಲನೆಯ ನಂತರ ನೇರವಾಗಿ ನಿಮ್ಮ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪ್ರಕಟಿಸಲಾಗುತ್ತದೆ.",
            "date": "2026-09-02",
            "tag_en": "Examinations",
            "tag_ta": "தேர்வுகள்",
            "tag_te": "పరీక్షలు",
            "tag_hi": "परीक्षाएं",
            "tag_ml": "പരീക്ഷകൾ",
            "tag_kn": "ಪರೀಕ್ಷೆಗಳು"
        }
    ]

    announcements = []
    for ann in announcements_catalog:
        announcements.append({
            "id": ann["id"],
            "title": ann.get(f"title_{language}") or ann["title_en"],
            "content": ann.get(f"content_{language}") or ann["content_en"],
            "tag": ann.get(f"tag_{language}") or ann["tag_en"],
            "title_en": ann["title_en"],
            "title_ta": ann["title_ta"],
            "title_te": ann["title_te"],
            "title_hi": ann["title_hi"],
            "title_ml": ann["title_ml"],
            "title_kn": ann["title_kn"],
            "content_en": ann["content_en"],
            "content_ta": ann["content_ta"],
            "content_te": ann["content_te"],
            "content_hi": ann["content_hi"],
            "content_ml": ann["content_ml"],
            "content_kn": ann["content_kn"],
            "tag_en": ann["tag_en"],
            "tag_ta": ann["tag_ta"],
            "tag_te": ann["tag_te"],
            "tag_hi": ann["tag_hi"],
            "tag_ml": ann["tag_ml"],
            "tag_kn": ann["tag_kn"],
            "date": ann["date"]
        })

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
    language: Optional[str] = Query("en", description="Requested student language code (en, ta, te, hi, ml, kn)"),
    current_user: User = Depends(require_approved_student),
    db: Session = Depends(get_db)
):
    """
    Get all past examination scorecards and proctoring summaries for current student in chosen language.
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
            "exam_title": resolve_multilingual_field(res.exam, "title", language) if res.exam else f"Exam #{res.exam_id}",
            "exam_subject": resolve_multilingual_field(res.exam, "subject", language) if res.exam else "General",
            "exam_title_en": getattr(res.exam, "title_en", None) or (res.exam.title if res.exam else f"Exam #{res.exam_id}"),
            "exam_title_ta": getattr(res.exam, "title_ta", None),
            "exam_title_te": getattr(res.exam, "title_te", None),
            "exam_title_hi": getattr(res.exam, "title_hi", None),
            "exam_title_ml": getattr(res.exam, "title_ml", None),
            "exam_title_kn": getattr(res.exam, "title_kn", None),
            "exam_subject_en": getattr(res.exam, "subject_en", None) or (res.exam.subject if res.exam else "General"),
            "exam_subject_ta": getattr(res.exam, "subject_ta", None),
            "exam_subject_te": getattr(res.exam, "subject_te", None),
            "exam_subject_hi": getattr(res.exam, "subject_hi", None),
            "exam_subject_ml": getattr(res.exam, "subject_ml", None),
            "exam_subject_kn": getattr(res.exam, "subject_kn", None),
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
