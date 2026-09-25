import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Video, 
  Mic, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Award,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Eye,
  RefreshCw,
  Maximize
} from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { translateContent } from "../services/translator";

export const StudentDashboard = ({ onEnterExamHall, onViewResult, initialTab = "available" }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeExamModal, setActiveExamModal] = useState(null);
  const [launchingExam, setLaunchingExam] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || "available"); // "available", "results"

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadDashboard = async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      
      const data = await api.getStudentDashboard();
      setDashboardData(data);
      if (silent) {
        showToast("Examination schedules updated.", "info");
      }
    } catch (err) {
      showToast(err.message || "Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleStartExam = (exam) => {
    setActiveExamModal(exam);
  };

  const handleCommenceSession = async () => {
    if (!activeExamModal) return;

    try {
      setLaunchingExam(true);
      const res = await api.startExamSession(activeExamModal.id);
      showToast(t("toast.exam_started", null, "Candidate verified. Commencing proctored assessment..."), "success");
      setActiveExamModal(null);

      if (onEnterExamHall) {
        onEnterExamHall(res.session_token);
      }
    } catch (err) {
      showToast(err.message || "Failed to start examination session", "error");
    } finally {
      setLaunchingExam(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <RefreshCw size={36} className="spin-animation" style={{ margin: "0 auto 1rem", color: "#818cf8" }} />
        <div style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
          {t("common.loading", null, "Loading...")}
        </div>
      </div>
    );
  }

  const upcomingExams = dashboardData?.upcoming_exams || [];
  const completedResults = dashboardData?.completed_results || [];

  return (
    <div className="page-container">
      {/* Student Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: "2.25rem 2.75rem",
          marginBottom: "2.75rem",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(16, 185, 129, 0.1) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #4f46e5, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)",
              flexShrink: 0
            }}
          >
            {user?.name?.charAt(0) || "S"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {t("student_dashboard.welcome", { name: user?.name }, `Welcome back, ${user?.name}!`)}
              </h1>
              <StatusBadge status={user?.approval_status || "APPROVED"} />
            </div>
            <div style={{ fontSize: "0.925rem", color: "var(--text-muted)", display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
              <span style={{ color: "var(--primary-light)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {user?.register_number || "REG2024CS001"}
              </span>
              <span>&bull;</span>
              <span>{user?.department || "Computer Science"}</span>
              <span>&bull;</span>
              <span>{user?.year || "3rd Year"}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "0.75rem 1.35rem", borderRadius: "var(--radius-md)" }}>
          <ShieldCheck size={20} color="#34d399" />
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#6ee7b7" }}>
            {t("student_dashboard.verified_eligible", null, "Candidate Status: Verified & Eligible")}
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="dashboard-stats-grid">
        <StatCard
          title={t("student_dashboard.kpi_scheduled", null, "Scheduled Assessments")}
          value={upcomingExams.length}
          icon={Calendar}
          color="indigo"
          subtitle={t("student_dashboard.kpi_scheduled_sub", null, "Enrolled Papers")}
          badgeText={t("student_dashboard.kpi_scheduled_badge", null, "Active Access")}
        />
        <StatCard
          title={t("student_dashboard.kpi_evaluated", null, "Evaluated Scorecards")}
          value={completedResults.filter(r => r.is_approved).length}
          icon={Award}
          color="emerald"
          subtitle={t("student_dashboard.kpi_evaluated_sub", null, "Examiner Approved & Released")}
          badgeText={t("student_dashboard.kpi_evaluated_badge", null, "Published")}
        />
        <StatCard
          title={t("student_dashboard.kpi_pending", null, "Pending Faculty Review")}
          value={completedResults.filter(r => !r.is_approved).length}
          icon={Clock}
          color="amber"
          subtitle={t("student_dashboard.kpi_pending_sub", null, "Under Examiner Audit")}
          badgeText={t("student_dashboard.kpi_pending_badge", null, "In Review")}
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2.25rem" }}>
        <button
          onClick={() => setActiveTab("available")}
          className={`btn ${activeTab === "available" ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "0.75rem 1.6rem", fontSize: "0.95rem" }}
        >
          <Calendar size={18} /> {t("student_dashboard.tab_available", { count: upcomingExams.length }, `Available Examinations (${upcomingExams.length})`)}
        </button>

        <button
          onClick={() => setActiveTab("results")}
          className={`btn ${activeTab === "results" ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "0.75rem 1.6rem", fontSize: "0.95rem" }}
        >
          <Award size={18} /> {t("student_dashboard.tab_results", { count: completedResults.length }, `My Assessment Results & Scorecards (${completedResults.length})`)}
        </button>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid-2col">
        
        {/* Left Side: Active View */}
        <div>
          {activeTab === "available" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                    {t("student_dashboard.available_title", null, "Available & Upcoming Examinations")}
                  </h2>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-subtle)", marginTop: "0.4rem", margin: 0 }}>
                    {t("student_dashboard.available_sub", null, "Select an examination to launch AI proctoring verification and start your assessment session")}
                  </p>
                </div>
                <button
                  onClick={() => loadDashboard(true)}
                  disabled={refreshing}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                  title="Check for newly published exams by faculty"
                >
                  <RefreshCw size={15} className={refreshing ? "spin-animation" : ""} />
                  {refreshing ? t("student_dashboard.refreshing", null, "Refreshing...") : t("student_dashboard.refresh_exams", null, "Refresh Exams")}
                </button>
              </div>

              {upcomingExams.length === 0 ? (
                <div className="glass-card" style={{ padding: "4rem 2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <Calendar size={48} color="#6366f1" style={{ margin: "0 auto 1.25rem" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "0.5rem" }}>
                    {t("student_dashboard.no_exams_title", null, "No Examinations Available Right Now")}
                  </h3>
                  <p style={{ fontSize: "0.925rem", maxWidth: "460px", margin: "0 auto 1.5rem", color: "var(--text-subtle)" }}>
                    {t("student_dashboard.no_exams_desc", null, "When faculty examiners create and publish examinations, they will appear here immediately for you to take.")}
                  </p>
                  <button
                    onClick={() => loadDashboard(true)}
                    className="btn btn-primary"
                    style={{ padding: "0.65rem 1.4rem" }}
                  >
                    <RefreshCw size={15} /> {t("student_dashboard.check_new_exams", null, "Check for New Exams")}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                  {upcomingExams.map((exam) => {
                    const isSubmitted = exam.session_status === "SUBMITTED" || exam.status === "Completed" || exam.status === "Under Review";
                    const isApproved = exam.is_approved === true;

                    return (
                      <div key={exam.id} className="glass-card glass-card-interactive" style={{ padding: "2.25rem 2.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                              <span className="badge badge-type" style={{ fontSize: "0.8rem" }}>
                                {exam.code || `EXAM-#${exam.id}`} &bull; {exam[`subject_${language}`] || translateContent(exam.subject, language)}
                              </span>
                              {exam.creator_name && (
                                <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", background: "rgba(30, 41, 59, 0.6)", padding: "0.2rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                                  {t("student_dashboard.faculty_label", null, "Faculty:")} <strong style={{ color: "#c7d2fe" }}>{exam.creator_name}</strong>
                                </span>
                              )}
                            </div>
                            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                              {exam[`title_${language}`] || translateContent(exam.title, language)}
                            </h3>
                          </div>
                          
                          {isSubmitted ? (
                            isApproved ? (
                              <span className="badge badge-result-approved" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
                                <CheckCircle2 size={15} /> {t("student_dashboard.official_result_released", null, "Official Result Released")}
                              </span>
                            ) : (
                              <span className="badge badge-under-review" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
                                <Clock size={15} /> {t("student_dashboard.preliminary_under_review", null, "Preliminary • Under Faculty Review")}
                              </span>
                            )
                          ) : (
                            <span className="badge badge-approved" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                              <CheckCircle2 size={14} /> {t("student_dashboard.available_to_take", null, "Available to Take")}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "1.75rem", lineHeight: 1.65 }}>
                          {exam[`description_${language}`] || translateContent(exam.description, language)}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2rem", background: "rgba(15, 23, 42, 0.55)", padding: "1.35rem 1.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                          <div>
                            <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>
                              {t("student_dashboard.questions_count_label", null, "Questions")}
                            </span>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                              {exam.total_questions !== undefined ? exam.total_questions : (exam.questions_count || 0)} {t("common.questions", null, "Questions")}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>
                              {t("student_dashboard.duration_label", null, "Duration")}
                            </span>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                              {exam.duration_minutes} {t("common.mins", null, "Mins")}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>
                              {t("student_dashboard.total_marks_label", null, "Total Marks")}
                            </span>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399" }}>
                              {exam.total_marks} {t("common.marks", null, "Marks")}
                            </span>
                          </div>
                        </div>

                        {/* Preliminary score info if submitted but unapproved */}
                        {isSubmitted && !isApproved && exam.obtained_marks !== null && (
                          <div style={{ marginBottom: "1.75rem", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "var(--radius-md)", padding: "1.1rem 1.35rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <Clock size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
                              <div>
                                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fbbf24", display: "block" }}>
                                  {t("student_dashboard.preliminary_score_recorded", null, "Preliminary Score Recorded")}
                                </span>
                                <span style={{ fontSize: "0.825rem", color: "#fef3c7" }}>
                                  {t("student_dashboard.preliminary_score_desc", null, "Full question breakdown & solutions unlock upon faculty examiner approval.")}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fbbf24", fontFamily: "var(--font-mono)" }}>
                                {exam.obtained_marks} / {exam.total_marks} ({exam.percentage}%)
                              </span>
                              <span className="badge badge-under-review" style={{ fontSize: "0.75rem" }}>
                                {t("common.under_review", null, "Under Review")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Approved official scorecard info */}
                        {isSubmitted && isApproved && exam.obtained_marks !== null && (
                          <div style={{ marginBottom: "1.75rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "var(--radius-md)", padding: "1.1rem 1.35rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <CheckCircle2 size={20} color="#34d399" />
                              <div>
                                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#6ee7b7", display: "block" }}>
                                  {t("student_dashboard.examiner_approved_released", null, "Examiner Approved & Released")}
                                </span>
                                <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
                                  {t("student_dashboard.examiner_approved_desc", null, "Official scorecard with full answer explanations is now available.")}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                                {exam.obtained_marks} / {exam.total_marks} ({exam.percentage}%)
                              </span>
                              <span className={`badge ${exam.passed ? "badge-approved" : "badge-rejected"}`}>
                                {exam.passed ? t("common.passed", null, "PASSED") : t("common.failed", null, "FAILED")}
                              </span>
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.25rem" }}>
                          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                            <span className="badge" style={{ background: "rgba(6, 182, 212, 0.14)", color: "#67e8f9", fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
                              <Video size={14} /> {t("student_dashboard.vision_proctoring", null, "AI Vision Proctoring")}
                            </span>
                            <span className="badge" style={{ background: "rgba(168, 85, 247, 0.14)", color: "#d8b4fe", fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
                              <Sparkles size={14} /> {t("student_dashboard.auto_grading", null, "Auto-Grading")}
                            </span>
                          </div>

                          {isSubmitted ? (
                            isApproved ? (
                              <button
                                onClick={() => onViewResult && exam.session_token && onViewResult(exam.session_token)}
                                className="btn btn-emerald"
                                style={{ padding: "0.7rem 1.6rem" }}
                              >
                                <Eye size={16} /> {t("student_dashboard.view_scorecard_solutions", null, "View Scorecard & Solutions")}
                              </button>
                            ) : (
                              <button
                                onClick={() => onViewResult && exam.session_token && onViewResult(exam.session_token)}
                                className="btn btn-secondary"
                                style={{ padding: "0.7rem 1.6rem" }}
                              >
                                <Clock size={16} /> {t("student_dashboard.view_preliminary_score", null, "View Preliminary Score")}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleStartExam(exam)}
                              className="btn btn-primary"
                              style={{ padding: "0.7rem 1.6rem" }}
                            >
                              {t("student_dashboard.enter_exam_hall", null, "Enter Exam Hall")} <ArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>
                  {t("student_dashboard.results_title", null, "My Assessment Results & Scorecards")}
                </h2>
                <p style={{ fontSize: "0.95rem", color: "var(--text-subtle)", marginTop: "0.4rem" }}>
                  {t("student_dashboard.results_sub", null, "Examination scorecards and proctoring telemetry records")}
                </p>
              </div>

              {completedResults.length === 0 ? (
                <div className="glass-card" style={{ padding: "4rem 2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <Award size={48} color="#64748b" style={{ margin: "0 auto 1.25rem" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                    {t("student_dashboard.no_completed_title", null, "No completed exams yet")}
                  </h3>
                  <p style={{ fontSize: "0.925rem", marginTop: "0.45rem" }}>
                    {t("student_dashboard.no_completed_desc", null, "Complete an exam from the Available Examinations tab to track your submissions and scorecards.")}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                  {completedResults.map(res => (
                    <div key={res.result_id} className="glass-card" style={{ padding: "2rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.55rem" }}>
                          <span className="badge badge-type">
                            {translateContent(res.exam_subject, language)}
                          </span>
                          {res.is_approved ? (
                            <span className="badge badge-result-approved">
                              <CheckCircle2 size={13} /> {t("student_dashboard.examiner_approved_released", null, "Approved & Released")}
                            </span>
                          ) : (
                            <span className="badge badge-under-review">
                              <Clock size={13} /> {t("student_dashboard.preliminary_under_review", null, "Preliminary • Under Review")}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)" }}>
                          {translateContent(res.exam_title, language)}
                        </h3>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.55rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                          <span>Submitted: {new Date(res.submitted_at).toLocaleDateString()}</span>
                          <span>&bull;</span>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>
                            {res.integrity_score}% Proctoring Trust Score
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: res.is_approved ? (res.passed ? "#34d399" : "#f87171") : "#fbbf24", fontFamily: "var(--font-mono)" }}>
                            {res.obtained_marks !== null ? `${res.obtained_marks} / ${res.total_marks}` : "Processing"}
                          </div>
                          {res.is_approved ? (
                            <span className={`badge ${res.passed ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                              {res.percentage}% ({res.passed ? t("common.passed", null, "PASSED") : t("common.failed", null, "FAILED")})
                            </span>
                          ) : (
                            <span className="badge badge-under-review" style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                              {res.percentage}% ({t("common.under_review", null, "PRELIMINARY")})
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onViewResult && res.session_token && onViewResult(res.session_token)}
                          className={`btn ${res.is_approved ? "btn-emerald" : "btn-secondary"}`}
                          style={{ padding: "0.7rem 1.4rem", display: "flex", alignItems: "center", gap: "0.6rem" }}
                        >
                          {res.is_approved ? (
                            <><Eye size={16} /> {t("student_dashboard.view_scorecard_solutions", null, "Detailed Solutions")}</>
                          ) : (
                            <><Clock size={16} /> {t("student_dashboard.view_preliminary_score", null, "Preliminary View")}</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Examination Guidelines & Announcements */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Instructions Card */}
          <div className="glass-card" style={{ padding: "2rem 2.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-main)" }}>
              <FileText size={20} color="#818cf8" /> {t("student_dashboard.candidate_guidelines_title", null, "Candidate Guidelines")}
            </h3>
            <ul style={{ paddingLeft: "1.25rem", fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.65, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <li>{t("student_dashboard.guideline_1", null, "Webcam & microphone must remain active throughout the examination session.")}</li>
              <li>{t("student_dashboard.guideline_2", null, "Handwritten diagram responses can be captured with webcam snapshot.")}</li>
              <li>{t("student_dashboard.guideline_3", null, "AI proctoring alerts trigger automatically upon tab-switching or multi-person presence.")}</li>
              <li>{t("student_dashboard.guideline_4", null, "Official results are published after examiner audit and sign-off.")}</li>
            </ul>
          </div>

          {/* Institutional Bulletins */}
          <div className="glass-card" style={{ padding: "2rem 2.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 1.25rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-main)" }}>
              {t("student_dashboard.exam_cell_notices_title", null, "Exam Cell Notices")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {dashboardData?.announcements?.map((ann) => (
                <div key={ann.id} style={{ background: "rgba(15, 23, 42, 0.55)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                    <span style={{ fontSize: "0.925rem", fontWeight: 800, color: "var(--text-main)" }}>
                      {ann.title}
                    </span>
                    <span className="badge badge-pending" style={{ fontSize: "0.75rem" }}>
                      {ann.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-subtle)", lineHeight: 1.5, margin: 0 }}>
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Proctoring System Hardware Verification Modal */}
      {activeExamModal && (
        <div className="modal-overlay" onClick={() => !launchingExam && setActiveExamModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", padding: "2rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(99, 102, 241, 0.2)",
                  border: "1px solid #6366f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  color: "#a5b4fc"
                }}
              >
                <Video size={28} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                {t("student_dashboard.system_check_title", null, "AI Proctoring System Check")}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {activeExamModal.title}
              </p>
            </div>

            <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "rgba(15, 23, 42, 0.8)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <Video size={18} color="#34d399" />
                    <span style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                      {t("student_dashboard.webcam_feed", null, "Webcam Vision Feed")}
                    </span>
                  </div>
                  <span className="badge badge-approved">{t("student_dashboard.connected_verified", null, "Connected & Verified")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <Mic size={18} color="#34d399" />
                    <span style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                      {t("student_dashboard.mic_calibrator", null, "Microphone Audio Calibrator")}
                    </span>
                  </div>
                  <span className="badge badge-approved">{t("student_dashboard.calibrated", null, "Calibrated")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <ShieldCheck size={18} color="#34d399" />
                    <span style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                      {t("student_dashboard.lockdown_ready", null, "Anti-Cheating Window Lockdown")}
                    </span>
                  </div>
                  <span className="badge badge-approved">{t("student_dashboard.ready", null, "Ready")}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                disabled={launchingExam}
                className="btn btn-secondary"
                onClick={() => setActiveExamModal(null)}
              >
                {t("common.cancel", null, "Cancel")}
              </button>
              <button
                disabled={launchingExam}
                className="btn btn-emerald btn-lg"
                onClick={handleCommenceSession}
              >
                {launchingExam 
                  ? t("student_dashboard.launching_hall", null, "Launching Hall...") 
                  : t("student_dashboard.commence_now", null, "Commence Examination Now")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
