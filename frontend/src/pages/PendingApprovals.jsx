import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

export const PendingApprovals = ({ onStatsUpdated }) => {
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // default to pending for this view

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const departments = [
    "ALL",
    "Computer Science & Engineering",
    "Artificial Intelligence & Data Science",
    "Information Technology",
    "Electronics & Communication Engineering",
    "Electrical & Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Biomedical Engineering"
  ];

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents({
        search,
        department,
        status: statusFilter
      });
      setStudents(data);
      if (onStatsUpdated && statusFilter === "PENDING") {
        onStatsUpdated(data.length);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [department, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleApprove = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await api.approveStudent(selectedStudent.id);
      showToast(`Student "${selectedStudent.name}" has been APPROVED. Access unlocked.`, "success");
      setShowApproveConfirm(false);
      setShowDetailModal(false);
      fetchStudents();
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
      fetchStudents();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="badge badge-pending">Registration Gatekeeper</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Student Approval Management
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Verify candidate institutional credentials, inspect student profiles, and grant examination permissions
          </p>
        </div>

        <button onClick={fetchStudents} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh List
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search input */}
          <div style={{ flex: "2", minWidth: "240px", position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Name, Email, or Register Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.5rem" }}
            />
            <Search size={18} color="#9ca3af" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }} />
          </div>

          {/* Department Filter */}
          <div style={{ flex: "1.5", minWidth: "200px" }}>
            <select
              className="form-control"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "ALL" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Status Filter */}
          <div style={{ flex: "1", minWidth: "150px" }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.25rem" }}>
            Search
          </button>
        </form>
      </div>

      {/* Student Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Register Number</th>
                <th>Email</th>
                <th>Department</th>
                <th>Year</th>
                <th>Registration Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    Loading candidate registrations...
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                        {student.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--primary-light)", fontWeight: 700 }}>
                        {student.register_number || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {student.email}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                        {student.department}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.825rem", color: "var(--text-subtle)" }}>
                        {student.year}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
                        {new Date(student.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={student.approval_status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="View Student Details"
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye size={14} />
                          Details
                        </button>
                        {student.approval_status === "PENDING" && (
                          <>
                            <button
                              className="btn btn-emerald btn-sm"
                              title="Approve Student"
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowApproveConfirm(true);
                              }}
                            >
                              <CheckCircle2 size={14} />
                              Approve
                            </button>
                            <button
                              className="btn btn-rose btn-sm"
                              title="Reject Student"
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowRejectConfirm(true);
                              }}
                            >
                              <XCircle size={14} />
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
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "3rem" }}>
                    No student registrations found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Modal */}
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
        title="Confirm Student Approval"
        message={`Are you sure you want to approve "${selectedStudent?.name}" (Reg: ${selectedStudent?.register_number})? This student will now be permitted to log in and sit for scheduled examinations.`}
        confirmText="Confirm & Approve"
        type="emerald"
        loading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={showRejectConfirm}
        title="Confirm Student Rejection"
        message={`Are you sure you want to reject "${selectedStudent?.name}"? You may optionally provide a reason below explaining why verification could not be completed.`}
        confirmText="Reject Registration"
        type="rose"
        showReasonInput={true}
        reasonPlaceholder="e.g. Incomplete institutional documentation or duplicate student ID."
        loading={actionLoading}
        onConfirm={handleReject}
        onCancel={() => setShowRejectConfirm(false)}
      />
    </div>
  );
};
