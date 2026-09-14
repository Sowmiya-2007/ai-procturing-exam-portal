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
  X
} from "lucide-react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";
import { useToast } from "../context/ToastContext";

export const AdminDashboard = ({ setCurrentView, onStatsUpdated }) => {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminStats();
      setStats(data);
      if (onStatsUpdated) onStatsUpdated(data.pending_approvals);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleApprove = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.approveStudent(selectedStudent.id);
      showToast(`Student "${selectedStudent.name}" has been APPROVED.`, "success");
      setShowApproveConfirm(false);
      setShowDetailModal(false);
      fetchStats();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.rejectStudent(selectedStudent.id, reason);
      showToast(`Student "${selectedStudent.name}" has been REJECTED.`, "info");
      setShowRejectConfirm(false);
      setShowDetailModal(false);
      fetchStats();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
          Loading Administrator Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="badge badge-role-admin">Institutional Admin</span>
            <span style={{ fontSize: "0.785rem", color: "var(--text-subtle)" }}>Live Governance</span>
          </div>
          <h1>Admin Overview & Controls</h1>
          <p>System oversight, faculty governance, candidate verification, and examination monitoring</p>
        </div>

        <div className="dashboard-actions-group">
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
            onClick={() => setCurrentView("admin_examiners")}
            className="btn btn-secondary btn-sm"
          >
            <ShieldCheck size={15} color="#c084fc" />
            Examiners ({stats?.pending_examiners || 0} Pending)
          </button>
          <button
            onClick={() => setCurrentView("pending_approvals")}
            className="btn btn-primary btn-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
          >
            <UserCheck size={15} />
            Approvals ({stats?.pending_approvals || 0})
          </button>
          <button
            onClick={() => setCurrentView("add_question")}
            className="btn btn-secondary btn-sm"
          >
            <PlusCircle size={15} />
            + Question
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-stats-grid">
        <StatCard
          title="Faculty Examiners"
          value={stats?.total_examiners || 0}
          icon={ShieldCheck}
          color="purple"
          subtitle={`${stats?.pending_examiners || 0} Pending Verification`}
          badgeText={stats?.pending_examiners > 0 ? "Review Required" : "All Approved"}
        />
        <StatCard
          title="Total Students"
          value={stats?.total_students || 0}
          icon={Users}
          color="indigo"
          subtitle="Registered Candidates"
          badgeText="Enrolled"
        />
        <StatCard
          title="Pending Verifications"
          value={(stats?.pending_approvals || 0) + (stats?.pending_examiners || 0)}
          icon={Clock}
          color="amber"
          subtitle="Awaiting Gatekeeper"
          badgeText={(stats?.pending_approvals || 0) + (stats?.pending_examiners || 0) > 0 ? "Action Required" : "All Clear"}
        />
        <StatCard
          title="Approved Candidates"
          value={stats?.approved_students || 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Active Exam Access"
          badgeText="Verified"
        />
        <StatCard
          title="Question Bank Pool"
          value={stats?.total_questions || 0}
          icon={HelpCircle}
          color="cyan"
          subtitle="5 Question Formats"
          badgeText="Active Bank"
        />
      </div>

      {/* Main Content Sections: Pending Approvals & Department Distribution */}
      <div className="dashboard-grid-2col">
        {/* Recent Registrations Table */}
        <div className="glass-card" style={{ padding: "2.25rem 2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>Recent Student Registrations</h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-subtle)", margin: "0.35rem 0 0" }}>
                Candidate verification pipeline & department enrollment
              </p>
            </div>
            <button
              onClick={() => setCurrentView("pending_approvals")}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
            >
              View All Approvals <ArrowRight size={15} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Candidate</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_registrations?.length > 0 ? (
                  stats.recent_registrations.map((student) => (
                    <tr key={student.id}>
                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{student.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-subtle)", marginTop: "0.2rem" }}>{student.email}</div>
                      </td>
                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--primary-light)", fontWeight: 700 }}>
                          {student.register_number || "N/A"}
                        </span>
                      </td>
                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                          {student.department}
                        </span>
                      </td>
                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <StatusBadge status={student.approval_status} />
                      </td>
                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="View Details"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowDetailModal(true);
                            }}
                            style={{ padding: "0.45rem 0.65rem" }}
                          >
                            <Eye size={15} />
                          </button>
                          {student.approval_status === "PENDING" && (
                            <>
                              <button
                                className="btn btn-emerald btn-sm"
                                title="Approve"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowApproveConfirm(true);
                                }}
                                style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-rose btn-sm"
                                title="Reject"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowRejectConfirm(true);
                                }}
                                style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "3.5rem" }}>
                      No candidate submissions logged in the system yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Breakdown & Quick Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Department Breakdown */}
          <div className="glass-card" style={{ padding: "2rem 2.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "1.25rem", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Students by Department
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {stats?.department_counts && Object.keys(stats.department_counts).length > 0 ? (
                Object.entries(stats.department_counts).map(([dept, count]) => (
                  <div key={dept} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.15rem", background: "rgba(15, 23, 42, 0.45)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 600 }}>
                      {dept}
                    </span>
                    <span className="badge badge-role-student" style={{ fontWeight: 800, fontSize: "0.75rem" }}>
                      {count} {count === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.875rem", color: "var(--text-subtle)", textAlign: "center", padding: "1.75rem" }}>
                  No department distribution data yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Administration Hub */}
          <div className="glass-card" style={{ padding: "2rem 2.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 1.25rem", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Quick Governance Links
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div
                className="tool-tile"
                onClick={() => setCurrentView("admin_examiners")}
              >
                <div className="tool-tile-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
                  <ShieldCheck size={20} />
                </div>
                <div className="tool-tile-body">
                  <div className="tool-tile-title">Examiner Governance</div>
                  <div className="tool-tile-subtitle">Approve faculty credentials</div>
                </div>
                <ArrowRight size={16} color="var(--text-subtle)" />
              </div>

              <div
                className="tool-tile"
                onClick={() => setCurrentView("question_bank")}
              >
                <div className="tool-tile-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                  <BookOpen size={20} />
                </div>
                <div className="tool-tile-body">
                  <div className="tool-tile-title">Question Bank Hub</div>
                  <div className="tool-tile-subtitle">Browse & verify item pools</div>
                </div>
                <ArrowRight size={16} color="var(--text-subtle)" />
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={showApproveConfirm}
        title="Approve Student Account"
        message={`Are you sure you want to approve "${selectedStudent?.name}" (${selectedStudent?.register_number})? Once approved, the student will immediately be granted access to log in and attend online examinations.`}
        confirmText="Approve Candidate"
        type="emerald"
        loading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={showRejectConfirm}
        title="Reject Student Registration"
        message={`Are you sure you want to reject registration for "${selectedStudent?.name}"? You can optionally enter a reason below to assist candidate inquiry.`}
        confirmText="Reject Registration"
        type="rose"
        showReasonInput={true}
        reasonPlaceholder="e.g. Student ID does not match university registrar enrollment roster."
        loading={actionLoading}
        onConfirm={handleReject}
        onCancel={() => setShowRejectConfirm(false)}
      />

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
              padding: "1.75rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileSpreadsheet size={20} color="#34d399" />
                  Import Questions to Repository
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Upload Excel, Word, PDF or paste text to bulk extract questions directly into your Question Bank.
                </p>
              </div>
              <button
                onClick={() => setShowExtractModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.4rem 0.6rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <DocumentQuestionExtractor
              isModal={true}
              onClose={() => setShowExtractModal(false)}
              onQuestionsSavedToBank={(createdQuestions) => {
                showToast(`Successfully added ${createdQuestions.length} questions to the bank!`, "success");
                fetchStats();
                setShowExtractModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
