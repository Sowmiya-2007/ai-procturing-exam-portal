import React, { useState, useEffect } from "react";
import { 
  FileCheck2, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  Award, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  RefreshCw,
  Sparkles,
  BookOpen,
  UserCheck,
  Send,
  CheckCheck,
  AlertTriangle,
  ExternalLink,
  Layers,
  GraduationCap,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const ExaminerResultsAudit = ({ initialExamId = null, initialSessionToken = null, onBack }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId ? String(initialExamId) : "ALL");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "pending", "approved", "failed"

  // Inspect Modal
  const [activeSessionToken, setActiveSessionToken] = useState(initialSessionToken);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [overrideInputs, setOverrideInputs] = useState({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [approvingResult, setApprovingResult] = useState(false);
  const [approvalNotesInput, setApprovalNotesInput] = useState("");
  const [activeTab, setActiveTab] = useState("answers"); // "answers", "telemetry"

  // Load all exams
  useEffect(() => {
    const loadExams = async () => {
      try {
        const data = await api.getExams();
        setExams(data || []);
      } catch (err) {
        showToast(err.message || "Failed to load examinations", "error");
      }
    };
    loadExams();
  }, []);

  // Load submissions when selectedExamId changes
  const loadSubmissions = async (showToastNotice = false) => {
    try {
      if (showToastNotice) setRefreshing(true);
      else setLoading(true);

      const examParam = (selectedExamId && selectedExamId !== "ALL") ? Number(selectedExamId) : undefined;
      const data = await api.getExamSubmissions(examParam);
      setSubmissions(data || []);

      if (showToastNotice) {
        showToast("Candidate results updated from student portal.", "info");
      }
    } catch (err) {
      showToast(err.message || "Failed to load candidate submissions", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [selectedExamId]);

  // Open detailed answer sheet modal
  const handleInspect = async (sessionToken) => {
    if (!sessionToken) return;
    setActiveSessionToken(sessionToken);
    setModalLoading(true);
    setActiveTab("answers");
    try {
      const details = await api.getSessionResult(sessionToken);
      setSessionDetails(details);
      setApprovalNotesInput(details.approval_notes || "");
      
      // Initialize override input map
      const initialMap = {};
      (details.question_breakdown || []).forEach(qb => {
        initialMap[qb.question_id] = qb.marks_awarded;
      });
      setOverrideInputs(initialMap);
    } catch (err) {
      showToast(err.message || "Failed to load candidate answers", "error");
      setActiveSessionToken(null);
    } finally {
      setModalLoading(false);
    }
  };

  // Auto-open initialSessionToken if passed
  useEffect(() => {
    if (initialSessionToken) {
      handleInspect(initialSessionToken);
    }
  }, [initialSessionToken]);

  const handleSaveOverride = async (questionId) => {
    const newMarks = parseFloat(overrideInputs[questionId]);
    if (isNaN(newMarks) || newMarks < 0) {
      showToast("Please enter a valid non-negative mark", "error");
      return;
    }

    const qb = (sessionDetails?.question_breakdown || []).find(q => q.question_id === questionId);
    if (!qb || !qb.answer_id) {
      showToast("No submitted answer record found to grade.", "error");
      return;
    }

    try {
      setSavingGrade(true);
      await api.overrideAnswerGrade(qb.answer_id, {
        marks_awarded: newMarks,
        feedback: "Audited and adjusted by faculty examiner."
      });
      showToast(`Grade updated to ${newMarks} Marks! Score recalculated.`, "success");
      
      // Reload session details
      const refreshed = await api.getSessionResult(activeSessionToken);
      setSessionDetails(refreshed);

      // Refresh list
      const examParam = (selectedExamId && selectedExamId !== "ALL") ? Number(selectedExamId) : undefined;
      const refreshedSubs = await api.getExamSubmissions(examParam);
      setSubmissions(refreshedSubs || []);
    } catch (err) {
      showToast(err.message || "Failed to update grade", "error");
    } finally {
      setSavingGrade(false);
    }
  };

  // Approve single candidate result
  const handleApproveResult = async (sessionToken, candidateName) => {
    try {
      setApprovingResult(true);
      await api.approveSessionResult(sessionToken, { notes: approvalNotesInput || "Audited and verified by faculty examiner." });
      showToast(`Result for ${candidateName || "Candidate"} approved & officially released to student!`, "success");
      
      if (activeSessionToken === sessionToken) {
        const refreshed = await api.getSessionResult(sessionToken);
        setSessionDetails(refreshed);
      }
      
      const examParam = (selectedExamId && selectedExamId !== "ALL") ? Number(selectedExamId) : undefined;
      const refreshedSubs = await api.getExamSubmissions(examParam);
      setSubmissions(refreshedSubs || []);
    } catch (err) {
      showToast(err.message || "Failed to approve result", "error");
    } finally {
      setApprovingResult(false);
    }
  };

  // Batch approve all pending results for the selected exam
  const handleApproveAll = async () => {
    if (!selectedExamId || selectedExamId === "ALL") {
      showToast("Please select a specific examination paper from the dropdown to batch approve its results.", "info");
      return;
    }
    const pendingCount = submissions.filter(s => !s.is_approved).length;
    if (pendingCount === 0) {
      showToast("All submissions for this examination are already approved.", "info");
      return;
    }

    if (!window.confirm(`Are you sure you want to approve and release all ${pendingCount} pending candidate scorecards?`)) {
      return;
    }

    try {
      setApprovingResult(true);
      const res = await api.approveAllExamResults(Number(selectedExamId), { notes: "Batch approved by faculty examiner." });
      showToast(res.message || `Approved ${pendingCount} submissions successfully!`, "success");
      await loadSubmissions();
    } catch (err) {
      showToast(err.message || "Failed to batch approve results", "error");
    } finally {
      setApprovingResult(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = !search || (
      (sub.student_name && sub.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (sub.student_register_number && sub.student_register_number.toLowerCase().includes(search.toLowerCase())) ||
      (sub.student_email && sub.student_email.toLowerCase().includes(search.toLowerCase())) ||
      (sub.exam_title && sub.exam_title.toLowerCase().includes(search.toLowerCase())) ||
      (sub.student_department && sub.student_department.toLowerCase().includes(search.toLowerCase()))
    );

    if (!matchesSearch) return false;

    if (filterStatus === "pending") return !sub.is_approved;
    if (filterStatus === "approved") return sub.is_approved;
    if (filterStatus === "failed") return !sub.passed;
    return true;
  });

  const pendingSubmissionsCount = submissions.filter(s => !s.is_approved).length;
  const approvedSubmissionsCount = submissions.filter(s => s.is_approved).length;
  const avgIntegrity = submissions.length > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.integrity_score || 0), 0) / submissions.length) 
    : 100;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1.25rem" }}>
        <div>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: "0.6rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          )}
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Candidate Exam Results & Proctoring Audit
          </h1>
          <p style={{ fontSize: "0.925rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
            Live stream of student exam submissions. Inspect candidate answer sheets, evaluate handwritten diagrams, review AI proctoring telemetry, and release official scorecards.
          </p>
        </div>

        {/* Exam Picker & Batch Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => loadSubmissions(true)}
            disabled={loading || refreshing}
            className="btn btn-secondary btn-sm"
            title="Refresh candidate submissions from student portal"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            Sync Results
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>Filter Paper:</label>
            <select
              value={selectedExamId || "ALL"}
              onChange={e => setSelectedExamId(e.target.value)}
              className="form-select"
              style={{ width: "260px", background: "rgba(15, 23, 42, 0.9)" }}
            >
              <option value="ALL">🌟 All Examinations (Universal Feed)</option>
              {exams.map(e => (
                <option key={e.id} value={String(e.id)}>
                  {e.title} ({e.subject || "General"})
                </option>
              ))}
            </select>
          </div>

          {selectedExamId !== "ALL" && (
            <button
              onClick={handleApproveAll}
              disabled={approvingResult || pendingSubmissionsCount === 0}
              className="btn btn-emerald"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1.15rem", fontSize: "0.85rem" }}
              title={pendingSubmissionsCount === 0 ? "All submissions approved" : `Release ${pendingSubmissionsCount} pending scorecards`}
            >
              <CheckCheck size={16} /> Approve All ({pendingSubmissionsCount} Pending)
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass-card" style={{ padding: "1.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Total Submissions
          </span>
          <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-main)" }}>{submissions.length}</span>
        </div>
        
        <div className="glass-card" style={{ padding: "1.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Pending Examiner Verification
          </span>
          <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fbbf24" }}>
            {pendingSubmissionsCount}
          </span>
        </div>

        <div className="glass-card" style={{ padding: "1.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Approved & Released
          </span>
          <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#34d399" }}>
            {approvedSubmissionsCount}
          </span>
        </div>

        <div className="glass-card" style={{ padding: "1.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Average AI Proctor Trust
          </span>
          <span style={{ fontSize: "1.85rem", fontWeight: 800, color: avgIntegrity >= 80 ? "#818cf8" : "#f87171" }}>
            {avgIntegrity}%
          </span>
        </div>
      </div>

      {/* Submissions Table & Filters */}
      <div className="glass-card" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          {/* Search Bar */}
          <div style={{ position: "relative", width: "360px" }}>
            <Search size={17} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search candidate name, reg no, exam title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: "2.5rem", width: "100%" }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterStatus("all")}
              className={`btn ${filterStatus === "all" ? "btn-primary" : "btn-secondary"} btn-sm`}
            >
              All Submissions ({submissions.length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`btn ${filterStatus === "pending" ? "btn-primary" : "btn-secondary"} btn-sm`}
            >
              Pending Review ({pendingSubmissionsCount})
            </button>
            <button
              onClick={() => setFilterStatus("approved")}
              className={`btn ${filterStatus === "approved" ? "btn-primary" : "btn-secondary"} btn-sm`}
            >
              Released ({approvedSubmissionsCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-muted)" }}>
            <RefreshCw size={32} className="spin-animation" style={{ margin: "0 auto 1rem", color: "#818cf8" }} />
            <p style={{ fontSize: "1rem" }}>Loading candidate submissions and proctoring telemetry...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-muted)" }}>
            <UserCheck size={44} color="#64748b" style={{ margin: "0 auto 1rem" }} />
            <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-main)" }}>No candidate submissions found.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {search ? "Try adjusting your search keywords." : "When students complete exams in the student portal, their scores and answer sheets appear here in real-time."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Register No & Dept</th>
                  <th>Examination Paper</th>
                  <th>Score / Max</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Status & Approval</th>
                  <th>Proctor Trust</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(sub => (
                  <tr key={sub.session_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{sub.student_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{sub.student_email}</div>
                    </td>
                    <td>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-light)" }}>
                        {sub.student_register_number || "REG2026"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{sub.student_department || "Computer Science"}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.9rem" }}>
                        {sub.exam_title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                        {sub.exam_subject || "General"}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                      {sub.obtained_marks} / {sub.total_marks}
                    </td>
                    <td style={{ fontWeight: 700 }}>{sub.percentage}%</td>
                    <td>
                      <span className={`badge ${sub.passed ? "badge-approved" : "badge-rejected"}`}>
                        {sub.passed ? "PASSED" : "FAILED"}
                      </span>
                    </td>
                    <td>
                      {sub.is_approved ? (
                        <span className="badge badge-result-approved" title={`Approved by ${sub.approved_by_name || "Examiner"}`}>
                          <CheckCircle2 size={12} /> Released
                        </span>
                      ) : (
                        <span className="badge badge-under-review">
                          <Clock size={12} /> Pending Review
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {sub.integrity_score >= 80 ? (
                          <ShieldCheck size={16} color="#34d399" />
                        ) : (
                          <ShieldAlert size={16} color="#ef4444" />
                        )}
                        <span style={{ fontWeight: 700, color: sub.integrity_score >= 80 ? "#34d399" : "#f87171" }}>
                          {sub.integrity_score}%
                        </span>
                        {sub.violations_count > 0 && (
                          <span className="badge badge-rejected" style={{ fontSize: "0.65rem" }}>
                            {sub.violations_count} Flags
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleInspect(sub.session_token)}
                          className="btn btn-secondary"
                          style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                        >
                          <Eye size={14} /> Audit & Grade
                        </button>
                        
                        {!sub.is_approved && (
                          <button
                            disabled={approvingResult}
                            onClick={() => handleApproveResult(sub.session_token, sub.student_name)}
                            className="btn btn-emerald"
                            style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                            title="Approve and release scorecard to student"
                          >
                            <CheckCircle2 size={14} /> Release
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

      {/* Answer Sheet Audit & Grade Override Modal */}
      {activeSessionToken && (
        <div className="modal-overlay" onClick={() => setActiveSessionToken(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "960px", maxHeight: "92vh", overflowY: "auto", padding: "2.25rem" }}>
            {modalLoading || !sessionDetails ? (
              <div style={{ textAlign: "center", padding: "4rem 0" }}>
                <RefreshCw size={32} className="spin-animation" style={{ margin: "0 auto 1rem", color: "#818cf8" }} />
                <p>Loading candidate answer sheet and submission telemetry...</p>
              </div>
            ) : (
              <div>
                {/* Modal Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
                      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                        Candidate Answer Sheet: {sessionDetails.student_name}
                      </h2>
                      {sessionDetails.is_approved ? (
                        <span className="badge badge-result-approved"><CheckCircle2 size={13} /> Scorecard Released</span>
                      ) : (
                        <span className="badge badge-under-review"><Clock size={13} /> Pending Examiner Release</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span>Register No: <strong style={{ color: "var(--primary-light)", fontFamily: "var(--font-mono)" }}>{sessionDetails.student_register_number || "REG2026"}</strong></span>
                      <span>&bull;</span>
                      <span>Department: <strong>{sessionDetails.student_department || "Computer Science"}</strong></span>
                      <span>&bull;</span>
                      <span>Exam: <strong>{sessionDetails.exam_title}</strong></span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
                    <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                      {sessionDetails.obtained_marks} / {sessionDetails.total_marks} Marks
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span className="badge badge-approved">{sessionDetails.percentage}% Score</span>
                      <span className={`badge ${sessionDetails.passed ? "badge-approved" : "badge-rejected"}`}>
                        {sessionDetails.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs: Answer Sheets vs Proctoring Telemetry */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                  <button
                    onClick={() => setActiveTab("answers")}
                    className={`btn btn-sm ${activeTab === "answers" ? "btn-primary" : "btn-secondary"}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <BookOpen size={15} /> Question & Answer Breakdown ({sessionDetails.question_breakdown?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("telemetry")}
                    className={`btn btn-sm ${activeTab === "telemetry" ? "btn-primary" : "btn-secondary"}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <ShieldAlert size={15} color={sessionDetails.proctoring_summary?.violations_count > 0 ? "#f87171" : "#34d399"} />
                    AI Proctoring Audit Log ({sessionDetails.proctoring_summary?.total_events || 0} events)
                  </button>
                </div>

                {/* TAB 1: QUESTION & ANSWER BREAKDOWN */}
                {activeTab === "answers" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {sessionDetails.question_breakdown?.map((qb) => (
                      <div key={qb.question_id} style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "1rem" }}>Q{qb.order}.</span>
                            <span className="badge badge-type">{qb.question_type.replace("_", " ")}</span>
                            <span className="badge badge-pending">{qb.marks_possible} Max Marks</span>
                          </div>

                          {/* Grade Override Input */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Marks Awarded:</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={qb.marks_possible}
                              value={overrideInputs[qb.question_id] !== undefined ? overrideInputs[qb.question_id] : qb.marks_awarded}
                              onChange={e => setOverrideInputs({ ...overrideInputs, [qb.question_id]: e.target.value })}
                              className="form-input"
                              style={{ width: "80px", padding: "0.3rem 0.5rem", textAlign: "center", fontWeight: 700 }}
                            />
                            <button
                              disabled={savingGrade}
                              onClick={() => handleSaveOverride(qb.question_id)}
                              className="btn btn-secondary btn-sm"
                            >
                              Update Grade
                            </button>
                          </div>
                        </div>

                        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.85rem" }}>
                          {qb.question_text}
                        </p>

                        {/* Candidate Answer Box */}
                        <div style={{ background: "rgba(0, 0, 0, 0.35)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "0.85rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "0.4rem", letterSpacing: "0.03em" }}>
                            CANDIDATE SUBMISSION
                          </span>
                          {["SHORT_ANSWER", "LONG_ANSWER"].includes(qb.question_type) && (
                            <p style={{ fontSize: "0.875rem", color: "#f1f5f9", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                              {qb.text_answer || "No response submitted"}
                            </p>
                          )}
                          {qb.question_type === "IMAGE_UPLOAD" && (
                            <div>
                              {qb.image_url ? (
                                <div style={{ textAlign: "center", maxHeight: "320px", overflow: "hidden", borderRadius: "var(--radius-sm)", background: "#05070e", padding: "0.5rem" }}>
                                  <img src={qb.image_url} alt="Candidate diagram submission" style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain" }} />
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "var(--text-subtle)" }}>No diagram image uploaded</span>
                              )}
                            </div>
                          )}
                          {["MCQ", "MULTI_SELECT"].includes(qb.question_type) && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                              {qb.options?.map(opt => {
                                const isSelected = (qb.selected_option_ids || []).includes(opt.id);
                                const isCorrectOpt = opt.is_correct;
                                return (
                                  <div 
                                    key={opt.id}
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "6px",
                                      fontSize: "0.85rem",
                                      background: isSelected 
                                        ? (isCorrectOpt ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)")
                                        : "rgba(255, 255, 255, 0.02)",
                                      border: isSelected 
                                        ? (isCorrectOpt ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(244, 63, 94, 0.4)")
                                        : "1px solid rgba(255, 255, 255, 0.05)",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                  >
                                    <span style={{ color: isSelected ? "#fff" : "var(--text-muted)" }}>
                                      {opt.option_text}
                                    </span>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                      {isSelected && (
                                        <span className={`badge ${isCorrectOpt ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.68rem" }}>
                                          Selected
                                        </span>
                                      )}
                                      {isCorrectOpt && (
                                        <span className="badge badge-approved" style={{ fontSize: "0.68rem" }}>
                                          Answer Key
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Model Answer & Rubrics Guidelines */}
                        {(qb.model_answer || qb.evaluation_guidelines) && (
                          <div style={{ background: "rgba(99, 102, 241, 0.07)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#818cf8", display: "block", marginBottom: "0.25rem" }}>
                              REFERENCE MODEL ANSWER & RUBRIC GUIDELINES
                            </span>
                            {qb.model_answer && (
                              <p style={{ fontSize: "0.825rem", color: "#e0e7ff", margin: "0 0 0.35rem" }}>
                                <strong>Expected Answer:</strong> {qb.model_answer}
                              </p>
                            )}
                            {qb.evaluation_guidelines && (
                              <p style={{ fontSize: "0.825rem", color: "#c7d2fe", margin: 0 }}>
                                <strong>Grading Criteria:</strong> {qb.evaluation_guidelines}
                              </p>
                            )}
                          </div>
                        )}

                        {/* AI Evaluation Feedback */}
                        {qb.ai_feedback && (
                          <div style={{ fontSize: "0.825rem", color: "#c7d2fe", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Sparkles size={14} color="#818cf8" /> {qb.ai_feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: AI PROCTORING AUDIT LOG */}
                {activeTab === "telemetry" && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                      <div className="glass-card" style={{ padding: "1rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block" }}>Trust Rating</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: sessionDetails.proctoring_summary?.integrity_score >= 80 ? "#34d399" : "#f87171" }}>
                          {sessionDetails.proctoring_summary?.integrity_score}%
                        </span>
                      </div>
                      <div className="glass-card" style={{ padding: "1rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block" }}>Total Violations</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: sessionDetails.proctoring_summary?.violations_count > 0 ? "#f87171" : "#34d399" }}>
                          {sessionDetails.proctoring_summary?.violations_count || 0}
                        </span>
                      </div>
                      <div className="glass-card" style={{ padding: "1rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block" }}>Total Telemetry Events</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>
                          {sessionDetails.proctoring_summary?.total_events || 0}
                        </span>
                      </div>
                    </div>

                    {sessionDetails.proctoring_summary?.recent_events?.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
                        <ShieldCheck size={40} color="#34d399" style={{ margin: "0 auto 0.75rem" }} />
                        <p style={{ color: "var(--text-main)", fontWeight: 700 }}>Clean Proctoring Record</p>
                        <p style={{ fontSize: "0.85rem" }}>No suspicious tab switching, background gaze, or audio anomalies detected during this exam session.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Event Type</th>
                              <th>Details</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionDetails.proctoring_summary?.recent_events?.map(ev => (
                              <tr key={ev.id}>
                                <td>
                                  <span className="badge badge-rejected" style={{ fontSize: "0.75rem" }}>
                                    {String(ev.event_type).replace("_", " ")}
                                  </span>
                                </td>
                                <td style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                                  {ev.details || "Telemetry flag recorded"}
                                </td>
                                <td style={{ fontSize: "0.8rem", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                                  {ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : "N/A"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Faculty Approval Box */}
                <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-main)" }}>
                    Examiner Verification & Release Decision
                  </h4>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                    Once approved, the student will immediately see their finalized scorecard, grades, question breakdowns, and proctoring trust analysis in the student portal.
                  </p>
                  
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Optional remarks (e.g. Verified handwritten diagram schematic; full credit approved)"
                      value={approvalNotesInput}
                      onChange={e => setApprovalNotesInput(e.target.value)}
                      style={{ flex: 1, minWidth: "260px" }}
                    />
                    
                    <button
                      disabled={approvingResult}
                      onClick={() => handleApproveResult(sessionDetails.session_token, sessionDetails.student_name)}
                      className="btn btn-emerald"
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.35rem" }}
                    >
                      <CheckCircle2 size={16} />
                      {sessionDetails.is_approved ? "Update Approval Remarks" : "Approve & Release Scorecard"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.75rem" }}>
                  <button onClick={() => setActiveSessionToken(null)} className="btn btn-secondary">
                    Close Audit Sheet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
