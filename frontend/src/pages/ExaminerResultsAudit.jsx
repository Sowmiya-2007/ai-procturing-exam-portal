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
  CheckCheck
} from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const ExaminerResultsAudit = ({ initialExamId = null, onBack }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "pending", "approved"

  // Inspect Modal
  const [activeSessionToken, setActiveSessionToken] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [overrideInputs, setOverrideInputs] = useState({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [approvingResult, setApprovingResult] = useState(false);
  const [approvalNotesInput, setApprovalNotesInput] = useState("");

  // Load all exams
  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        const data = await api.getExams();
        setExams(data);
        if (data.length > 0 && !selectedExamId) {
          setSelectedExamId(data[0].id);
        }
      } catch (err) {
        showToast(err.message || "Failed to load examinations", "error");
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  // Load submissions when selectedExamId changes
  const loadSubmissions = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const data = await api.getExamSubmissions(selectedExamId);
      setSubmissions(data);
    } catch (err) {
      showToast(err.message || "Failed to load candidate submissions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [selectedExamId]);

  // Open detailed answer sheet modal
  const handleInspect = async (sessionToken) => {
    setActiveSessionToken(sessionToken);
    setModalLoading(true);
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

  const handleSaveOverride = async (questionId) => {
    const newMarks = parseFloat(overrideInputs[questionId]);
    if (isNaN(newMarks) || newMarks < 0) {
      showToast("Please enter a valid non-negative mark", "error");
      return;
    }

    const qb = (sessionDetails?.question_breakdown || []).find(q => q.question_id === questionId);
    if (!qb || !qb.answer_id) {
      showToast("No submitted answer found for this question to grade.", "error");
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
      const refreshedSubs = await api.getExamSubmissions(selectedExamId);
      setSubmissions(refreshedSubs);
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
      
      await loadSubmissions();
    } catch (err) {
      showToast(err.message || "Failed to approve result", "error");
    } finally {
      setApprovingResult(false);
    }
  };

  // Batch approve all pending results for the exam
  const handleApproveAll = async () => {
    if (!selectedExamId) return;
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
      const res = await api.approveAllExamResults(selectedExamId, { notes: "Batch approved by faculty examiner." });
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
      sub.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (sub.student_register_number && sub.student_register_number.toLowerCase().includes(search.toLowerCase())) ||
      sub.student_email.toLowerCase().includes(search.toLowerCase())
    );

    if (!matchesSearch) return false;

    if (filterStatus === "pending") return !sub.is_approved;
    if (filterStatus === "approved") return sub.is_approved;
    return true;
  });

  const selectedExam = exams.find(e => e.id === Number(selectedExamId));
  const pendingSubmissionsCount = submissions.filter(s => !s.is_approved).length;
  const approvedSubmissionsCount = submissions.filter(s => s.is_approved).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1.25rem" }}>
        <div>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: "0.6rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          )}
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Candidate Submissions & Proctoring Audit
          </h1>
          <p style={{ fontSize: "0.925rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
            Inspect candidate answer sheets, verify handwritten diagram uploads, audit AI proctoring telemetry, and approve scorecard releases.
          </p>
        </div>

        {/* Exam Picker & Batch Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>Active Paper:</label>
            <select
              value={selectedExamId || ""}
              onChange={e => setSelectedExamId(Number(e.target.value))}
              className="form-select"
              style={{ width: "280px", background: "rgba(15, 23, 42, 0.9)" }}
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.subject})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleApproveAll}
            disabled={approvingResult || pendingSubmissionsCount === 0}
            className="btn btn-emerald"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.25rem" }}
            title={pendingSubmissionsCount === 0 ? "All submissions approved" : `Release ${pendingSubmissionsCount} pending scorecards`}
          >
            <CheckCheck size={17} /> Approve All ({pendingSubmissionsCount} Pending)
          </button>
        </div>
      </div>

      {/* Exam Summary Stats */}
      {selectedExam && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2.25rem" }}>
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem" }}>Total Submissions</span>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-main)" }}>{submissions.length}</span>
          </div>
          
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem" }}>Pending Faculty Review</span>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fbbf24" }}>
              {pendingSubmissionsCount}
            </span>
          </div>

          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem" }}>Approved & Released</span>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#34d399" }}>
              {approvedSubmissionsCount}
            </span>
          </div>

          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.35rem" }}>Average Integrity Trust</span>
            <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#818cf8" }}>
              {submissions.length > 0
                ? `${Math.round(submissions.reduce((acc, s) => acc + s.integrity_score, 0) / submissions.length)}%`
                : "100%"}
            </span>
          </div>
        </div>
      )}

      {/* Submissions Table & Filters */}
      <div className="glass-card" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          {/* Search Bar */}
          <div style={{ position: "relative", width: "360px" }}>
            <Search size={17} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search candidate name, reg no, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: "2.5rem", width: "100%" }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setFilterStatus("all")}
              className={`btn ${filterStatus === "all" ? "btn-primary" : "btn-secondary"} btn-sm`}
            >
              All ({submissions.length})
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
              Approved ({approvedSubmissionsCount})
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
            <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-main)" }}>No matching candidate submissions found.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Try changing the search query or status filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Score / Max</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Approval Status</th>
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
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-light)" }}>
                      {sub.student_register_number || "REG2024CS001"}
                    </td>
                    <td>{sub.student_department || "Computer Science"}</td>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
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
                        <span className="badge badge-result-approved">
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "900px", maxHeight: "90vh", overflowY: "auto", padding: "2.25rem" }}>
            {modalLoading || !sessionDetails ? (
              <div style={{ textAlign: "center", padding: "4rem 0" }}>
                <RefreshCw size={32} className="spin-animation" style={{ margin: "0 auto 1rem", color: "#818cf8" }} />
                <p>Loading candidate answer sheet and submission telemetry...</p>
              </div>
            ) : (
              <div>
                {/* Modal Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
                      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                        Candidate Answer Sheet: {sessionDetails.student_name}
                      </h2>
                      {sessionDetails.is_approved ? (
                        <span className="badge badge-result-approved"><CheckCircle2 size={13} /> Approved</span>
                      ) : (
                        <span className="badge badge-under-review"><Clock size={13} /> Pending Examiner Release</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Register No: <strong style={{ color: "var(--primary-light)", fontFamily: "var(--font-mono)" }}>{sessionDetails.student_register_number || "REG2024"}</strong> &bull; {sessionDetails.exam_title}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                      {sessionDetails.obtained_marks} / {sessionDetails.total_marks} Marks
                    </div>
                    <span className="badge badge-approved">{sessionDetails.percentage}% Score</span>
                  </div>
                </div>

                {/* Questions Review */}
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
                            style={{ width: "75px", padding: "0.3rem 0.5rem", textAlign: "center", fontWeight: 700 }}
                          />
                          <button
                            disabled={savingGrade}
                            onClick={() => handleSaveOverride(qb.question_id)}
                            className="btn btn-secondary btn-sm"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.85rem" }}>
                        {qb.question_text}
                      </p>

                      {/* Candidate Answer */}
                      <div style={{ background: "rgba(0, 0, 0, 0.35)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "0.85rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "0.4rem", letterSpacing: "0.03em" }}>
                          CANDIDATE SUBMISSION
                        </span>
                        {["SHORT_ANSWER", "LONG_ANSWER"].includes(qb.question_type) && (
                          <p style={{ fontSize: "0.875rem", color: "#f1f5f9", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {qb.text_answer || "No answer provided"}
                          </p>
                        )}
                        {qb.question_type === "IMAGE_UPLOAD" && (
                          <div>
                            {qb.image_url ? (
                              <div style={{ textAlign: "center", maxHeight: "280px", overflow: "hidden", borderRadius: "var(--radius-sm)", background: "#05070e", padding: "0.5rem" }}>
                                <img src={qb.image_url} alt="Candidate diagram" style={{ maxWidth: "100%", maxHeight: "260px", objectFit: "contain" }} />
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "var(--text-subtle)" }}>No diagram uploaded</span>
                            )}
                          </div>
                        )}
                        {["MCQ", "MULTI_SELECT"].includes(qb.question_type) && (
                          <div style={{ fontSize: "0.875rem", color: qb.is_correct ? "#34d399" : "#f87171" }}>
                            {qb.options.filter(o => (qb.selected_option_ids || []).includes(o.id)).map(o => o.option_text).join(", ") || "No option selected"}
                          </div>
                        )}
                      </div>

                      {/* AI Evaluation Feedback */}
                      {qb.ai_feedback && (
                        <div style={{ fontSize: "0.825rem", color: "#c7d2fe", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Sparkles size={14} /> {qb.ai_feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Faculty Approval Box */}
                <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-main)" }}>
                    Examiner Verification & Release Decision
                  </h4>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                    Once approved, the student will immediately receive their finalized scorecard, grades, question breakdowns, and proctoring trust analysis.
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

