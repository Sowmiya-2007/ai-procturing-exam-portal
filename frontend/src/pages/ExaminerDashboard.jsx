import React, { useState, useEffect } from "react";
import { 
  FileQuestion, PlusCircle, BookOpen, Layers, CheckCircle2, 
  Clock, XCircle, AlertTriangle, Sparkles, ArrowRight, Lock, 
  ShieldAlert, Settings, BarChart3, HelpCircle, FileCheck,
  Dices, Trash2, FileSpreadsheet, X, Users, GraduationCap,
  ChevronRight, Search, FileText, Eye, ShieldCheck, RefreshCw,
  CheckCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";

export const ExaminerDashboard = ({ 
  setCurrentView, 
  onSelectEditQuestion, 
  onSelectExamForStudents,
  onSelectExamForResults,
  onInspectResult
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [questionStats, setQuestionStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvingToken, setApprovingToken] = useState(null);

  const approvalStatus = user?.approval_status || "PENDING";
  const isPending = approvalStatus === "PENDING";
  const isRejected = approvalStatus === "REJECTED";
  const isApproved = approvalStatus === "APPROVED";

  const loadData = async (showRefreshToast = false) => {
    if (isApproved) {
      try {
        if (showRefreshToast) setRefreshing(true);
        const [qStats, examsList, subsList] = await Promise.all([
          api.getQuestionStats().catch(() => null),
          api.getExams().catch(() => []),
          api.getExamSubmissions().catch(() => [])
        ]);
        setQuestionStats(qStats);
        setExams(examsList || []);
        setSubmissions(subsList || []);

        if (showRefreshToast) {
          showToast("Dashboard synchronized with student submissions.", "info");
        }
      } catch (err) {
        console.error("Error loading examiner data:", err);
      } finally {
        setRefreshing(false);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [isApproved]);

  const handleDeleteExam = async (examId, examTitle) => {
    if (!window.confirm(`Are you sure you want to delete exam "${examTitle}"?`)) return;
    try {
      await api.deleteExam(examId);
      showToast(`Exam "${examTitle}" deleted successfully.`, "info");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete exam", "error");
    }
  };

  const handleToggleStatus = async (examId, currentStatus, examTitle) => {
    try {
      const updated = await api.toggleExamStatus(examId);
      const newStatus = updated.status;
      if (newStatus === "PUBLISHED") {
        showToast(`Exam "${examTitle}" is now PUBLISHED and visible in the student portal!`, "success");
      } else {
        showToast(`Exam "${examTitle}" set to DRAFT (hidden from student portal).`, "info");
      }
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to update exam status", "error");
    }
  };

  const handleQuickApprove = async (sessionToken, candidateName) => {
    try {
      setApprovingToken(sessionToken);
      await api.approveSessionResult(sessionToken, { notes: "Quick approved by faculty examiner from dashboard." });
      showToast(`Scorecard for ${candidateName || "Candidate"} approved and released to student portal!`, "success");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to approve result", "error");
    } finally {
      setApprovingToken(null);
    }
  };

  const filteredExams = exams.filter(e => 
    !searchTerm || 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.subject && e.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingSubmissionsCount = submissions.filter(s => !s.is_approved).length;
  const recentSubmissions = submissions.slice(0, 5);

  return (
    <div className="page-container">
      {/* 1. Header Banner */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <h1>Examiner Command Center</h1>
            <StatusBadge status={approvalStatus} />
          </div>
          <p>
            Faculty Portal &bull; <strong>{user?.name || "Examiner"}</strong> ({user?.department || "Department of Engineering"})
          </p>
        </div>

        {/* Quick Actions (only enabled when APPROVED) */}
        {isApproved && (
          <div className="dashboard-actions-group">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              title="Refresh live student submissions"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
              Sync Submissions
            </button>
            <button
              onClick={() => setShowExtractModal(true)}
              className="btn btn-secondary btn-sm"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                borderColor: "rgba(16, 185, 129, 0.35)",
                color: "#6ee7b7"
              }}
            >
              <FileSpreadsheet size={15} color="#34d399" />
              Import (PDF/Excel)
            </button>
            <button
              onClick={() => setCurrentView("add_question")}
              className="btn btn-secondary btn-sm"
            >
              <PlusCircle size={15} />
              New Question
            </button>
            <button
              onClick={() => setCurrentView("create_exam")}
              className="btn btn-primary btn-sm"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)"
              }}
            >
              <Dices size={15} />
              + Create Exam
            </button>
          </div>
        )}
      </div>

      {/* 2. PENDING STATUS BANNER & LOCKED STATE */}
      {isPending && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <div
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "var(--radius-lg)",
              padding: "1.75rem",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.25rem"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.2)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
                flexShrink: 0
              }}
            >
              <Clock size={24} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.15rem", fontWeight: 700, color: "#fef3c7" }}>
                Account Pending Verification
              </h3>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#fde68a", fontWeight: 600 }}>
                "Your examiner account is pending admin approval."
              </p>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#d1d5db", lineHeight: 1.5 }}>
                An administrator is verifying your faculty credentials. Once approved, question authoring, exam generation, and student grading privileges will be active immediately.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Lock size={12} color="#f59e0b" /> Question Bank (Locked)
                </span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Lock size={12} color="#f59e0b" /> Create Exam (Locked)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REJECTED STATUS BANNER */}
      {isRejected && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <div
            style={{
              background: "linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(225, 29, 72, 0.1))",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "var(--radius-lg)",
              padding: "1.75rem",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.25rem"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(244, 63, 94, 0.2)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fb7185",
                flexShrink: 0
              }}
            >
              <XCircle size={24} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.15rem", fontWeight: 700, color: "#ffe4e6" }}>
                Examiner Access Application Rejected
              </h3>
              {user?.rejection_reason && (
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(244, 63, 94, 0.3)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.65rem 1rem",
                    marginBottom: "0.75rem",
                    color: "var(--text-main)",
                    fontSize: "0.85rem"
                  }}
                >
                  <strong style={{ color: "#fda4af" }}>Administrator Feedback:</strong> {user.rejection_reason}
                </div>
              )}
              <p style={{ margin: 0, fontSize: "0.825rem", color: "var(--text-muted)" }}>
                Examiner management operations are disabled. If you believe this is an error, please reach out to academic administration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. APPROVED DASHBOARD (FULL ACCESS) */}
      {isApproved && (
        <div style={{ animation: "fadeIn 0.25s ease-in-out" }}>
          {/* KPI Metrics */}
          <div className="dashboard-stats-grid">
            <StatCard
              title="Question Bank Pool"
              value={questionStats?.total_questions || 0}
              icon={FileQuestion}
              color="indigo"
              subtitle="Universal Items"
              badgeText="Active Bank"
            />
            <StatCard
              title="Configured Exams"
              value={exams.length}
              icon={Layers}
              color="purple"
              subtitle="Active Blueprints"
              badgeText="Live Papers"
            />
            <StatCard
              title="Student Submissions"
              value={submissions.length}
              icon={FileCheck}
              color="cyan"
              subtitle="Submitted Attempts"
              badgeText="Results Feed"
            />
            <StatCard
              title="Pending Verification"
              value={pendingSubmissionsCount}
              icon={Clock}
              color={pendingSubmissionsCount > 0 ? "amber" : "emerald"}
              subtitle={pendingSubmissionsCount > 0 ? "Requires Audit" : "All Released"}
              badgeText={pendingSubmissionsCount > 0 ? "Action Required" : "Up to Date"}
            />
          </div>

          {/* Section: Live Student Exam Results & Submissions Stream */}
          <div className="glass-card" style={{ padding: "1.75rem 2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileCheck size={20} color="#818cf8" />
                  Live Candidate Exam Results & Submissions
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-subtle)", margin: "0.25rem 0 0" }}>
                  Submissions received from the student exam hall with automated scores and AI proctoring telemetry
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={() => setCurrentView("examiner_results_audit")}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  View All Submissions & Audit ({submissions.length}) <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1.5rem", border: "1.5px dashed var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}>
                <GraduationCap size={32} color="#818cf8" style={{ margin: "0 auto 0.5rem" }} />
                <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>No candidate exam submissions yet</div>
                <p style={{ fontSize: "0.825rem", margin: 0 }}>
                  When students start and complete exams in the student portal, their live scores, answers, and proctoring trust scores will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Register No</th>
                      <th>Examination Paper</th>
                      <th>Score / Max</th>
                      <th>Result</th>
                      <th>Proctor Trust</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map(sub => (
                      <tr key={sub.session_id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{sub.student_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{sub.student_email}</div>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-light)" }}>
                          {sub.student_register_number || "REG2026"}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.85rem" }}>
                            {sub.exam_title}
                          </div>
                          <div style={{ fontSize: "0.725rem", color: "var(--text-subtle)" }}>
                            {sub.exam_subject || "General"}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          {sub.obtained_marks} / {sub.total_marks} ({sub.percentage}%)
                        </td>
                        <td>
                          <span className={`badge ${sub.passed ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.72rem" }}>
                            {sub.passed ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            {sub.integrity_score >= 80 ? (
                              <ShieldCheck size={14} color="#34d399" />
                            ) : (
                              <ShieldAlert size={14} color="#ef4444" />
                            )}
                            <span style={{ fontWeight: 700, fontSize: "0.825rem", color: sub.integrity_score >= 80 ? "#34d399" : "#f87171" }}>
                              {sub.integrity_score}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {sub.is_approved ? (
                            <span className="badge badge-result-approved" style={{ fontSize: "0.72rem" }}>
                              <CheckCircle2 size={11} /> Released
                            </span>
                          ) : (
                            <span className="badge badge-under-review" style={{ fontSize: "0.72rem" }}>
                              <Clock size={11} /> Pending Review
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <button
                              onClick={() => {
                                if (onInspectResult) {
                                  onInspectResult(sub.session_token, sub.exam_id);
                                } else {
                                  setCurrentView("examiner_results_audit");
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <Eye size={12} /> Audit & Grade
                            </button>
                            {!sub.is_approved && (
                              <button
                                disabled={approvingToken === sub.session_token}
                                onClick={() => handleQuickApprove(sub.session_token, sub.student_name)}
                                className="btn btn-emerald"
                                style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                              >
                                <CheckCircle2 size={12} /> Release
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Clean 2-Column Layout */}
          <div className="dashboard-grid-2col">
            
            {/* Left Column: Configured Examination Blueprints */}
            <div className="glass-card" style={{ padding: "2.25rem 2.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1.25rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>
                    Configured Examination Blueprints
                  </h2>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-subtle)", margin: "0.35rem 0 0" }}>
                    Active examination schedules & randomized question papers
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
                    <input
                      type="text"
                      placeholder="Filter exams..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: "0.55rem 1rem 0.55rem 2.35rem",
                        fontSize: "0.875rem",
                        background: "rgba(15, 23, 42, 0.55)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "9999px",
                        color: "var(--text-main)",
                        width: "180px"
                      }}
                    />
                  </div>
                  <span className="badge badge-approved" style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}>
                    {exams.length} Active
                  </span>
                  <button
                    onClick={() => setCurrentView("create_exam")}
                    className="btn btn-primary btn-sm"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      boxShadow: "0 4px 12px rgba(168, 85, 247, 0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.5rem 1rem",
                      fontWeight: 700
                    }}
                  >
                    <Dices size={15} />
                    + Create Exam
                  </button>
                </div>
              </div>

              {filteredExams.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)", border: "1.5px dashed var(--border-color)", borderRadius: "var(--radius-lg)" }}>
                  <Layers size={36} color="#818cf8" style={{ margin: "0 auto 1rem" }} />
                  <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1.1rem", marginBottom: "0.45rem" }}>
                    {searchTerm ? "No matching examinations found" : "No active exams configured yet"}
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-subtle)", marginBottom: "1.5rem" }}>
                    Create a new examination blueprint and populate it with randomized questions.
                  </p>
                  <button
                    onClick={() => setCurrentView("create_exam")}
                    className="btn btn-primary"
                    style={{ padding: "0.65rem 1.4rem" }}
                  >
                    <Dices size={16} /> + Create New Exam
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
                  {filteredExams.map(exam => (
                    <div 
                      key={exam.id}
                      style={{ 
                        padding: "1.4rem 1.65rem", 
                        background: "rgba(15, 23, 42, 0.45)", 
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        gap: "1.25rem",
                        flexWrap: "wrap",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-highlight)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-color)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1.05rem" }}>
                            {exam.title}
                          </span>
                          <span className="badge badge-type" style={{ fontSize: "0.75rem" }}>
                            {exam.subject || "General"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", gap: "1rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
                          <span>⏱ {exam.duration_minutes} mins</span>
                          <span>&bull;</span>
                          <span>🏆 {exam.total_marks} Marks</span>
                          <span>&bull;</span>
                          <span>📝 {exam.questions_count || exam.exam_questions?.length || 0} Questions</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
                        {exam.status === "PUBLISHED" ? (
                          <span className="badge badge-approved" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <CheckCircle2 size={12} color="#34d399" /> Live in Student Portal
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <Clock size={12} color="#fbbf24" /> Draft (Hidden)
                          </span>
                        )}

                        <button
                          onClick={() => handleToggleStatus(exam.id, exam.status, exam.title)}
                          title={exam.status === "PUBLISHED" ? "Unpublish exam (hide from students)" : "Publish exam (make live in student portal)"}
                          className={`btn btn-sm ${exam.status === "PUBLISHED" ? "btn-secondary" : "btn-emerald"}`}
                          style={{
                            fontSize: "0.8rem",
                            padding: "0.4rem 0.75rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          {exam.status === "PUBLISHED" ? (
                            <>To Draft</>
                          ) : (
                            <><CheckCircle2 size={13} /> Publish Now</>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            if (onSelectExamForResults) {
                              onSelectExamForResults(exam.id);
                            } else {
                              setCurrentView("examiner_results_audit");
                            }
                          }}
                          title="View Student Results & Audit Answer Sheets"
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.4rem 0.75rem"
                          }}
                        >
                          <FileCheck size={14} color="#34d399" /> Results
                        </button>

                        <button
                          onClick={() => {
                            if (onSelectExamForStudents) {
                              onSelectExamForStudents(exam.id);
                            } else {
                              setCurrentView("enrolled_students");
                            }
                          }}
                          title="View Enrolled Candidates"
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.4rem 0.75rem"
                          }}
                        >
                          <Users size={14} color="#818cf8" /> Candidates
                        </button>

                        <button
                          onClick={() => handleDeleteExam(exam.id, exam.title)}
                          title="Delete Exam Blueprint"
                          style={{
                            background: "rgba(244, 63, 94, 0.1)",
                            border: "1px solid rgba(244, 63, 94, 0.25)",
                            color: "#fda4af",
                            borderRadius: "8px",
                            padding: "0.4rem 0.6rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Authoring & Studio Tools Hub */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
              
              {/* Studio Tools Container */}
              <div className="glass-card" style={{ padding: "2rem 2.25rem" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 1.25rem", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Studio & Question Tools
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  
                  {/* Tool 0: Create Exam Blueprint */}
                  <div 
                    className="tool-tile"
                    onClick={() => setCurrentView("create_exam")}
                    style={{
                      background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(168, 85, 247, 0.08))",
                      borderColor: "rgba(168, 85, 247, 0.35)"
                    }}
                  >
                    <div className="tool-tile-icon" style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
                      <Dices size={18} />
                    </div>
                    <div className="tool-tile-body">
                      <div className="tool-tile-title" style={{ color: "#e9d5ff" }}>Create Examination Blueprint</div>
                      <div className="tool-tile-subtitle">Assemble randomized paper, timer & proctoring</div>
                    </div>
                    <span className="badge badge-approved" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>New</span>
                    <ChevronRight size={16} color="var(--text-subtle)" />
                  </div>

                  {/* Tool 1: Question Bank Hub */}
                  <div 
                    className="tool-tile"
                    onClick={() => setCurrentView("question_bank")}
                  >
                    <div className="tool-tile-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                      <BookOpen size={18} />
                    </div>
                    <div className="tool-tile-body">
                      <div className="tool-tile-title">Question Bank Hub</div>
                      <div className="tool-tile-subtitle">Browse, filter & edit repository</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-subtle)" />
                  </div>

                  {/* Tool 2: Document Extractor */}
                  <div 
                    className="tool-tile"
                    onClick={() => setShowExtractModal(true)}
                  >
                    <div className="tool-tile-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                      <FileSpreadsheet size={18} />
                    </div>
                    <div className="tool-tile-body">
                      <div className="tool-tile-title">Document Extractor</div>
                      <div className="tool-tile-subtitle">Bulk import PDF, Word, Excel</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-subtle)" />
                  </div>

                  {/* Tool 3: AI Synthesizer */}
                  <div 
                    className="tool-tile"
                    onClick={() => setCurrentView("add_question")}
                  >
                    <div className="tool-tile-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#67e8f9" }}>
                      <Sparkles size={18} />
                    </div>
                    <div className="tool-tile-body">
                      <div className="tool-tile-title">AI Item Synthesizer</div>
                      <div className="tool-tile-subtitle">Generate questions with AI rubrics</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-subtle)" />
                  </div>

                  {/* Tool 4: Enrolled Students */}
                  <div 
                    className="tool-tile"
                    onClick={() => setCurrentView("enrolled_students")}
                  >
                    <div className="tool-tile-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
                      <Users size={18} />
                    </div>
                    <div className="tool-tile-body">
                      <div className="tool-tile-title">Enrolled Candidates</div>
                      <div className="tool-tile-subtitle">Rosters, attendance & scores</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-subtle)" />
                  </div>

                  {/* Tool 5: Submission Grading & Audit */}
                  <div 
                    className="tool-tile"
                    onClick={() => setCurrentView("examiner_results_audit")}
                  >
                    <div className="tool-tile-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                      <FileCheck size={18} />
                    </div>
                    <div className="tool-tile-body">
                      <div className="tool-tile-title">Candidate Exam Results & Audit</div>
                      <div className="tool-tile-subtitle">Review student scores & release scorecards</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-subtle)" />
                  </div>
                </div>
              </div>

              {/* Proctoring & AI Status Summary */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: "1.1rem", 
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.2)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <ShieldAlert size={16} color="#818cf8" />
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                    AI Proctoring Security
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", margin: 0, lineHeight: 1.4 }}>
                  Gaze tracking, multiple face detection, tab switch lock, and speech detection are active for all blueprints.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Extract / Import Modal */}
      {showExtractModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 15, 29, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExtractModal(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "1000px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "1.5rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileSpreadsheet size={18} color="#34d399" />
                  Import Questions to Repository
                </h3>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.785rem", color: "var(--text-muted)" }}>
                  Upload Excel, Word, PDF or paste text to bulk extract questions directly into your Question Bank.
                </p>
              </div>
              <button
                onClick={() => setShowExtractModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.35rem 0.5rem" }}
              >
                <X size={16} />
              </button>
            </div>

            <DocumentQuestionExtractor
              isModal={true}
              onClose={() => setShowExtractModal(false)}
              onQuestionsSavedToBank={(createdQuestions) => {
                showToast(`Successfully added ${createdQuestions.length} questions to the bank!`, "success");
                loadData();
                setShowExtractModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
