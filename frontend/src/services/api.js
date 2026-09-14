const rawBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001/api";
const API_BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase.replace(/\/$/, "")}/api`;

const getHeaders = () => {
  const token = localStorage.getItem("exam_ai_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // --- Auth ---
  register: async (payload) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed");
    return data;
  },

  login: async (identifier, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    return data;
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Session expired");
    return data;
  },

  forgotPassword: async (identifier) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  },

  // --- Admin ---
  getAdminStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch stats");
    return data;
  },

  getStudents: async ({ search, department, status } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (department && department !== "ALL") params.append("department", department);
    if (status && status !== "ALL") params.append("status", status);

    const res = await fetch(`${API_BASE}/admin/students?${params.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch students");
    return data;
  },

  getStudentDetails: async (id) => {
    const res = await fetch(`${API_BASE}/admin/students/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load student details");
    return data;
  },

  approveStudent: async (id) => {
    const res = await fetch(`${API_BASE}/admin/students/${id}/approve`, {
      method: "POST",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Approval failed");
    return data;
  },

  rejectStudent: async (id, rejection_reason) => {
    const res = await fetch(`${API_BASE}/admin/students/${id}/reject`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ rejection_reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Rejection failed");
    return data;
  },

  // --- Questions ---
  getQuestionStats: async () => {
    const res = await fetch(`${API_BASE}/questions/stats`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch question stats");
    return data;
  },

  getQuestions: async ({ subject, question_type, difficulty, min_marks, max_marks, search } = {}) => {
    const params = new URLSearchParams();
    if (subject && subject !== "ALL") params.append("subject", subject);
    if (question_type && question_type !== "ALL") params.append("question_type", question_type);
    if (difficulty && difficulty !== "ALL") params.append("difficulty", difficulty);
    if (min_marks) params.append("min_marks", min_marks);
    if (max_marks) params.append("max_marks", max_marks);
    if (search) params.append("search", search);

    const res = await fetch(`${API_BASE}/questions?${params.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch questions");
    return data;
  },

  getQuestion: async (id) => {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Question not found");
    return data;
  },

  createQuestion: async (payload) => {
    const res = await fetch(`${API_BASE}/questions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to create question");
    return data;
  },

  updateQuestion: async (id, payload) => {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update question");
    return data;
  },

  deleteQuestion: async (id) => {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to delete question");
    return data;
  },

  aiGenerateQuestion: async (payload) => {
    const res = await fetch(`${API_BASE}/questions/ai-generate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to generate AI question");
    return data;
  },

  extractQuestionsFromDocument: async (formData) => {
    const token = localStorage.getItem("exam_ai_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/questions/extract-document`, {
      method: "POST",
      headers: headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to extract questions from document");
    return data;
  },

  extractQuestionsFromText: async (payload) => {
    const res = await fetch(`${API_BASE}/questions/extract-text`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to extract questions from text");
    return data;
  },

  batchCreateQuestions: async (payload) => {
    const res = await fetch(`${API_BASE}/questions/batch-create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to batch create questions");
    return data;
  },

  downloadQuestionTemplate: async (type = "excel") => {
    const token = localStorage.getItem("exam_ai_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/questions/templates/${type}`, {
      headers: headers
    });
    if (!res.ok) throw new Error("Failed to download question template");
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const extension = type === "excel" ? "xlsx" : type === "word" ? "docx" : "csv";
    a.download = `Exam_Question_Bank_Template.${extension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // --- Examiner Management (Admin APIs) ---
  getPendingExaminers: async () => {
    const res = await fetch(`${API_BASE}/admin/examiners/pending`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch pending examiners");
    return data;
  },

  getExaminers: async ({ search, status } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "ALL") params.append("status", status);

    const res = await fetch(`${API_BASE}/admin/examiners?${params.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch examiners");
    return data;
  },

  getExaminerDetails: async (id) => {
    const res = await fetch(`${API_BASE}/admin/examiners/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load examiner details");
    return data;
  },

  approveExaminer: async (id) => {
    const res = await fetch(`${API_BASE}/admin/examiners/${id}/approve`, {
      method: "PUT",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Examiner approval failed");
    return data;
  },

  rejectExaminer: async (id, rejection_reason) => {
    const res = await fetch(`${API_BASE}/admin/examiners/${id}/reject`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ rejection_reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Examiner rejection failed");
    return data;
  },

  // --- Exams ---
  getRandomQuestions: async (payload) => {
    const res = await fetch(`${API_BASE}/exams/random-questions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch random questions");
    return data;
  },

  getExams: async ({ subject, status, search } = {}) => {
    const params = new URLSearchParams();
    if (subject && subject !== "ALL") params.append("subject", subject);
    if (status && status !== "ALL") params.append("status", status);
    if (search) params.append("search", search);

    const res = await fetch(`${API_BASE}/exams?${params.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch exams");
    return data;
  },

  getExam: async (id) => {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch exam");
    return data;
  },

  createExam: async (payload) => {
    const res = await fetch(`${API_BASE}/exams`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to create exam");
    return data;
  },

  updateExam: async (id, payload) => {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update exam");
    return data;
  },

  toggleExamStatus: async (id) => {
    const res = await fetch(`${API_BASE}/exams/${id}/toggle-status`, {
      method: "POST",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to toggle exam status");
    return data;
  },

  deleteExam: async (id) => {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to delete exam");
    return data;
  },

  addQuestionToExam: async (examId, payload) => {
    const res = await fetch(`${API_BASE}/exams/${examId}/questions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to add question to exam");
    return data;
  },

  // --- Enrolled Students ---
  getExamEnrolledStudents: async (examId, { search, status } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "ALL") params.append("status", status);

    const res = await fetch(`${API_BASE}/exams/${examId}/enrolled-students?${params.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch enrolled students");
    return data;
  },

  getAllEnrolledStudents: async ({ exam_id, search, status, department } = {}) => {
    const params = new URLSearchParams();
    if (exam_id && exam_id !== "ALL") params.append("exam_id", exam_id);
    if (search) params.append("search", search);
    if (status && status !== "ALL") params.append("status", status);
    if (department && department !== "ALL") params.append("department", department);

    const res = await fetch(`${API_BASE}/exams/enrolled-students/all?${params.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch enrolled students");
    return data;
  },

  // --- Student & Exam Sessions ---
  getStudentDashboard: async () => {
    const res = await fetch(`${API_BASE}/student/dashboard`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load student dashboard");
    return data;
  },

  getStudentResults: async () => {
    const res = await fetch(`${API_BASE}/student/results`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load student results");
    return data;
  },

  startExamSession: async (examId) => {
    const res = await fetch(`${API_BASE}/exams/${examId}/start`, {
      method: "POST",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to start exam session");
    return data;
  },

  getActiveSession: async (sessionToken) => {
    const res = await fetch(`${API_BASE}/exams/sessions/${sessionToken}/active`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load exam session");
    return data;
  },

  saveSessionAnswer: async (sessionToken, payload) => {
    const res = await fetch(`${API_BASE}/exams/sessions/${sessionToken}/answers`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to save answer");
    return data;
  },

  logProctorEvent: async (sessionToken, payload) => {
    const res = await fetch(`${API_BASE}/exams/sessions/${sessionToken}/proctor-event`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to log proctor event");
    return data;
  },

  submitExamSession: async (sessionToken, payload = { final_confirmation: true }) => {
    const res = await fetch(`${API_BASE}/exams/sessions/${sessionToken}/submit`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to submit exam");
    return data;
  },

  getSessionResult: async (sessionToken) => {
    const res = await fetch(`${API_BASE}/exams/sessions/${sessionToken}/result`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load exam result");
    return data;
  },

  getExamSubmissions: async (examId) => {
    const res = await fetch(`${API_BASE}/exams/${examId}/submissions`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load exam submissions");
    return data;
  },

  overrideAnswerGrade: async (answerId, payload) => {
    const res = await fetch(`${API_BASE}/exams/answers/${answerId}/grade`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to override grade");
    return data;
  },

  approveSessionResult: async (sessionToken, payload = {}) => {
    const res = await fetch(`${API_BASE}/exams/sessions/${sessionToken}/approve-result`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to approve result");
    return data;
  },

  approveAllExamResults: async (examId, payload = {}) => {
    const res = await fetch(`${API_BASE}/exams/${examId}/approve-all-results`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to batch approve results");
    return data;
  }
};

