import os
import sys
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.enums.enums import UserRole, ApprovalStatus
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required."
        )
    return current_user

def require_approved_examiner(current_user: User = Depends(get_current_user)) -> User:
    """
    Reusable dependency enforcing that the user is authenticated, has the EXAMINER role
    (or ADMIN privileges), and is APPROVED.
    - If EXAMINER with PENDING status -> 403: 'Your examiner account is awaiting admin approval.'
    - If EXAMINER with REJECTED status -> 403: 'Your examiner account has been rejected. Please contact the administrator.'
    - If EXAMINER with APPROVED status -> Returns user.
    - If ADMIN -> Returns user.
    - If other role (e.g. STUDENT) -> 403: 'Access forbidden: Examiner privileges required.'
    """
    if current_user.role == UserRole.ADMIN:
        return current_user
    
    if current_user.role == UserRole.EXAMINER:
        if current_user.approval_status == ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your examiner account is awaiting admin approval."
            )
        elif current_user.approval_status == ApprovalStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your examiner account has been rejected. Please contact the administrator."
            )
        elif current_user.approval_status == ApprovalStatus.APPROVED:
            return current_user
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your examiner account is not approved."
            )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access forbidden: Examiner privileges required."
    )

def require_examiner_or_admin(current_user: User = Depends(require_approved_examiner)) -> User:
    return current_user

def require_approved_student(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role == UserRole.STUDENT and current_user.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Your student account has not been approved."
        )
    return current_user
