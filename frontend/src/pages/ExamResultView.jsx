import React, { useState, useEffect } from "react";
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  ArrowLeft, 
  Printer, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  Check, 
  X, 
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const ExamResultView = ({ sessionToken, onBackToDashboard }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [filterType, setFilterType] = useState("all"); // "all", "correct", "incorrect"

  useEffect(() => {
    let isMounted = true;
    const loadResult = async () => {
      try {
        setLoading(true);
        const data = await api.getSessionResult(sessionToken);
        if (isMounted) {
          setResultData(data);
        }
      } catch (err) {
        showToast(err.message || "Failed to load examination results", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (sessionToken) {
      loadResult();
    }

    return () => {
      isMounted = false;
    };
  }, [sessionToken]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !resultData) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <RefreshCw size={36} className="spin-animation" style={{ margin: "0 auto 1rem", color: "#818cf8" }} />
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
          Synthesizing AI Evaluation & Integrity Scorecard...
        </div>
      </div>
    );
  }

  const {
    exam_title,
    exam_subject,
    student_name,
    student_register_number,
    student_department,
    total_marks,
    obtained_marks,
    percentage,
    passed,
    duration_spent_seconds,
    questions_count,
    answered_count,
    correct_count,
    question_breakdown,
    proctoring_summary,
    is_approved,
    approved_at,
    approved_by_name,
    approval_notes
  } = resultData;

  const isStudent = user?.role === "STUDENT";

  const formatDuration = (secs) => {
    if (!secs) return "N/A";
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  // If student and result is not approved yet: show Preliminary Scorecard + Locked Deep Breakdown
  if (isStudent && !is_approved) {
    return (
      <div className="page-container" style={{ maxWidth: "1350px", margin: "0 auto" }}>
        {/* Top Action Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <button
            onClick={onBackToDashboard}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1.4rem" }}
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </button>

          <span className="badge badge-under-review" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", fontWeight: 700 }}>
            <Clock size={14} /> Preliminary Result &bull; Awaiting Examiner Approval
          </span>
        </div>

        {/* Hero Scorecard Banner - Preliminary Marks */}
        <div
          className="glass-card"
          style={{
            padding: "3rem 3.5rem",
            marginBottom: "3rem",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(99, 102, 241, 0.14) 100%)",
            border: "1.5px solid rgba(245, 158, 11, 0.45)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "2.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 0 35px rgba(245, 158, 11, 0.5)",
                flexShrink: 0
              }}
            >
              <Award size={46} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                  Preliminary Score: {obtained_marks} / {total_marks}
                </h1>
                <span className={`badge ${passed ? "badge-approved" : "badge-pending"}`} style={{ fontSize: "0.85rem", padding: "0.35rem 0.9rem", fontWeight: 800 }}>
                  {passed ? "PRELIMINARY PASS" : "PENDING AUDIT"}
                </span>
              </div>

              <div style={{ fontSize: "1rem", color: "var(--text-muted)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{exam_title}</span>
                <span>&bull;</span>
                <span>{exam_subject}</span>
                <span>&bull;</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary-light)" }}>
                  Candidate: {student_name} ({student_register_number || "REG2024"})
                </span>
              </div>
            </div>
          </div>

          {/* Preliminary Score Pill */}
          <div style={{ textAlign: "right", background: "rgba(15, 23, 42, 0.8)", padding: "1.25rem 2rem", borderRadius: "var(--radius-lg)", border: "1px solid rgba(245, 158, 11, 0.35)" }}>
            <div style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              PRELIMINARY MARK
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#fbbf24", fontFamily: "var(--font-mono)", lineHeight: 1.15 }}>
              {obtained_marks} <span style={{ fontSize: "1.25rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {total_marks}</span>
            </div>
            <div style={{ fontSize: "0.925rem", color: "#6ee7b7", fontWeight: 700, marginTop: "0.3rem" }}>
              {percentage}% Calculated Score
            </div>
          </div>
        </div>

        {/* KPI Stats Summary Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.75rem", marginBottom: "3rem" }}>
          
          {/* Marks Awarded */}
          <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", background: "rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
              <Award size={26} />
            </div>
            <div>
              <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Marks Recorded</span>
              <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                {obtained_marks} / {total_marks}
              </span>
            </div>
          </div>

          {/* Time Spent */}
          <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", background: "rgba(99, 102, 241, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
              <Clock size={26} />
            </div>
            <div>
              <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Duration Spent</span>
              <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                {formatDuration(duration_spent_seconds)}
              </span>
            </div>
          </div>

          {/* Questions Completed */}
          <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399" }}>
              <CheckCircle2 size={26} />
            </div>
            <div>
              <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Questions Answered</span>
              <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)" }}>
                {answered_count} / {questions_count} Items
              </span>
            </div>
          </div>

          {/* Proctoring Status */}
          <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", background: "rgba(6, 182, 212, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22d3ee" }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Proctoring Telemetry</span>
              <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#22d3ee" }}>
                Verified ({proctoring_summary?.integrity_score || 100}%)
              </span>
            </div>
          </div>
        </div>

        {/* 4-Step Submission & Evaluation Timeline */}
        <div className="glass-card" style={{ padding: "2.75rem 3rem", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "2rem", color: "var(--text-main)" }}>
            Assessment Lifecycle & Official Release Status
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.75rem", position: "relative" }}>
            {/* Step 1 */}
            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-md)", padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                  ✓
                </div>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "#6ee7b7" }}>Step 1: Submitted</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                Your responses ({answered_count}/{questions_count} answered) and exam duration ({formatDuration(duration_spent_seconds)}) have been securely recorded.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-md)", padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                  ✓
                </div>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "#6ee7b7" }}>Step 2: Scored</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                Preliminary automated grade computed: {obtained_marks} / {total_marks} Marks ({percentage}%).
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: "rgba(245, 158, 11, 0.14)", border: "1.5px solid rgba(245, 158, 11, 0.5)", borderRadius: "var(--radius-md)", padding: "1.75rem", boxShadow: "0 0 20px rgba(245, 158, 11, 0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f59e0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                  3
                </div>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "#fbbf24" }}>Step 3: Faculty Audit</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#fef3c7", lineHeight: 1.55 }}>
                Your faculty examiner is currently auditing your submission, subjective items, and proctoring telemetry.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.75rem", opacity: 0.75 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                  4
                </div>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-muted)" }}>Step 4: Full Solutions</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-subtle)", lineHeight: 1.55 }}>
                Complete question-by-question breakdown, options comparison, and model solutions will unlock upon examiner approval.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Solutions Locked Notice Banner */}
        <div
          className="glass-card"
          style={{
            padding: "3rem 3.5rem",
            marginBottom: "3rem",
            background: "rgba(15, 23, 42, 0.7)",
            border: "1.5px dashed rgba(245, 158, 11, 0.35)",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              color: "#fbbf24"
            }}
          >
            <Sparkles size={32} />
          </div>

          <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            Detailed Question Analysis & Solution Keys Locked
          </h3>
          <p style={{ fontSize: "0.975rem", color: "var(--text-muted)", maxWidth: "720px", margin: "0 auto 2rem", lineHeight: 1.65 }}>
            To preserve institutional examination integrity, complete question-by-question breakdowns, model answers, and individual AI rubric notes are released only after the faculty examiner completes their audit and officially approves the score.
          </p>

          <button
            onClick={onBackToDashboard}
            className="btn btn-primary btn-lg"
            style={{ padding: "0.85rem 2.25rem", fontSize: "1rem" }}
          >
            Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredQuestions = (question_breakdown || []).filter(qb => {
    if (filterType === "correct") return qb.is_correct === true;
    if (filterType === "incorrect") return qb.is_correct === false;
    return true;
  });

  return (
    <div className="page-container" style={{ maxWidth: "1350px", margin: "0 auto" }}>
      {/* Top Action Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.25rem", flexWrap: "wrap", gap: "1.25rem" }}>
        <button
          onClick={onBackToDashboard}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1.4rem" }}
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {is_approved && (
            <span className="badge badge-result-approved" style={{ padding: "0.55rem 1.15rem", fontSize: "0.85rem" }}>
              <CheckCircle2 size={16} /> Official Score Released &bull; Approved by {approved_by_name || "Faculty Examiner"}
            </span>
          )}
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1.4rem" }}
          >
            <Printer size={16} /> Print / Export Scorecard
          </button>
        </div>
      </div>

      {/* Hero Scorecard Banner */}
      <div
        className="glass-card"
        style={{
          padding: "3rem 3.5rem",
          marginBottom: "2.75rem",
          background: passed
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(99, 102, 241, 0.16) 100%)"
            : "linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(99, 102, 241, 0.16) 100%)",
          border: `1.5px solid ${passed ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2.5rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: passed ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #ef4444, #b91c1c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: passed ? "0 0 30px rgba(16, 185, 129, 0.55)" : "0 0 30px rgba(239, 68, 68, 0.55)",
              flexShrink: 0
            }}
          >
            {passed ? <Award size={46} /> : <AlertTriangle size={46} />}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {passed ? "Assessment Passed & Verified" : "Assessment Result Released"}
              </h1>
              <span className={`badge ${passed ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.9rem", padding: "0.35rem 0.9rem", fontWeight: 800 }}>
                {passed ? "PASSED" : "FAILED"}
              </span>
            </div>

            <div style={{ fontSize: "1rem", color: "var(--text-muted)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{exam_title}</span>
              <span>&bull;</span>
              <span>{exam_subject}</span>
              <span>&bull;</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary-light)" }}>
                Candidate: {student_name} ({student_register_number || "REG2024"})
              </span>
            </div>
          </div>
        </div>

        {/* Score Pill */}
        <div style={{ textAlign: "right", background: "rgba(15, 23, 42, 0.8)", padding: "1.25rem 2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-subtle)", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>FINAL VERIFIED SCORE</div>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: passed ? "#34d399" : "#f87171", fontFamily: "var(--font-mono)", lineHeight: 1.15 }}>
            {obtained_marks} <span style={{ fontSize: "1.25rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {total_marks}</span>
          </div>
          <div style={{ fontSize: "0.95rem", color: "var(--primary-light)", fontWeight: 700, marginTop: "0.3rem" }}>
            {percentage}% Verified Accuracy
          </div>
        </div>
      </div>

      {/* Examiner Approval Endorsement Banner */}
      {is_approved && (
        <div
          className="glass-card"
          style={{
            padding: "1.75rem 2.25rem",
            marginBottom: "2.75rem",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399", flexShrink: 0 }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Official Examiner Audit Sign-Off
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-main)", marginTop: "0.2rem", fontWeight: 500 }}>
                {approval_notes || "All candidate submissions, automated evaluations, and proctoring telemetry audited and approved."}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "right" }}>
            <div>Approved by: <strong style={{ color: "#fff" }}>{approved_by_name || "Faculty Examiner"}</strong></div>
            {approved_at && (
              <div style={{ marginTop: "0.15rem" }}>{new Date(approved_at).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}

      {/* KPI Stats Summary Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.75rem", marginBottom: "2.75rem" }}>
        
        {/* Time Spent */}
        <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", background: "rgba(99, 102, 241, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
            <Clock size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Duration Spent</span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
              {formatDuration(duration_spent_seconds)}
            </span>
          </div>
        </div>

        {/* Questions Completed */}
        <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399" }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Questions Answered</span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)" }}>
              {answered_count} / {questions_count} Items
            </span>
          </div>
        </div>

        {/* AI Proctoring Integrity Score */}
        <div className="glass-card" style={{ padding: "1.6rem 1.85rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "var(--radius-md)",
              background: (proctoring_summary?.integrity_score || 100) >= 80 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: (proctoring_summary?.integrity_score || 100) >= 80 ? "#34d399" : "#f87171"
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Proctoring Integrity</span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: (proctoring_summary?.integrity_score || 100) >= 80 ? "#34d399" : "#f87171" }}>
              {proctoring_summary?.integrity_score || 100}% Trust
            </span>
          </div>
        </div>
      </div>

      {/* AI Proctoring Incident Audit Card */}
      <div className="glass-card" style={{ padding: "2rem 2.5rem", marginBottom: "3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <ShieldCheck size={22} color="#818cf8" /> AI Vision & Security Proctoring Audit
          </h3>
          <span className="badge" style={{ background: "rgba(99, 102, 241, 0.18)", color: "#a5b4fc", padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
            Total Events Logged: {proctoring_summary?.total_events || 0}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem" }}>
          {/* Violations Breakdown */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "1rem" }}>
              Security Incidents Breakdown
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Tab Switching & Window Blur:</span>
                <span style={{ fontWeight: 700, color: (proctoring_summary?.events_breakdown?.TAB_SWITCH || 0) > 0 ? "#f87171" : "#34d399" }}>
                  {proctoring_summary?.events_breakdown?.TAB_SWITCH || 0} Events
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Gaze Tracking Divergence:</span>
                <span style={{ fontWeight: 700, color: (proctoring_summary?.events_breakdown?.GAZE_AWAY || 0) > 0 ? "#fbbf24" : "#34d399" }}>
                  {proctoring_summary?.events_breakdown?.GAZE_AWAY || 0} Shifts
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Multiple Faces / Absence:</span>
                <span style={{ fontWeight: 700, color: "#34d399" }}>0 Detected</span>
              </div>
            </div>
          </div>

          {/* Session Trust Certificate */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "0.75rem" }}>
              AI Proctoring Verdict
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              {(proctoring_summary?.integrity_score || 100) >= 85
                ? "Clean examination session verified. Webcam, audio parameters, and browser focus remained compliant with institutional standards."
                : "Minor security deviations recorded during the session. Overall integrity remained within acceptable faculty evaluation parameters."}
            </p>
          </div>
        </div>
      </div>

      {/* Question-by-Question Evaluation Breakdown */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Detailed Question Evaluation Breakdown</h2>
            <p style={{ fontSize: "0.925rem", color: "var(--text-subtle)", marginTop: "0.25rem" }}>
              Compare your submitted answers with model criteria, solution keys, and AI grading notes
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={() => setFilterType("all")}
              className={`btn ${filterType === "all" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
            >
              All ({question_breakdown?.length || 0})
            </button>
            <button
              onClick={() => setFilterType("correct")}
              className={`btn ${filterType === "correct" ? "btn-emerald" : "btn-secondary"}`}
              style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
            >
              Correct ({correct_count})
            </button>
            <button
              onClick={() => setFilterType("incorrect")}
              className={`btn ${filterType === "incorrect" ? "btn-rose" : "btn-secondary"}`}
              style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
            >
              Needs Improvement ({(question_breakdown?.length || 0) - correct_count})
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {filteredQuestions.map((qb) => (
            <div
              key={qb.question_id}
              className="glass-card"
              style={{
                padding: "2.25rem 2.5rem",
                borderLeft: `5px solid ${qb.is_correct ? "#10b981" : "#ef4444"}`
              }}
            >
              {/* Question Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-main)" }}>
                    Q{qb.order}.
                  </span>
                  <span className="badge badge-type">{qb.question_type.replace("_", " ")}</span>
                  <span className="badge badge-pending">{qb.difficulty}</span>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: qb.marks_awarded > 0 ? "#34d399" : "#f87171", fontFamily: "var(--font-mono)" }}>
                    {qb.marks_awarded}
                  </span>
                  <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}> / {qb.marks_possible} Marks</span>
                </div>
              </div>

              {/* Question Text */}
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                {qb.question_text}
              </p>

              {/* Answers Comparison depending on Type */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem", marginBottom: "1.5rem" }}>
                
                {/* Student's Submission */}
                <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-subtle)", display: "block", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    YOUR SUBMISSION
                  </span>

                  {qb.question_type === "MCQ" && (
                    <div>
                      {qb.options.map((opt) => {
                        const isSelected = (qb.selected_option_ids || [])[0] === opt.id;
                        if (!isSelected) return null;
                        return (
                          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: qb.is_correct ? "#34d399" : "#f87171", fontWeight: 700, fontSize: "0.95rem" }}>
                            {qb.is_correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            <span>{opt.option_text}</span>
                          </div>
                        );
                      })}
                      {(!qb.selected_option_ids || qb.selected_option_ids.length === 0) && (
                        <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>No option selected</span>
                      )}
                    </div>
                  )}

                  {qb.question_type === "MULTI_SELECT" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {qb.options.map((opt) => {
                        const isSelected = (qb.selected_option_ids || []).includes(opt.id);
                        if (!isSelected) return null;
                        return (
                          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: opt.is_correct ? "#34d399" : "#f87171", fontSize: "0.925rem", fontWeight: 600 }}>
                            {opt.is_correct ? <Check size={16} /> : <X size={16} />}
                            <span>{opt.option_text}</span>
                          </div>
                        );
                      })}
                      {(!qb.selected_option_ids || qb.selected_option_ids.length === 0) && (
                        <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>No options chosen</span>
                      )}
                    </div>
                  )}

                  {["SHORT_ANSWER", "LONG_ANSWER"].includes(qb.question_type) && (
                    <p style={{ fontSize: "0.925rem", color: "var(--text-main)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {qb.text_answer || <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>No answer provided</span>}
                    </p>
                  )}

                  {qb.question_type === "IMAGE_UPLOAD" && (
                    <div>
                      {qb.image_url ? (
                        <div style={{ marginTop: "0.5rem", maxHeight: "220px", overflow: "hidden", borderRadius: "var(--radius-md)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          <img
                            src={qb.image_url}
                            alt="Student diagram submission"
                            style={{ maxWidth: "100%", maxHeight: "210px", objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>No handwritten diagram uploaded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Model Answer & Key Criteria */}
                <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#34d399", display: "block", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    MODEL CRITERIA & CORRECT ANSWER
                  </span>

                  {qb.question_type === "MCQ" && (
                    <div>
                      {qb.options.map((opt) => {
                        if (!opt.is_correct) return null;
                        return (
                          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#34d399", fontWeight: 800, fontSize: "0.95rem" }}>
                            <CheckCircle2 size={18} />
                            <span>{opt.option_text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {qb.question_type === "MULTI_SELECT" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {qb.options.map((opt) => {
                        if (!opt.is_correct) return null;
                        return (
                          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#34d399", fontSize: "0.925rem", fontWeight: 700 }}>
                            <Check size={16} />
                            <span>{opt.option_text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {["SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD"].includes(qb.question_type) && (
                    <p style={{ fontSize: "0.9rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                      {qb.model_answer || "Standard reference criteria specified by department examiner."}
                    </p>
                  )}
                </div>
              </div>

              {/* AI Evaluator Feedback */}
              {qb.ai_feedback && (
                <div style={{ background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.28)", padding: "1rem 1.35rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Sparkles size={18} color="#818cf8" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.9rem", color: "#c7d2fe", lineHeight: 1.5 }}>
                    <strong>Evaluator Note:</strong> {qb.ai_feedback}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
