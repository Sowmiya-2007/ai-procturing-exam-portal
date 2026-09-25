import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert, 
  GraduationCap, 
  FileText, 
  Eye, 
  ArrowLeft,
  Layers,
  Award,
  BookOpen
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { StatCard } from "../components/StatCard";

export const ExaminerEnrolledStudents = ({ initialExamId = null, onBack, onInspectSession }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId ? String(initialExamId) : "ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState({
    total_enrolled: 0,
    completed_count: 0,
    in_progress_count: 0,
    not_started_count: 0,
    students: []
  });

  // Load list of exams for the filter dropdown
  useEffect(() => {
    const loadExams = async () => {
      try {
        const examsList = await api.getExams();
        setExams(examsList || []);
      } catch (err) {
        console.error("Error loading exams:", err);
      }
    };
    loadExams();
  }, []);

  // Fetch enrolled students
  const fetchStudents = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      else setLoading(true);

      const params = {
        exam_id: selectedExamId !== "ALL" ? selectedExamId : undefined,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      };

      const data = await api.getAllEnrolledStudents(params);
      setSummaryData(data);

      if (showRefreshToast) {
        showToast("Enrolled student records synchronized successfully.", "info");
      }
    } catch (err) {
      console.error("Error loading enrolled students:", err);
      showToast(err.message || "Failed to load enrolled students list.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedExamId, statusFilter]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!summaryData.students || summaryData.students.length === 0) {
      showToast("No student data available to export.", "warning");
      return;
    }

    const headers = [
      "Student ID",
      "Student Name",
      "Email",
      "Register Number",
      "Department",
      "Year",
      "Exam ID",
      "Exam Title",
      "Subject",
      "Duration (Mins)",
      "Status",
      "Total Marks",
      "Obtained Marks",
      "Percentage",
      "Result",
      "AI Integrity Score (%)",
      "Violations Count",
      "Started At",
      "Submitted At"
    ];

    const rows = summaryData.students.map(s => [
      s.student_id,
      `"${(s.student_name || "").replace(/"/g, '""')}"`,
      `"${s.student_email || ""}"`,
      `"${s.student_register_number || ""}"`,
      `"${s.student_department || ""}"`,
      `"${s.student_year || ""}"`,
      s.exam_id,
      `"${(s.exam_title || "").replace(/"/g, '""')}"`,
      `"${s.exam_subject || ""}"`,
      s.duration_minutes,
      s.status,
      s.total_marks,
      s.obtained_marks !== null ? s.obtained_marks : "N/A",
      s.percentage !== null ? `${s.percentage}%` : "N/A",
      s.passed !== null ? (s.passed ? "PASSED" : "FAILED") : "N/A",
      `${s.integrity_score}%`,
      s.violations_count,
      s.started_at ? new Date(s.started_at).toLocaleString() : "N/A",
      s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Enrolled_Students_Roster_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Enrolled student roster downloaded as CSV.", "success");
  };

  // Calculations for stats
  const completedStudents = summaryData.students.filter(s => s.status === "SUBMITTED" && s.percentage !== null);
  const avgScore = completedStudents.length > 0
    ? (completedStudents.reduce((acc, s) => acc + (s.percentage || 0), 0) / completedStudents.length).toFixed(1)
    : "—";

  const testedWithIntegrity = summaryData.students.filter(s => s.status !== "NOT_STARTED");
  const avgIntegrity = testedWithIntegrity.length > 0
    ? (testedWithIntegrity.reduce((acc, s) => acc + (s.integrity_score || 100), 0) / testedWithIntegrity.length).toFixed(1)
    : "100.0";

  return (
    <div className="page-container">
      {/* 1. Header Banner */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            {onBack && (
              <button 
                onClick={onBack}
                className="btn btn-secondary"
                style={{ marginBottom: "0.75rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <ArrowLeft size={14} /> {t("examiner.back_studio", "Back to Examiner Studio")}
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc"
              }}>
                <Users size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                  {t("examiner.enrolled_title", "Enrolled Students & Candidate Directory")}
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                  {t("examiner.enrolled_subtitle", "Monitor enrolled candidates, real-time participation status, scorecard assessments, and AI proctoring integrity.")}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => fetchStudents(true)}
              className="btn btn-secondary"
              disabled={refreshing || loading}
              style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
            >
              <RefreshCw size={15} className={refreshing ? "spin" : ""} />
              {refreshing ? t("common.refreshing", "Refreshing...") : t("examiner.refresh_roster", "Refresh Roster")}
            </button>

            <button
              onClick={handleExportCSV}
              className="btn btn-primary"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                fontWeight: 600
              }}
            >
              <Download size={15} />
              {t("examiner.export_csv", "Export CSV Roster")}
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <StatCard
          title={t("examiner.kpi_total_enrolled", "Total Enrolled")}
          value={summaryData.total_enrolled}
          icon={GraduationCap}
          trend={t("examiner.kpi_eligible_candidates", "Eligible Candidates")}
          trendUp={true}
        />
        <StatCard
          title={t("examiner.kpi_completed_graded", "Completed / Graded")}
          value={summaryData.completed_count}
          icon={CheckCircle2}
          trend={`${summaryData.total_enrolled > 0 ? Math.round((summaryData.completed_count / summaryData.total_enrolled) * 100) : 0}% ${t("examiner.turnout", "Turnout")}`}
          trendUp={true}
        />
        <StatCard
          title={t("examiner.kpi_in_progress", "Active / In-Progress")}
          value={summaryData.in_progress_count}
          icon={Clock}
          trend={t("examiner.kpi_live_sessions", "Live Sessions")}
          trendUp={false}
        />
        <StatCard
          title={t("examiner.kpi_not_started", "Not Started")}
          value={summaryData.not_started_count}
          icon={AlertCircle}
          trend={t("examiner.kpi_pending_attempts", "Pending Attempts")}
          trendUp={false}
        />
        <StatCard
          title={t("examiner.kpi_avg_score", "Avg Exam Score")}
          value={avgScore !== "—" ? `${avgScore}%` : "—"}
          icon={Award}
          trend={t("examiner.kpi_assessed_perf", "Assessed Performance")}
          trendUp={Number(avgScore) >= 60}
        />
        <StatCard
          title={t("examiner.kpi_ai_trust", "AI Trust Index")}
          value={`${avgIntegrity}%`}
          icon={ShieldCheck}
          trend={t("examiner.kpi_proctor_integrity", "Proctoring Integrity")}
          trendUp={Number(avgIntegrity) >= 85}
        />
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
          
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ flex: "1 1 300px", display: "flex", gap: "0.5rem" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                className="input-field"
                placeholder={t("examiner.search_candidate_ph", "Search candidate by name, email, register number...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "2.5rem", width: "100%" }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: "0 1rem" }}>
              {t("common.search", "Search")}
            </button>
          </form>

          {/* Exam Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "0 1 auto" }}>
            <Layers size={16} color="#a855f7" />
            <select
              className="input-field"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ minWidth: "220px" }}
            >
              <option value="ALL">{t("examiner.all_configured_exams", "All Configured Examinations")}</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "0.35rem", background: "rgba(15, 23, 42, 0.6)", padding: "0.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            {[
              { id: "ALL", label: t("common.all", "All Status") },
              { id: "SUBMITTED", label: t("common.completed", "Completed") },
              { id: "IN_PROGRESS", label: t("common.in_progress", "In Progress") },
              { id: "NOT_STARTED", label: t("common.not_started", "Not Started") }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: statusFilter === tab.id ? "var(--primary)" : "transparent",
                  color: statusFilter === tab.id ? "#ffffff" : "var(--text-muted)",
                  transition: "all 0.2s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 4. Enrolled Students List Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)" }}>
              {t("examiner.enrolled_candidates_count", "Enrolled Candidates ({count})", { count: summaryData.students?.length || 0 })}
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {selectedExamId === "ALL" 
                ? t("examiner.all_rosters_desc", "Displaying student rosters across all available examinations") 
                : t("examiner.filtered_exam_desc", "Filtered to selected examination #{id}", { id: selectedExamId })}
            </p>
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {t("examiner.showing_enrollments", "Showing {count} registered enrollments", { count: summaryData.students?.length || 0 })}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
            <div className="spin" style={{ display: "inline-block", marginBottom: "1rem" }}>
              <RefreshCw size={28} color="#a855f7" />
            </div>
            <div>{t("examiner.loading_enrolled", "Loading enrolled candidate records...")}</div>
          </div>
        ) : summaryData.students?.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}>
            <Users size={36} color="#818cf8" style={{ margin: "0 auto 0.75rem" }} />
            <h4 style={{ margin: "0 0 0.4rem", color: "var(--text-main)", fontSize: "1.05rem" }}>
              {t("examiner.no_enrolled_found", "No Enrolled Candidates Found")}
            </h4>
            <p style={{ fontSize: "0.85rem", maxWidth: "450px", margin: "0 auto 1.25rem" }}>
              {t("examiner.no_enrolled_desc", "No candidates matched your search criteria or selected examination filters. Try clearing your search or switching filter tabs.")}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedExamId("ALL");
                setStatusFilter("ALL");
              }}
              className="btn btn-secondary btn-sm"
            >
              {t("examiner.reset_filters", "Reset All Filters")}
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 0.5rem" }}>
              <thead>
                <tr style={{ color: "var(--text-subtle)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>{t("examiner.col_candidate_info", "Candidate Info")}</th>
                  <th style={{ padding: "0.75rem 1rem" }}>{t("examiner.col_enrolled_exam", "Enrolled Examination")}</th>
                  <th style={{ padding: "0.75rem 1rem" }}>{t("examiner.col_participation_status", "Participation Status")}</th>
                  <th style={{ padding: "0.75rem 1rem" }}>{t("examiner.col_score_result", "Score & Result")}</th>
                  <th style={{ padding: "0.75rem 1rem" }}>{t("examiner.col_ai_integrity", "AI Integrity Trust")}</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>{t("common.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.students.map((student, idx) => {
                  const isSubmitted = student.status === "SUBMITTED";
                  const isInProgress = student.status === "IN_PROGRESS";
                  const isNotStarted = student.status === "NOT_STARTED";

                  return (
                    <tr 
                      key={`${student.student_id}-${student.exam_id}-${idx}`}
                      style={{
                        background: "rgba(30, 41, 59, 0.35)",
                        borderRadius: "var(--radius-md)",
                        transition: "background 0.2s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(45, 55, 72, 0.5)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(30, 41, 59, 0.35)"}
                    >
                      {/* Candidate Profile */}
                      <td style={{ padding: "1rem", borderTopLeftRadius: "var(--radius-md)", borderBottomLeftRadius: "var(--radius-md)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            {student.student_name ? student.student_name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.925rem" }}>
                              {student.student_name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                              <span>{student.student_email}</span>
                              <span>•</span>
                              <span style={{ color: "#a5b4fc" }}>{student.student_register_number}</span>
                              <span>•</span>
                              <span>{student.student_department} ({student.student_year})</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Examination */}
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.875rem" }}>
                          {student.exam_title}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          {student.exam_subject} • {student.duration_minutes} {t("common.mins", "Mins")} • {t("common.total", "Total")} {student.total_marks} {t("common.marks", "Marks")}
                        </div>
                      </td>

                      {/* Participation Status */}
                      <td style={{ padding: "1rem" }}>
                        {isSubmitted && (
                          <span className="badge badge-approved" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <CheckCircle2 size={12} /> {t("common.completed", "Completed")}
                          </span>
                        )}
                        {isInProgress && (
                          <span className="badge badge-pending" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.4)" }}>
                            <Clock size={12} /> {t("common.in_progress", "In Progress")}
                          </span>
                        )}
                        {isNotStarted && (
                          <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(100, 116, 139, 0.15)", color: "#94a3b8", borderColor: "rgba(100, 116, 139, 0.3)" }}>
                            {t("common.not_started", "Not Started")}
                          </span>
                        )}
                        {student.submitted_at && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "0.25rem" }}>
                            {t("student_dashboard.submitted_on", "Submitted: {date}", { date: new Date(student.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                          </div>
                        )}
                      </td>

                      {/* Score & Result */}
                      <td style={{ padding: "1rem" }}>
                        {student.percentage !== null ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: student.passed ? "#34d399" : "#f87171" }}>
                                {student.obtained_marks} / {student.total_marks}
                              </span>
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                background: student.passed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                color: student.passed ? "#34d399" : "#f87171",
                                border: `1px solid ${student.passed ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                              }}>
                                {student.percentage}% {student.passed ? t("common.passed", "PASSED") : t("common.failed", "FAILED")}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
                            {isInProgress ? t("examiner.test_in_progress", "Test In Progress...") : t("examiner.awaiting_attempt", "Awaiting Candidate Attempt")}
                          </span>
                        )}
                      </td>

                      {/* AI Integrity Trust */}
                      <td style={{ padding: "1rem" }}>
                        {student.status !== "NOT_STARTED" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.5rem",
                              borderRadius: "6px",
                              background: student.integrity_score >= 80 ? "rgba(16, 185, 129, 0.15)" : student.integrity_score >= 60 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: student.integrity_score >= 80 ? "#34d399" : student.integrity_score >= 60 ? "#fbbf24" : "#f87171",
                              border: `1px solid ${student.integrity_score >= 80 ? "rgba(16, 185, 129, 0.3)" : student.integrity_score >= 60 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                            }}>
                              {student.integrity_score >= 80 ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                              {student.integrity_score}% {t("examiner.trust", "Trust")}
                            </span>
                            {student.violations_count > 0 && (
                              <span style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 600 }}>
                                {student.violations_count} {t("examiner.flags", "Flags")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "1rem", textAlign: "right", borderTopRightRadius: "var(--radius-md)", borderBottomRightRadius: "var(--radius-md)" }}>
                        {student.session_token ? (
                          <button
                            onClick={() => {
                              if (onInspectSession) {
                                onInspectSession(student.session_token);
                              } else {
                                showToast(`Candidate Session: ${student.session_token}`, "info");
                              }
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", padding: "0.35rem 0.65rem" }}
                          >
                            <Eye size={13} /> {t("examiner.inspect_answers", "Inspect Answers")}
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                            {t("examiner.no_session_active", "No Session Active")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
