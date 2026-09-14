import React, { useState, useEffect } from "react";
import { Users, Search, RefreshCw, Eye, GraduationCap, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { useToast } from "../context/ToastContext";

export const ApprovedStudents = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
        status: "APPROVED"
      });
      setStudents(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [department]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="badge badge-approved">
              <CheckCircle2 size={12} /> Verified Candidates
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Approved Students Directory
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Enrolled candidates authorized to participate in online proctored examinations
          </p>
        </div>

        <button onClick={fetchStudents} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Directory
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
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

          <div style={{ flex: "1.5", minWidth: "220px" }}>
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

          <button type="submit" className="btn btn-primary">
            Search Directory
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Register Number</th>
                <th>Institutional Email</th>
                <th>Department</th>
                <th>Academic Year</th>
                <th>Approval Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    Loading verified students...
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
                      <StatusBadge status="APPROVED" />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye size={14} /> Dossier
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "3rem" }}>
                    No approved students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentDetailModal
        student={selectedStudent}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
};
