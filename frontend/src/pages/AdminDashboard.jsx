import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  PlusCircle, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  GraduationCap,
  Eye,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  FileCheck,
  Mail,
  Building2,
  AlertTriangle,
  UserX
} from "lucide-react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { translateContent } from "../services/translator";

export const AdminDashboard = ({ 
  setCurrentView, 
  onStatsUpdated,
  initialTab = "all" 
}) => {
  const { showToast } = useToast();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab); // "all", "students", "examiners", "exams"

  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [examiners, setExaminers] = useState([]);
  const [exams, setExams] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("ALL");
  const [examinerSearch, setExaminerSearch] = useState("");
  const [examinerStatusFilter, setExaminerStatusFilter] = useState("ALL");
  const [examSearch, setExamSearch] = useState("");
  const [examStatusFilter, setExamStatusFilter] = useState("ALL");

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Examiner Modals state
  const [selectedExaminer, setSelectedExaminer] = useState(null);
  const [showExaminerDetailModal, setShowExaminerDetailModal] = useState(false);
  const [showExaminerRejectModal, setShowExaminerRejectModal] = useState(false);
  const [examinerRejectionReason, setExaminerRejectionReason] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const fetchAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [statsData, studentsData, examinersData, examsData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getStudents().catch(() => []),
        api.getExaminers().catch(() => []),
        api.getExams().catch(() => [])
      ]);

      setStats(statsData);
      setStudents(studentsData || []);
      setExaminers(examinersData || []);
      setExams(examsData || []);

      if (onStatsUpdated && statsData) {
        onStatsUpdated(statsData.pending_approvals || 0);
      }

      if (isRefresh) {
        showToast("Admin governance data synchronized.", "info");
      }
    } catch (err) {
      showToast(err.message || "Failed to load admin dashboard data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Student Actions
  const handleApproveStudent = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.approveStudent(selectedStudent.id);
      showToast(`Student "${selectedStudent.name}" has been APPROVED.`, "success");
      setShowApproveConfirm(false);
      setShowDetailModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStudent = async (reason) => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.rejectStudent(selectedStudent.id, reason);
      showToast(`Student "${selectedStudent.name}" has been REJECTED.`, "info");
      setShowRejectConfirm(false);
      setShowDetailModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Examiner Actions
  const handleApproveExaminer = async (examiner) => {
    setActionLoading(true);
    try {
      const res = await api.approveExaminer(examiner.id);
      showToast(res.message || `Examiner "${examiner.name}" approved successfully!`, "success");
      setShowExaminerDetailModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectExaminer = async () => {
    if (!selectedExaminer) return;
    setActionLoading(true);
    try {
      const res = await api.rejectExaminer(selectedExaminer.id, examinerRejectionReason);
      showToast(res.message || `Examiner "${selectedExaminer.name}" application rejected.`, "info");
      setShowExaminerRejectModal(false);
      setShowExaminerDetailModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Exam Actions
  const handleToggleExamStatus = async (examId, examTitle) => {
    try {
      const updated = await api.toggleExamStatus(examId);
      if (updated.status === "PUBLISHED") {
        showToast(`Exam "${examTitle}" is now PUBLISHED and live for enrolled candidates!`, "success");
      } else {
        showToast(`Exam "${examTitle}" set to DRAFT (hidden from students).`, "info");
      }
      fetchAllData();
    } catch (err) {
      showToast(err.message || "Failed to update exam status", "error");
    }
  };

  const handleDeleteExam = async (examId, examTitle) => {
    if (!window.confirm(`Are you sure you want to delete exam "${examTitle}"?`)) return;
    try {
      await api.deleteExam(examId);
      showToast(`Exam "${examTitle}" deleted successfully.`, "info");
      fetchAllData();
    } catch (err) {
      showToast(err.message || "Failed to delete exam", "error");
    }
  };

  // Filtered Lists
  const filteredStudents = students.filter(s => {
    const matchesSearch = !studentSearch || 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.register_number && s.register_number.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(studentSearch.toLowerCase()));
    
    const matchesStatus = studentStatusFilter === "ALL" || s.approval_status === studentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredExaminers = examiners.filter(e => {
    const matchesSearch = !examinerSearch ||
      e.name.toLowerCase().includes(examinerSearch.toLowerCase()) ||
      e.email.toLowerCase().includes(examinerSearch.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(examinerSearch.toLowerCase()));
    
    const matchesStatus = examinerStatusFilter === "ALL" || e.approval_status === examinerStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredExams = exams.filter(ex => {
    const matchesSearch = !examSearch ||
      ex.title.toLowerCase().includes(examSearch.toLowerCase()) ||
      (ex.subject && ex.subject.toLowerCase().includes(examSearch.toLowerCase())) ||
      (ex.code && ex.code.toLowerCase().includes(examSearch.toLowerCase()));

    const matchesStatus = examStatusFilter === "ALL" || ex.status === examStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const pendingStudentsCount = students.filter(s => s.approval_status === "PENDING").length;
  const approvedStudentsCount = students.filter(s => s.approval_status === "APPROVED").length;
  
  const pendingExaminersCount = examiners.filter(e => e.approval_status === "PENDING").length;
  const approvedExaminersCount = examiners.filter(e => e.approval_status === "APPROVED").length;

  const publishedExamsCount = exams.filter(e => e.status === "PUBLISHED").length;
  const draftExamsCount = exams.filter(e => e.status !== "PUBLISHED").length;

  if (loading && !stats) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <RefreshCw size={36} className="spin-animation" style={{ margin: "0 auto 1rem", color: "#818cf8" }} />
        <div style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
          {t("common.loading", "Loading...")}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* 1. Header Banner */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="badge badge-role-admin">{t("navbar.role_admin", "Institutional Admin")}</span>
            <span style={{ fontSize: "0.785rem", color: "var(--text-subtle)" }}>Central Authority</span>
          </div>
          <h1>{t("admin.dashboard_title", "Institutional Administration")}</h1>
          <p>
            {t("admin.dashboard_sub", "Governance hub strictly managing Enrolled Students, Approval of Examiner, and Available Exams")}
          </p>
        </div>

        <div className="dashboard-actions-group">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            {t("common.refresh", "Sync Portal Data")}
          </button>
          <button
            onClick={() => setActiveTab("examiners")}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: pendingExaminersCount > 0 ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)",
              color: pendingExaminersCount > 0 ? "#fbbf24" : "var(--text-main)"
            }}
          >
            <ShieldCheck size={15} color="#c084fc" />
            {t("sidebar.examiner_approvals", "Approval of Examiner")} ({pendingExaminersCount})
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: pendingStudentsCount > 0 ? "rgba(99, 102, 241, 0.4)" : "var(--border-color)",
              color: pendingStudentsCount > 0 ? "#818cf8" : "var(--text-main)"
            }}
          >
            <Users size={15} color="#818cf8" />
            {t("admin.tab_students", "Student Candidates")} ({pendingStudentsCount})
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className="btn btn-primary btn-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            <Layers size={15} />
            {t("sidebar.available_exams", "Available Exams")} ({exams.length})
          </button>
        </div>
      </div>

      {/* 2. Three Dedicated Pillar KPI Cards */}
      <div className="dashboard-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {/* Pillar 1: Enrolled Students */}
        <div 
          onClick={() => setActiveTab("students")}
          style={{ cursor: "pointer" }}
          title={t("sidebar.enrolled_students", "Enrolled Students")}
        >
          <StatCard
            title={t("sidebar.enrolled_students", "Enrolled Students")}
            value={students.length}
            icon={Users}
            color="indigo"
            subtitle={`${approvedStudentsCount} ${t("common.approved", "Approved Candidates")} • ${pendingStudentsCount} ${t("common.pending", "Pending")}`}
            badgeText={pendingStudentsCount > 0 ? `${pendingStudentsCount} ${t("login.approval_required", "Verification Required")}` : t("landing.approved_badge", "All Verified")}
          />
        </div>

        {/* Pillar 2: Approval of Examiner */}
        <div 
          onClick={() => setActiveTab("examiners")}
          style={{ cursor: "pointer" }}
          title={t("sidebar.examiner_approvals", "Approval of Examiner")}
        >
          <StatCard
            title={t("sidebar.examiner_approvals", "Approval of Examiner")}
            value={examiners.length}
            icon={ShieldCheck}
            color="purple"
            subtitle={`${approvedExaminersCount} ${t("common.approved", "Active Faculty")} • ${pendingExaminersCount} ${t("common.pending", "Pending Verification")}`}
            badgeText={pendingExaminersCount > 0 ? `${pendingExaminersCount} ${t("common.pending", "Awaiting Approval")}` : t("landing.approved_badge", "All Approved")}
          />
        </div>

        {/* Pillar 3: Available Exams */}
        <div 
          onClick={() => setActiveTab("exams")}
          style={{ cursor: "pointer" }}
          title={t("sidebar.available_exams", "Available Exams")}
        >
          <StatCard
            title={t("sidebar.available_exams", "Available Exams")}
            value={exams.length}
            icon={Layers}
            color="emerald"
            subtitle={`${publishedExamsCount} ${t("common.published", "Live in Student Portal")} • ${draftExamsCount} ${t("common.draft", "Draft Papers")}`}
            badgeText={publishedExamsCount > 0 ? `${publishedExamsCount} ${t("common.published", "Published Live")}` : t("common.draft", "No Live Exams")}
          />
        </div>
      </div>

      {/* 3. Pillar Selector Tab Navigation */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
        {[
          { id: "all", label: t("admin.tab_overview", "Unified Overview"), icon: Sparkles, count: null },
          { id: "students", label: t("sidebar.enrolled_students", "Enrolled Students"), icon: Users, count: students.length, badge: pendingStudentsCount },
          { id: "examiners", label: t("sidebar.examiner_approvals", "Approval of Examiner"), icon: ShieldCheck, count: examiners.length, badge: pendingExaminersCount },
          { id: "exams", label: t("sidebar.available_exams", "Available Exams"), icon: Layers, count: exams.length, badge: null }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "0.65rem 1.35rem",
                fontSize: "0.925rem",
                fontWeight: isActive ? 700 : 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem"
              }}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span 
                  style={{ 
                    fontSize: "0.75rem", 
                    padding: "0.15rem 0.5rem", 
                    borderRadius: "9999px",
                    background: isActive ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.1)"
                  }}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge > 0 && (
                <span 
                  style={{ 
                    fontSize: "0.72rem", 
                    fontWeight: 800, 
                    padding: "0.1rem 0.45rem", 
                    borderRadius: "9999px",
                    background: "rgba(245, 158, 11, 0.3)",
                    color: "#fbbf24",
                    border: "1px solid rgba(245, 158, 11, 0.5)"
                  }}
                >
                  {tab.badge} {t("common.pending", "Pending")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. CONTENT SECTIONS */}

      {/* === PILLAR 1: ENROLLED STUDENTS === */}
      {(activeTab === "all" || activeTab === "students") && (
        <div className="glass-card" style={{ padding: "2.25rem 2.5rem", marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Users size={22} color="#818cf8" />
                <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>
                  {t("sidebar.enrolled_students", "Enrolled Students")}
                </h2>
                <span className="badge badge-role-student" style={{ fontSize: "0.78rem" }}>
                  {students.length} {t("common.total", "Total Registered")}
                </span>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-subtle)", margin: "0.35rem 0 0" }}>
                Candidate verification roster, institutional enrollment, and examination clearance
              </p>
            </div>

            {/* Filter & Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map(statusKey => (
                  <button
                    key={statusKey}
                    onClick={() => setStudentStatusFilter(statusKey)}
                    className="btn btn-sm"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      background: studentStatusFilter === statusKey ? "rgba(99, 102, 241, 0.25)" : "rgba(30, 41, 59, 0.5)",
                      border: studentStatusFilter === statusKey ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                      color: studentStatusFilter === statusKey ? "#c7d2fe" : "var(--text-muted)"
                    }}
                  >
                    {statusKey === "ALL" ? t("common.all", "ALL") : statusKey === "PENDING" ? t("common.pending", "PENDING") : statusKey === "APPROVED" ? t("common.approved", "APPROVED") : t("common.rejected", "REJECTED")}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
                <input
                  type="text"
                  placeholder={t("common.search", "Search students...")}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    padding: "0.45rem 0.85rem 0.45rem 2.2rem",
                    fontSize: "0.85rem",
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    width: "190px"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{t("admin.tab_students", "Student Candidate")}</th>
                  <th>{t("modals.register_number", "Register Number")}</th>
                  <th>{t("common.department", "Department")}</th>
                  <th>{t("common.status", "Status")}</th>
                  <th>{t("common.created_at", "Registered Date")}</th>
                  <th style={{ textAlign: "right" }}>{t("common.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  (activeTab === "all" ? filteredStudents.slice(0, 6) : filteredStudents).map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{student.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-subtle)", marginTop: "0.2rem" }}>{student.email}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--primary-light)", fontWeight: 700 }}>
                          {student.register_number || "REG-UNASSIGNED"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                          {student.department || "General"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={student.approval_status} />
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-subtle)" }}>
                        {student.created_at ? new Date(student.created_at).toLocaleDateString() : t("common.na", "N/A")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.45rem" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="View Student Candidate Details"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowDetailModal(true);
                            }}
                            style={{ padding: "0.35rem 0.65rem" }}
                          >
                            <Eye size={14} />
                          </button>
                          {student.approval_status === "PENDING" && (
                            <>
                              <button
                                className="btn btn-emerald btn-sm"
                                title="Approve Student Account"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowApproveConfirm(true);
                                }}
                                style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                              >
                                {t("admin.approve_btn", "Approve")}
                              </button>
                              <button
                                className="btn btn-rose btn-sm"
                                title="Reject Student Account"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowRejectConfirm(true);
                                }}
                                style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                              >
                                {t("admin.reject_btn", "Reject")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "3rem" }}>
                      No student records found matching the specified filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {activeTab === "all" && filteredStudents.length > 6 && (
            <div style={{ textAlign: "center", marginTop: "1.25rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <button
                onClick={() => setActiveTab("students")}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.85rem" }}
              >
                View All {filteredStudents.length} {t("sidebar.enrolled_students", "Enrolled Students")} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* === PILLAR 2: APPROVAL OF EXAMINER === */}
      {(activeTab === "all" || activeTab === "examiners") && (
        <div className="glass-card" style={{ padding: "2.25rem 2.5rem", marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <ShieldCheck size={22} color="#c084fc" />
                <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>
                  {t("sidebar.examiner_approvals", "Approval of Examiner")}
                </h2>
                {pendingExaminersCount > 0 ? (
                  <span className="badge badge-pending" style={{ fontSize: "0.78rem" }}>
                    {pendingExaminersCount} {t("common.pending", "Pending Review")}
                  </span>
                ) : (
                  <span className="badge badge-approved" style={{ fontSize: "0.78rem" }}>
                    {t("landing.approved_badge", "All Faculty Approved")}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-subtle)", margin: "0.35rem 0 0" }}>
                Verify and approve faculty examiner credentials before question authoring & exam scheduling privileges are unlocked
              </p>
            </div>

            {/* Filter & Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map(statusKey => (
                  <button
                    key={statusKey}
                    onClick={() => setExaminerStatusFilter(statusKey)}
                    className="btn btn-sm"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      background: examinerStatusFilter === statusKey ? "rgba(168, 85, 247, 0.25)" : "rgba(30, 41, 59, 0.5)",
                      border: examinerStatusFilter === statusKey ? "1px solid #a855f7" : "1px solid var(--border-color)",
                      color: examinerStatusFilter === statusKey ? "#e9d5ff" : "var(--text-muted)"
                    }}
                  >
                    {statusKey === "ALL" ? t("common.all", "ALL") : statusKey === "PENDING" ? t("common.pending", "PENDING") : statusKey === "APPROVED" ? t("common.approved", "APPROVED") : t("common.rejected", "REJECTED")}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
                <input
                  type="text"
                  placeholder={t("common.search", "Search examiners...")}
                  value={examinerSearch}
                  onChange={(e) => setExaminerSearch(e.target.value)}
                  style={{
                    padding: "0.45rem 0.85rem 0.45rem 2.2rem",
                    fontSize: "0.85rem",
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    width: "190px"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Examiners Table */}
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{t("admin.examiner_col", "Faculty Examiner")}</th>
                  <th>{t("admin.department_col", "Department")}</th>
                  <th>{t("admin.status_col", "Credentials & Status")}</th>
                  <th>{t("common.created_at", "Application Date")}</th>
                  <th style={{ textAlign: "right" }}>{t("admin.actions_col", "Governance Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredExaminers.length > 0 ? (
                  (activeTab === "all" ? filteredExaminers.slice(0, 6) : filteredExaminers).map((examiner) => (
                    <tr key={examiner.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              background: examiner.approval_status === "APPROVED" 
                                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))" 
                                : examiner.approval_status === "PENDING"
                                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))"
                                  : "linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.2))",
                              border: `1px solid ${examiner.approval_status === "APPROVED" ? "#10b981" : examiner.approval_status === "PENDING" ? "#f59e0b" : "#f43f5e"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              color: examiner.approval_status === "APPROVED" ? "#34d399" : examiner.approval_status === "PENDING" ? "#fbbf24" : "#fda4af"
                            }}
                          >
                            {examiner.name?.charAt(0) || "F"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{examiner.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <Mail size={12} /> {examiner.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-main)", fontWeight: 600 }}>
                          {examiner.department || "Academic Faculty"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={examiner.approval_status} />
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-subtle)" }}>
                        {examiner.created_at ? new Date(examiner.created_at).toLocaleDateString() : t("common.na", "N/A")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.45rem" }}>
                          {examiner.approval_status === "PENDING" ? (
                            <>
                              <button
                                onClick={() => handleApproveExaminer(examiner)}
                                className="btn btn-emerald btn-sm"
                                style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                              >
                                {t("admin.approve_btn", "Approve Examiner")}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedExaminer(examiner);
                                  setExaminerRejectionReason("Qualifications verification did not satisfy faculty examination board requirements.");
                                  setShowExaminerRejectModal(true);
                                }}
                                className="btn btn-rose btn-sm"
                                style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
                              >
                                {t("admin.reject_btn", "Reject")}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedExaminer(examiner);
                                setShowExaminerDetailModal(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                            >
                              <Eye size={13} /> {t("admin.inspect_btn", "Dossier")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "3rem" }}>
                      No faculty examiner records found matching the specified filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {activeTab === "all" && filteredExaminers.length > 6 && (
            <div style={{ textAlign: "center", marginTop: "1.25rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <button
                onClick={() => setActiveTab("examiners")}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.85rem" }}
              >
                View All {filteredExaminers.length} {t("sidebar.examiner_approvals", "Examiner Approvals")} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* === PILLAR 3: AVAILABLE EXAMS === */}
      {(activeTab === "all" || activeTab === "exams") && (
        <div className="glass-card" style={{ padding: "2.25rem 2.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Layers size={22} color="#34d399" />
                <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>
                  {t("sidebar.available_exams", "Available Exams")}
                </h2>
                <span className="badge badge-approved" style={{ fontSize: "0.78rem" }}>
                  {exams.length} {t("common.active", "Active Blueprints")}
                </span>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-subtle)", margin: "0.35rem 0 0" }}>
                Examination schedules, randomize question papers, duration limits, and candidate access status
              </p>
            </div>

            {/* Search & Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {["ALL", "PUBLISHED", "DRAFT"].map(statusKey => (
                  <button
                    key={statusKey}
                    onClick={() => setExamStatusFilter(statusKey)}
                    className="btn btn-sm"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      background: examStatusFilter === statusKey ? "rgba(16, 185, 129, 0.25)" : "rgba(30, 41, 59, 0.5)",
                      border: examStatusFilter === statusKey ? "1px solid #10b981" : "1px solid var(--border-color)",
                      color: examStatusFilter === statusKey ? "#6ee7b7" : "var(--text-muted)"
                    }}
                  >
                    {statusKey === "ALL" ? t("common.all", "ALL") : statusKey === "PUBLISHED" ? t("common.published", "PUBLISHED") : t("common.draft", "DRAFT")}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
                <input
                  type="text"
                  placeholder={t("examiner.search_exams_placeholder", "Search exams...")}
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  style={{
                    padding: "0.45rem 0.85rem 0.45rem 2.2rem",
                    fontSize: "0.85rem",
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    width: "190px"
                  }}
                />
              </div>

              <button
                onClick={() => setCurrentView("create_exam")}
                className="btn btn-primary btn-sm"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.95rem"
                }}
              >
                <PlusCircle size={15} /> {t("examiner.create_exam_btn", "+ Create Exam")}
              </button>
            </div>
          </div>

          {/* Exams List */}
          {filteredExams.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 2rem", border: "1.5px dashed var(--border-color)", borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}>
              <Layers size={36} color="#818cf8" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.35rem" }}>
                {t("examiner.no_exams_found", "No active examinations found")}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-subtle)", margin: 0 }}>
                Faculty examiners can configure new examinations or randomized papers.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredExams.map(exam => (
                <div
                  key={exam.id}
                  style={{
                    padding: "1.35rem 1.65rem",
                    background: "rgba(15, 23, 42, 0.45)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1.25rem",
                    flexWrap: "wrap",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1.05rem" }}>
                        {exam[`title_${language}`] || translateContent(exam.title, language)}
                      </span>
                      <span className="badge badge-type" style={{ fontSize: "0.75rem" }}>
                        {exam.code || `EXAM-#${exam.id}`} &bull; {exam[`subject_${language}`] || translateContent(exam.subject, language) || "General"}
                      </span>
                      {exam.creator_name && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                          Author: <strong style={{ color: "#c7d2fe" }}>{exam.creator_name}</strong>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", gap: "1rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                      <span>⏱ {exam.duration_minutes} {t("common.mins", "Mins")}</span>
                      <span>&bull;</span>
                      <span>🏆 {exam.total_marks} {t("common.marks", "Marks")}</span>
                      <span>&bull;</span>
                      <span>📝 {exam.questions_count || exam.exam_questions?.length || 0} {t("common.questions", "Questions")}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
                    {exam.status === "PUBLISHED" ? (
                      <span className="badge badge-approved" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <CheckCircle2 size={12} color="#34d399" /> {t("common.published", "Live in Student Portal")}
                      </span>
                    ) : (
                      <span className="badge badge-pending" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <Clock size={12} color="#fbbf24" /> {t("common.draft", "Draft (Hidden)")}
                      </span>
                    )}

                    <button
                      onClick={() => handleToggleExamStatus(exam.id, exam.title)}
                      className={`btn btn-sm ${exam.status === "PUBLISHED" ? "btn-secondary" : "btn-emerald"}`}
                      style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                    >
                      {exam.status === "PUBLISHED" ? t("examiner.toggle_draft", "To Draft") : t("examiner.toggle_publish", "Publish Live")}
                    </button>

                    <button
                      onClick={() => setCurrentView("enrolled_students")}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      <Users size={13} color="#818cf8" /> {t("examiner.candidate_col", "Candidates")}
                    </button>

                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      title="Delete Exam"
                      style={{
                        background: "rgba(244, 63, 94, 0.1)",
                        border: "1px solid rgba(244, 63, 94, 0.25)",
                        color: "#fda4af",
                        borderRadius: "8px",
                        padding: "0.35rem 0.6rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MODALS */}

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onApprove={(s) => {
          setSelectedStudent(s);
          setShowDetailModal(false);
          setShowApproveConfirm(true);
        }}
        onReject={(s) => {
          setSelectedStudent(s);
          setShowDetailModal(false);
          setShowRejectConfirm(true);
        }}
      />

      {/* Approve Student Confirmation Modal */}
      <ConfirmModal
        isOpen={showApproveConfirm}
        title="Approve Student Candidate"
        message={`Are you sure you want to approve candidate "${selectedStudent?.name}" (${selectedStudent?.register_number})? Once approved, the student can log in and take available exams.`}
        confirmText={t("admin.approve_btn", "Approve Candidate")}
        type="emerald"
        loading={actionLoading}
        onConfirm={handleApproveStudent}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Reject Student Confirmation Modal */}
      <ConfirmModal
        isOpen={showRejectConfirm}
        title="Reject Student Registration"
        message={`Are you sure you want to reject registration for "${selectedStudent?.name}"?`}
        confirmText={t("admin.reject_btn", "Reject Registration")}
        type="rose"
        showReasonInput={true}
        reasonPlaceholder="e.g. Student ID does not match university registrar enrollment roster."
        loading={actionLoading}
        onConfirm={handleRejectStudent}
        onCancel={() => setShowRejectConfirm(false)}
      />

      {/* Examiner Reject Modal */}
      {showExaminerRejectModal && selectedExaminer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(244, 63, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f43f5e"
              }}>
                <UserX size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {t("modals.reject_request", "Reject Examiner Application")}
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {selectedExaminer.name} ({selectedExaminer.email})
                </p>
              </div>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Please specify the reason for rejecting this faculty examiner. The applicant will see this notification upon sign-in.
            </p>

            <div className="form-group">
              <label className="form-label">{t("modals.rejection_reason_label", "Rejection Reason *")}</label>
              <textarea
                rows={3}
                className="form-control"
                value={examinerRejectionReason}
                onChange={(e) => setExaminerRejectionReason(e.target.value)}
                placeholder={t("modals.rejection_reason_placeholder", "Enter reason for rejection...")}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => setShowExaminerRejectModal(false)}
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleRejectExaminer}
                className="btn btn-primary"
                style={{ background: "linear-gradient(135deg, #e11d48, #f43f5e)" }}
                disabled={actionLoading || !examinerRejectionReason.trim()}
              >
                {actionLoading ? t("common.processing", "Rejecting...") : t("admin.reject_btn", "Reject Examiner")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Examiner Detail Dossier Modal */}
      {showExaminerDetailModal && selectedExaminer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
                {t("modals.student_dossier", "Examiner Dossier")}
              </h3>
              <StatusBadge status={selectedExaminer.approval_status} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="glass-card" style={{ padding: "1rem", background: "rgba(30, 41, 59, 0.4)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>{t("common.name", "Name")}</div>
                    <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.95rem" }}>{selectedExaminer.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>{t("common.role", "Role")}</div>
                    <div style={{ fontWeight: 600, color: "var(--primary-light)", fontSize: "0.95rem" }}>{selectedExaminer.role}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>{t("common.email", "Email")}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{selectedExaminer.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>{t("common.department", "Department")}</div>
                    <div style={{ color: "var(--text-main)", fontSize: "0.9rem" }}>{selectedExaminer.department || t("common.na", "N/A")}</div>
                  </div>
                </div>
              </div>

              {selectedExaminer.approval_status === "APPROVED" && (
                <div style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#6ee7b7",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>Authorized to author questions and manage examination configurations.</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              {selectedExaminer.approval_status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => {
                    handleApproveExaminer(selectedExaminer);
                  }}
                  className="btn btn-primary"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                >
                  {t("admin.approve_btn", "Approve Examiner")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowExaminerDetailModal(false)}
                className="btn btn-secondary"
              >
                {t("common.close", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
