import enum

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    EXAMINER = "EXAMINER"
    ADMIN = "ADMIN"

class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class QuestionType(str, enum.Enum):
    MCQ = "MCQ"
    MULTI_SELECT = "MULTI_SELECT"
    SHORT_ANSWER = "SHORT_ANSWER"
    LONG_ANSWER = "LONG_ANSWER"
    IMAGE_UPLOAD = "IMAGE_UPLOAD"

class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"

class SessionStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"

class ProctorEventType(str, enum.Enum):
    FACE_ABSENT = "FACE_ABSENT"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    GAZE_AWAY = "GAZE_AWAY"
    HEAD_TURN = "HEAD_TURN"
    TAB_SWITCH = "TAB_SWITCH"
    WINDOW_BLUR = "WINDOW_BLUR"
    WINDOW_FOCUS = "WINDOW_FOCUS"
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"
    COPY_ATTEMPT = "COPY_ATTEMPT"
    PASTE_ATTEMPT = "PASTE_ATTEMPT"
    CUT_ATTEMPT = "CUT_ATTEMPT"
    RIGHT_CLICK_ATTEMPT = "RIGHT_CLICK_ATTEMPT"
