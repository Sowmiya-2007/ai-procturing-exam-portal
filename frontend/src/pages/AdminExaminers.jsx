import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, UserCheck, UserX, Clock, Search, Filter, 
  CheckCircle, XCircle, AlertTriangle, Eye, RefreshCw, Mail, 
  Building2, Calendar, FileText
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { StatusBadge } from "../components/StatusBadge";

export const AdminExaminers = () => {
  const { showToast } = useToast();
  const [examiners, setExaminers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState(null);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedExaminer, setSelectedExaminer] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Details Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchExaminers = async () => {
    setLoading(true);
    try {
      const data = await api.getExaminers({ search, status: statusFilter });
      setExaminers(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExaminers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExaminers();
  };

  const handleApprove = async (examiner) => {
    setActionLoading(examiner.id);
    try {
      const res = await api.approveExaminer(examiner.id);
      showToast(res.message || "Examiner approved successfully!", "success");
      fetchExaminers();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (examiner) => {
    setSelectedExaminer(examiner);
    setRejectionReason("Qualifications and institutional credentials did not satisfy examination board requirements.");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedExaminer) return;
    setActionLoading(selectedExaminer.id);
    try {
      const res = await api.rejectExaminer(selectedExaminer.id, rejectionReason);
      showToast(res.message || "Examiner rejected successfully.", "info");
      setRejectModalOpen(false);
      fetchExaminers();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openDetailModal = (examiner) => {
    setSelectedExaminer(examiner);
    setDetailModalOpen(true);
  };

  // Counts
  const pendingCount = examiners.filter(e => e.approval_status === "PENDING").length;
  const approvedCount = examiners.filter(e => e.approval_status === "APPROVED").length;
  const rejectedCount = examiners.filter(e => e.approval_status === "REJECTED").length;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "10px", 
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#a5b4fc"
            }}>
              <ShieldCheck size={22} />
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
              Examiner Approval & Governance
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Review, verify, approve, or reject faculty examiner credentials before question authoring privileges are unlocked.
          </p>
        </div>

        <button 
          onClick={fetchExaminers} 
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh List
        </button>
      </div>

      {/* Filter / Stats Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "ALL", label: "All Examiners", count: examiners.length },
              { id: "PENDING", label: "Pending Review", count: pendingCount, highlight: true },
              { id: "APPROVED", label: "Approved", count: approvedCount },
              { id: "REJECTED", label: "Rejected", count: rejectedCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  border: statusFilter === tab.id ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                  background: statusFilter === tab.id ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  color: statusFilter === tab.id ? "#c7d2fe" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease"
                }}
              >
                {tab.label}
                <span style={{
                  padding: "0.1rem 0.45rem",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  background: tab.highlight && tab.count > 0 ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.1)",
                  color: tab.highlight && tab.count > 0 ? "#fbbf24" : "inherit"
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", minWidth: "280px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }} />
              <input
                type="text"
                placeholder="Search examiner by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: "2.4rem", fontSize: "0.85rem" }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: "0.5rem 0.85rem" }}>
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Examiners Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Examiner</th>
              <th>Email</th>
              <th>Department</th>
              <th>Status</th>
              <th>Registered Date</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 0.5rem" }} />
                  Loading examiners...
                </td>
              </tr>
            ) : examiners.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No examiner accounts found matching the criteria.
                </td>
              </tr>
            ) : (
              examiners.map((examiner) => (
                <tr key={examiner.id} style={{ transition: "background 0.2s ease" }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: examiner.approval_status === "APPROVED" 
                          ? "rgba(16, 185, 129, 0.15)" 
                          : examiner.approval_status === "PENDING" 
                            ? "rgba(245, 158, 11, 0.15)" 
                            : "rgba(244, 63, 94, 0.15)",
                        border: `1px solid ${
                          examiner.approval_status === "APPROVED" ? "#10b981" : examiner.approval_status === "PENDING" ? "#f59e0b" : "#f43f5e"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: examiner.approval_status === "APPROVED" ? "#34d399" : examiner.approval_status === "PENDING" ? "#fbbf24" : "#fda4af",
                        fontWeight: 700,
                        fontSize: "0.85rem"
                      }}>
                        {examiner.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{examiner.name}</div>
                        {examiner.register_number && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                            ID: {examiner.register_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Mail size={14} color="var(--text-subtle)" />
                      {examiner.email}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-main)", fontSize: "0.85rem" }}>
                    {examiner.department || "Academic Department"}
                  </td>
                  <td>
                    <StatusBadge status={examiner.approval_status} />
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {new Date(examiner.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {examiner.approval_status === "PENDING" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleApprove(examiner)}
                          disabled={actionLoading === examiner.id}
                          className="btn btn-primary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            background: "linear-gradient(135deg, #059669, #10b981)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(examiner)}
                          disabled={actionLoading === examiner.id}
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            borderColor: "rgba(244, 63, 94, 0.4)",
                            color: "#fda4af",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem"
                          }}
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openDetailModal(examiner)}
                        className="btn btn-secondary"
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedExaminer && (
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
                  Reject Examiner Application
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {selectedExaminer.name} ({selectedExaminer.email})
                </p>
              </div>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Please specify the reason for rejecting this examiner. The candidate will see this message upon login attempt.
            </p>

            <div className="form-group">
              <label className="form-label">Rejection Reason *</label>
              <textarea
                rows={4}
                className="form-control"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejection..."
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="btn btn-secondary"
                disabled={actionLoading === selectedExaminer.id}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="btn btn-primary"
                style={{ background: "linear-gradient(135deg, #e11d48, #f43f5e)" }}
                disabled={actionLoading === selectedExaminer.id || !rejectionReason.trim()}
              >
                {actionLoading === selectedExaminer.id ? "Rejecting..." : "Reject Examiner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dossier Modal */}
      {detailModalOpen && selectedExaminer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
                Examiner Dossier
              </h3>
              <StatusBadge status={selectedExaminer.approval_status} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="glass-card" style={{ padding: "1rem", background: "rgba(30, 41, 59, 0.4)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Name</div>
                    <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.95rem" }}>{selectedExaminer.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Role</div>
                    <div style={{ fontWeight: 600, color: "var(--primary-light)", fontSize: "0.95rem" }}>{selectedExaminer.role}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Email</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{selectedExaminer.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Department</div>
                    <div style={{ color: "var(--text-main)", fontSize: "0.9rem" }}>{selectedExaminer.department || "N/A"}</div>
                  </div>
                </div>
              </div>

              {selectedExaminer.approval_status === "REJECTED" && (
                <div style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#fda4af"
                }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <AlertTriangle size={15} /> Rejection Reason:
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                    {selectedExaminer.rejection_reason || "No specific reason provided."}
                  </div>
                </div>
              )}

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
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  <span>This examiner is fully authorized to author questions and manage examination configurations.</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              {selectedExaminer.approval_status === "REJECTED" && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleApprove(selectedExaminer);
                  }}
                  className="btn btn-primary"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                >
                  Approve Examiner
                </button>
              )}
              {selectedExaminer.approval_status === "APPROVED" && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openRejectModal(selectedExaminer);
                  }}
                  className="btn btn-secondary"
                  style={{ borderColor: "rgba(244, 63, 94, 0.4)", color: "#fda4af" }}
                >
                  Revoke / Reject
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
