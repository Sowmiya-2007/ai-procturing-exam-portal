from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.user import User
from app.models.question import Question
from app.enums.enums import UserRole, ApprovalStatus
from schemas import (
    UserResponse, AdminStatsResponse, StudentApprovalRequest, 
    ExaminerApprovalResponse, ExaminerRejectRequest, ExaminerDetailResponse
)
from auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Management"], dependencies=[Depends(require_admin)])

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(db: Session = Depends(get_db)):
    students_query = db.query(User).filter(User.role == UserRole.STUDENT)
    examiners_query = db.query(User).filter(User.role == UserRole.EXAMINER)
    
    total_students = students_query.count()
    pending_approvals = students_query.filter(User.approval_status == ApprovalStatus.PENDING).count()
    approved_students = students_query.filter(User.approval_status == ApprovalStatus.APPROVED).count()
    rejected_students = students_query.filter(User.approval_status == ApprovalStatus.REJECTED).count()

    total_examiners = examiners_query.count()
    pending_examiners = examiners_query.filter(User.approval_status == ApprovalStatus.PENDING).count()
    approved_examiners = examiners_query.filter(User.approval_status == ApprovalStatus.APPROVED).count()
    rejected_examiners = examiners_query.filter(User.approval_status == ApprovalStatus.REJECTED).count()
    
    total_questions = db.query(Question).count()
    department_counts: dict = {}

    # Recent 5 registrations
    recent_registrations = db.query(User).order_by(User.created_at.desc()).limit(5).all()

    return {
        "total_students": total_students,
        "pending_approvals": pending_approvals,
        "approved_students": approved_students,
        "rejected_students": rejected_students,
        "total_examiners": total_examiners,
        "pending_examiners": pending_examiners,
        "approved_examiners": approved_examiners,
        "rejected_examiners": rejected_examiners,
        "total_questions": total_questions,
        "department_counts": department_counts,
        "recent_registrations": recent_registrations
    }

# --- Examiner Management APIs ---

@router.get("/examiners/pending", response_model=List[UserResponse])
def get_pending_examiners(db: Session = Depends(get_db)):
    """
    Returns all examiner accounts whose status is PENDING.
    """
    pending_examiners = db.query(User).filter(
        User.role == UserRole.EXAMINER,
        User.approval_status == ApprovalStatus.PENDING
    ).order_by(User.created_at.desc()).all()
    return pending_examiners

@router.get("/examiners", response_model=List[UserResponse])
def list_examiners(
    search: Optional[str] = Query(None, description="Search by name or email"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, APPROVED, REJECTED, ALL)"),
    db: Session = Depends(get_db)
):
    """
    Returns examiners with their approval status.
    """
    query = db.query(User).filter(User.role == UserRole.EXAMINER)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    if status and status.upper() != "ALL":
        try:
            status_enum = ApprovalStatus(status.upper())
            query = query.filter(User.approval_status == status_enum)
        except ValueError:
            pass

    return query.order_by(User.created_at.desc()).all()

@router.get("/examiners/{examiner_id}", response_model=UserResponse)
def get_examiner(examiner_id: int, db: Session = Depends(get_db)):
    examiner = db.query(User).filter(User.id == examiner_id, User.role == UserRole.EXAMINER).first()
    if not examiner:
        raise HTTPException(status_code=404, detail="Examiner not found.")
    return examiner

@router.put("/examiners/{examiner_id}/approve", response_model=dict)
@router.post("/examiners/{examiner_id}/approve", response_model=dict)
def approve_examiner(
    examiner_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Approves an examiner account.
    Sets: approval_status = APPROVED, approved_by = current_admin_id, approved_at = current_timestamp
    """
    examiner = db.query(User).filter(User.id == examiner_id, User.role == UserRole.EXAMINER).first()
    if not examiner:
        raise HTTPException(status_code=404, detail="Examiner not found.")

    examiner.approval_status = ApprovalStatus.APPROVED
    examiner.approved_by = current_admin.id
    examiner.approved_at = datetime.now(timezone.utc)
    examiner.rejection_reason = None

    db.commit()
    db.refresh(examiner)

    app_at = examiner.approved_at
    return {
        "message": "Examiner approved successfully",
        "examiner_id": examiner.id,
        "approval_status": "APPROVED",
        "approved_by": examiner.approved_by,
        "approved_at": app_at.isoformat() if app_at is not None else None
    }

@router.put("/examiners/{examiner_id}/reject", response_model=dict)
@router.post("/examiners/{examiner_id}/reject", response_model=dict)
def reject_examiner(
    examiner_id: int,
    payload: Optional[ExaminerRejectRequest] = None,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Rejects an examiner account.
    Sets: approval_status = REJECTED, rejection_reason = provided_reason, approved_by = current_admin_id, approved_at = current_timestamp
    """
    examiner = db.query(User).filter(User.id == examiner_id, User.role == UserRole.EXAMINER).first()
    if not examiner:
        raise HTTPException(status_code=404, detail="Examiner not found.")

    reason = (payload.rejection_reason if payload and payload.rejection_reason else "Qualifications verification did not satisfy faculty examination board requirements.")

    examiner.approval_status = ApprovalStatus.REJECTED
    examiner.rejection_reason = reason.strip()
    examiner.approved_by = current_admin.id
    examiner.approved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(examiner)

    rej_at = examiner.approved_at
    return {
        "message": "Examiner rejected successfully",
        "examiner_id": examiner.id,
        "approval_status": "REJECTED",
        "rejection_reason": examiner.rejection_reason,
        "approved_by": examiner.approved_by,
        "approved_at": rej_at.isoformat() if rej_at is not None else None
    }

# --- Student Management APIs ---

@router.get("/students", response_model=List[UserResponse])
def list_students(
    search: Optional[str] = Query(None, description="Search by name or email"),
    status: Optional[str] = Query(None, description="Filter by approval status (PENDING, APPROVED, REJECTED, ALL)"),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == UserRole.STUDENT)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    if status and status.upper() != "ALL":
        try:
            status_enum = ApprovalStatus(status.upper())
            query = query.filter(User.approval_status == status_enum)
        except ValueError:
            pass

    return query.order_by(User.created_at.desc()).all()

@router.get("/students/{student_id}", response_model=UserResponse)
def get_student_details(student_id: int, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student

@router.post("/students/{student_id}/approve", response_model=UserResponse)
@router.put("/students/{student_id}/approve", response_model=UserResponse)
def approve_student(
    student_id: int, 
    current_admin: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.approval_status = ApprovalStatus.APPROVED
    student.approved_by = current_admin.id
    student.approved_at = datetime.utcnow()
    student.rejection_reason = None
    db.commit()
    db.refresh(student)
    return student

@router.post("/students/{student_id}/reject", response_model=UserResponse)
@router.put("/students/{student_id}/reject", response_model=UserResponse)
def reject_student(
    student_id: int, 
    payload: Optional[dict] = None, 
    current_admin: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    rejection_reason = (payload.get("rejection_reason") if payload else "") or "Registration details did not match official college records."

    student.approval_status = ApprovalStatus.REJECTED
    student.rejection_reason = rejection_reason.strip()
    student.approved_by = current_admin.id
    student.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(student)
    return student

