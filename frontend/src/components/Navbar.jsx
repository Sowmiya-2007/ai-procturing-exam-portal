import React from "react";
import { Cpu, LogOut, User, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { RoleBadge, StatusBadge } from "./StatusBadge";

export const Navbar = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated, isStudent, isExaminer, isAdmin, logout } = useAuth();

  const handleBrandClick = () => {
    if (!isAuthenticated) {
      setCurrentView("landing");
    } else if (isStudent) {
      setCurrentView("student_dashboard");
    } else if (isExaminer) {
      setCurrentView("examiner_dashboard");
    } else if (isAdmin) {
      setCurrentView("admin_dashboard");
    } else {
      setCurrentView("landing");
    }
  };

  return (
    <header
      style={{
        height: "70px",
        background: "rgba(11, 15, 25, 0.8)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}
    >
      {/* Brand */}
      <div
        onClick={handleBrandClick}
        style={{ display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer" }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            padding: "0.55rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(99, 102, 241, 0.5)"
          }}
        >
          <Cpu size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.01em", color: "#ffffff" }}>
              EXAM<span className="gradient-text">.AI</span>
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                background: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                border: "1px solid rgba(99, 102, 241, 0.3)"
              }}
            >
              INTELLIGENT
            </span>
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>
            College Examination & Evaluation Platform
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {isAuthenticated && user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "rgba(30, 41, 59, 0.6)",
                padding: "0.4rem 0.85rem",
                borderRadius: "9999px",
                border: "1px solid var(--border-color)"
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isExaminer ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#fff"
                }}
              >
                {user.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {user.name}
                  <RoleBadge role={user.role} />
                  {isExaminer && user.approval_status && (
                    <StatusBadge status={user.approval_status} />
                  )}
                </div>
                {user.department && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                    {user.department}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Log Out"
              style={{ color: "#fb7185", borderColor: "rgba(244, 63, 94, 0.3)" }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setCurrentView("student_login")}
              className="btn btn-secondary btn-sm"
            >
              Student Portal
            </button>
            <button
              onClick={() => setCurrentView("student_register")}
              className="btn btn-primary btn-sm"
            >
              Register
            </button>
            <button
              onClick={() => setCurrentView("admin_login")}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe" }}
            >
              Faculty / Admin Login
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
