from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.user import User
from app.enums.enums import UserRole, ApprovalStatus
from schemas import RegisterRequest, StudentRegisterRequest, LoginRequest, TokenResponse, UserResponse
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    # Disallow direct admin registration
    if payload.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Direct administrator registration is restricted. Please contact the system administrator."
        )

    # Check if email exists
    existing_email = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Determine initial approval status based on role:
    # - STUDENT: APPROVED (Active immediately)
    # - EXAMINER: PENDING (Requires Admin Approval)
    if payload.role == UserRole.EXAMINER:
        initial_status = ApprovalStatus.PENDING
        message = "Your examiner registration has been submitted and is pending administrator approval."
    elif payload.role == UserRole.STUDENT:
        initial_status = ApprovalStatus.APPROVED
        message = "Student registration successful. Your account is active."
    else:
        initial_status = ApprovalStatus.APPROVED
        message = "Registration successful."

    new_user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        approval_status=initial_status,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": message,
        "user_id": new_user.id,
        "role": new_user.role,
        "status": new_user.approval_status
    }

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip().lower()
    
    # Search by email
    user = db.query(User).filter(User.email == identifier).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Email/Register Number or Password."
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Email/Register Number or Password."
        )

    # For students, enforce account status if PENDING or REJECTED
    if user.role == UserRole.STUDENT:
        if user.approval_status == ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is waiting for Admin approval."
            )
        elif user.approval_status == ApprovalStatus.REJECTED:
            detail_msg = "Your registration was not approved. Please contact the administrator."
            if user.rejection_reason:
                detail_msg += f" (Reason: {user.rejection_reason})"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg
            )

    # For examiners, enforce account status: ONLY APPROVED EXAMINERS CAN LOGIN
    if user.role == UserRole.EXAMINER:
        if user.approval_status == ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your examiner account is pending admin approval. Status: PENDING."
            )
        elif user.approval_status == ApprovalStatus.REJECTED:
            detail_msg = "Your examiner registration was not approved. Status: REJECTED."
            if user.rejection_reason:
                detail_msg += f" (Reason: {user.rejection_reason})"
            else:
                detail_msg += " Please contact the administrator."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg
            )
        elif user.approval_status != ApprovalStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your examiner account is not approved."
            )

    # Generate JWT token
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(payload: dict, db: Session = Depends(get_db)):
    identifier = payload.get("identifier", "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Please provide your registered Email or Register Number.")
    
    user = db.query(User).filter(User.email == identifier.lower()).first()

    if not user:
        return {
            "message": "If an account exists with this identifier, password reset instructions have been dispatched or logged for administrator verification."
        }
    
    return {
        "message": f"Password reset request received for {user.name}. Please contact your college administrator or check your institutional email."
    }
