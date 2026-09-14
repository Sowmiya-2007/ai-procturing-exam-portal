import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from app.enums.enums import (
    UserRole, ApprovalStatus, QuestionType, DifficultyLevel, ExamStatus,
    SessionStatus, ProctorEventType
)

# --- Auth Schemas ---

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    register_number: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    year: Optional[str] = Field(None, max_length=50)
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None
    role: UserRole = UserRole.STUDENT

class StudentRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    register_number: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    year: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Register Number")
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    approval_status: ApprovalStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Admin & Examiner Management Schemas ---

class ExaminerRejectRequest(BaseModel):
    rejection_reason: Optional[str] = Field(None, description="Reason for rejecting the examiner")

class ExaminerApprovalResponse(BaseModel):
    message: str
    examiner_id: int
    approval_status: ApprovalStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

class ExaminerDetailResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    approval_status: ApprovalStatus
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudentApprovalRequest(BaseModel):
    status: ApprovalStatus
    rejection_reason: Optional[str] = None

class AdminStatsResponse(BaseModel):
    total_students: int
    pending_approvals: int
    approved_students: int
    rejected_students: int
    total_examiners: int
    pending_examiners: int
    approved_examiners: int
    rejected_examiners: int
    total_questions: int
    department_counts: Dict[str, int] = Field(default_factory=dict)
    recent_registrations: List[UserResponse] = Field(default_factory=list)

# --- Question Schemas ---

class QuestionOptionBase(BaseModel):
    option_text: str
    is_correct: bool = False

class QuestionOptionCreate(QuestionOptionBase):
    pass

class QuestionOptionResponse(QuestionOptionBase):
    id: int
    question_id: int

    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=5)
    question_type: QuestionType
    subject: str = Field(..., min_length=2)
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    marks: float = Field(default=1.0, ge=0.5)
    negative_marks: float = Field(default=0.0, ge=0.0)
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    evaluation_guidelines: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = Field(default_factory=list)
    replace_question_id: Optional[int] = Field(None, description="If replacing an existing duplicate question")
    skip: Optional[bool] = Field(False, description="Whether to skip this item during batch import")

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[QuestionType] = None
    subject: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    marks: Optional[float] = None
    negative_marks: Optional[float] = None
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    evaluation_guidelines: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None

class QuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: QuestionType
    subject: str
    difficulty: DifficultyLevel
    marks: float
    negative_marks: float
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    evaluation_guidelines: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    options: List[QuestionOptionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class QuestionStatsResponse(BaseModel):
    total_questions: int
    mcq_count: int
    multi_select_count: int
    subjective_count: int
    image_upload_count: int
    by_difficulty: Dict[str, int] = Field(default_factory=dict)
    by_subject: Dict[str, int] = Field(default_factory=dict)

class AIGenerateQuestionRequest(BaseModel):
    topic: str
    subject: str
    question_type: QuestionType
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM

class RandomQuestionsRequest(BaseModel):
    subject: Optional[str] = None
    question_count: int = Field(default=5, ge=1, le=50)
    difficulty: Optional[DifficultyLevel] = None
    question_type: Optional[QuestionType] = None

# --- Document Extraction & Batch Import Schemas ---

class ExtractedOption(BaseModel):
    option_text: str
    is_correct: bool = False
    label: Optional[str] = None  # 'A', 'B', 'C', 'D'

class ExtractedQuestion(BaseModel):
    question_text: str
    question_type: QuestionType = QuestionType.MCQ
    subject: str = "General"
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    marks: float = 1.0
    negative_marks: float = 0.0
    answer_key: Optional[str] = None
    correctAnswer: Optional[str] = None  # Explicit standard camelCase field for frontend & AI compatibility
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    evaluation_guidelines: Optional[str] = None
    rubric: Optional[str] = None  # Alias for evaluation_guidelines
    options: List[ExtractedOption] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    is_valid: bool = True
    is_duplicate: bool = False
    duplicate_question_id: Optional[int] = None
    duplicate_question_text: Optional[str] = None
    duplicate_action: Optional[str] = "IMPORT"  # 'IMPORT', 'SKIP', 'REPLACE'
    answer_status: Optional[str] = "DETECTED"   # 'DETECTED', 'NOT_DETECTED'

    def model_post_init(self, __context):
        # Synchronize answer_key and correctAnswer
        if self.answer_key and not self.correctAnswer:
            self.correctAnswer = self.answer_key
        elif self.correctAnswer and not self.answer_key:
            self.answer_key = self.correctAnswer

        # Synchronize evaluation_guidelines and rubric
        if self.evaluation_guidelines and not self.rubric:
            self.rubric = self.evaluation_guidelines
        elif self.rubric and not self.evaluation_guidelines:
            self.evaluation_guidelines = self.rubric

class DocumentExtractionResponse(BaseModel):
    success: bool
    source_format: str
    filename: Optional[str] = None
    extracted_count: int
    valid_count: int
    warning_count: int
    duplicate_count: int = 0
    questions: List[ExtractedQuestion] = Field(default_factory=list)
    message: str

class TextExtractionRequest(BaseModel):
    raw_text: str = Field(..., min_length=5, description="Raw exam question text to extract")
    default_subject: Optional[str] = "Computer Science & Engineering"
    default_difficulty: Optional[DifficultyLevel] = DifficultyLevel.MEDIUM
    default_marks: Optional[float] = 1.0

class BatchQuestionCreateRequest(BaseModel):
    questions: List[QuestionCreate] = Field(..., min_length=1, description="List of verified questions to batch insert")

class BatchQuestionCreateResponse(BaseModel):
    success: bool
    created_count: int
    updated_count: int = 0
    skipped_count: int = 0
    questions: List[QuestionResponse] = Field(default_factory=list)
    message: str

# --- Exam Schemas ---

class ExamQuestionLink(BaseModel):
    question_id: int
    marks: Optional[float] = None
    order: Optional[int] = 1

class ExamQuestionResponse(BaseModel):
    id: int
    exam_id: int
    question_id: int
    marks: float
    order: int
    question: Optional[QuestionResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ExamCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    subject: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    duration_minutes: int = Field(default=60, ge=5)
    total_marks: float = Field(default=100.0, ge=1.0)
    passing_marks: float = Field(default=40.0, ge=0.0)
    status: ExamStatus = ExamStatus.DRAFT
    difficulty_distribution: Optional[str] = None
    type_distribution: Optional[str] = None
    proctoring_config: Optional[str] = None
    proctoring_enabled: Optional[bool] = True
    webcam_monitoring_enabled: Optional[bool] = True
    gaze_tracking_enabled: Optional[bool] = True
    max_tab_switch_warnings: Optional[int] = 3
    questions: Optional[List[ExamQuestionLink]] = Field(default_factory=list)

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    status: Optional[ExamStatus] = None
    difficulty_distribution: Optional[str] = None
    type_distribution: Optional[str] = None
    proctoring_config: Optional[str] = None
    proctoring_enabled: Optional[bool] = None
    webcam_monitoring_enabled: Optional[bool] = None
    gaze_tracking_enabled: Optional[bool] = None
    max_tab_switch_warnings: Optional[int] = None

class ExamResponse(BaseModel):
    id: int
    title: str
    subject: str
    description: Optional[str] = None
    duration_minutes: int
    total_marks: float
    passing_marks: float
    status: ExamStatus
    difficulty_distribution: Optional[str] = None
    type_distribution: Optional[str] = None
    proctoring_config: Optional[str] = None
    proctoring_enabled: Optional[bool] = True
    webcam_monitoring_enabled: Optional[bool] = True
    gaze_tracking_enabled: Optional[bool] = True
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    questions_count: Optional[int] = 0
    enrolled_count: Optional[int] = 0
    completed_count: Optional[int] = 0
    in_progress_count: Optional[int] = 0
    exam_questions: Optional[List[ExamQuestionResponse]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# --- Exam Taking, Session & AI Proctoring Schemas ---

class QuestionOptionSanitized(BaseModel):
    id: int
    question_id: int
    option_text: str

    model_config = ConfigDict(from_attributes=True)

class ExamQuestionSanitized(BaseModel):
    id: int
    question_id: int
    order: int
    marks: float
    question_text: str
    question_type: QuestionType
    subject: str
    difficulty: DifficultyLevel
    negative_marks: float
    options: List[QuestionOptionSanitized] = Field(default_factory=list)

class StudentAnswerPayload(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    text_answer: Optional[str] = None
    image_url: Optional[str] = None

class ExamSessionStartResponse(BaseModel):
    session_id: int
    session_token: str
    exam_id: int
    exam_title: str
    exam_subject: str
    exam_description: Optional[str] = None
    duration_minutes: int
    total_marks: float
    passing_marks: float
    started_at: datetime
    status: SessionStatus
    questions_count: int
    questions: List[ExamQuestionSanitized] = Field(default_factory=list)
    existing_answers: Dict[str, Any] = Field(default_factory=dict)
    proctoring_enabled: bool = True

class SaveAnswerRequest(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    text_answer: Optional[str] = None
    image_url: Optional[str] = None

class SaveAnswerResponse(BaseModel):
    success: bool
    answer_id: int
    question_id: int
    saved_at: datetime
    message: str = "Answer saved successfully"

class ProctorEventCreate(BaseModel):
    event_type: ProctorEventType
    details: Optional[str] = None
    timestamp: Optional[datetime] = None

class ProctorEventResponse(BaseModel):
    id: int
    session_id: int
    event_type: ProctorEventType
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SubmitExamRequest(BaseModel):
    final_confirmation: bool = True

class QuestionResultBreakdown(BaseModel):
    question_id: int
    order: int
    question_text: str
    question_type: QuestionType
    subject: str
    difficulty: DifficultyLevel
    marks_possible: float
    marks_awarded: float
    selected_option_ids: Optional[List[int]] = None
    text_answer: Optional[str] = None
    image_url: Optional[str] = None
    correct_option_ids: Optional[List[int]] = None
    options: List[Dict[str, Any]] = Field(default_factory=list)
    model_answer: Optional[str] = None
    evaluation_guidelines: Optional[str] = None
    is_correct: Optional[bool] = None
    ai_feedback: Optional[str] = None

class ProctoringSummary(BaseModel):
    total_events: int
    integrity_score: float
    violations_count: int
    events_breakdown: Dict[str, int] = Field(default_factory=dict)
    recent_events: List[ProctorEventResponse] = Field(default_factory=list)

class ExamResultDetailResponse(BaseModel):
    result_id: Optional[int] = None
    session_id: int
    session_token: str
    exam_id: int
    exam_title: str
    exam_subject: str
    student_id: int
    student_name: str
    student_register_number: Optional[str] = None
    student_department: Optional[str] = None
    total_marks: float
    obtained_marks: float
    percentage: float
    passed: bool
    status: SessionStatus
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    duration_spent_seconds: Optional[int] = None
    questions_count: int
    answered_count: int
    correct_count: int
    question_breakdown: List[QuestionResultBreakdown] = Field(default_factory=list)
    proctoring_summary: ProctoringSummary
    
    # Approval status
    is_approved: bool = False
    approved_at: Optional[datetime] = None
    approved_by_name: Optional[str] = None
    approval_notes: Optional[str] = None

class StudentExamSubmissionListItem(BaseModel):
    session_id: int
    session_token: str
    exam_id: int
    exam_title: str
    exam_subject: str
    student_id: int
    student_name: str
    student_email: str
    student_register_number: Optional[str] = None
    student_department: Optional[str] = None
    total_marks: float
    obtained_marks: float
    percentage: float
    passed: bool
    status: SessionStatus
    submitted_at: Optional[datetime] = None
    violations_count: int
    integrity_score: float
    
    # Approval status
    is_approved: bool = False
    approved_at: Optional[datetime] = None
    approved_by_name: Optional[str] = None
    approval_notes: Optional[str] = None

class ApproveResultRequest(BaseModel):
    notes: Optional[str] = None

class GradeOverrideRequest(BaseModel):
    marks_awarded: float = Field(..., ge=0.0)
    feedback: Optional[str] = None

class EnrolledStudentResponse(BaseModel):
    student_id: int
    student_name: str
    student_email: str
    student_register_number: Optional[str] = None
    student_department: Optional[str] = None
    student_year: Optional[str] = None
    exam_id: int
    exam_title: str
    exam_subject: str
    duration_minutes: int
    session_id: Optional[int] = None
    session_token: Optional[str] = None
    status: str # "NOT_STARTED", "IN_PROGRESS", "SUBMITTED"
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    total_marks: float = 0.0
    obtained_marks: Optional[float] = None
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    violations_count: int = 0
    integrity_score: float = 100.0

class EnrolledStudentsSummaryResponse(BaseModel):
    total_enrolled: int
    completed_count: int
    in_progress_count: int
    not_started_count: int
    students: List[EnrolledStudentResponse]

