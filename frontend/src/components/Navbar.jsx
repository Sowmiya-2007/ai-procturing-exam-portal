import React from "react";
import { Cpu, LogOut, User, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { RoleBadge, StatusBadge } from "./StatusBadge";
import { LanguageSelector } from "./LanguageSelector";

export const Navbar = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated, isStudent, isExaminer, isAdmin, logout } = useAuth();
  const { t } = useLanguage();

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
        height: "76px",
        background: "rgba(11, 15, 25, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2.75rem",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}
    >
      {/* Brand */}
      <div
        onClick={handleBrandClick}
        style={{ display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            padding: "0.65rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)"
          }}
        >
          <Cpu size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em", color: "#ffffff" }}>
              EXAM<span className="gradient-text">.AI</span>
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                background: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                letterSpacing: "0.05em"
              }}
            >
              {t("navbar.intelligent_badge", null, "INTELLIGENT")}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginTop: "0.1rem" }}>
            {t("navbar.brand_sub", null, "College Examination & Evaluation Platform")}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Multilingual Selector */}
        <LanguageSelector />

        {isAuthenticated && user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.95rem",
                background: "rgba(30, 41, 59, 0.65)",
                padding: "0.5rem 1.15rem",
                borderRadius: "9999px",
                border: "1px solid var(--border-color)"
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isExaminer ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
              >
                {user.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  {user.name}
                  <RoleBadge role={user.role} />
                  {isExaminer && user.approval_status && (
                    <StatusBadge status={user.approval_status} />
                  )}
                </div>
                {user.department && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.1rem" }}>
                    {user.department}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title={t("navbar.logout", null, "Logout")}
              style={{ color: "#fb7185", borderColor: "rgba(244, 63, 94, 0.3)", padding: "0.55rem 1.15rem" }}
            >
              <LogOut size={16} />
              {t("navbar.logout", null, "Logout")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setCurrentView("student_login")}
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.55rem 1.15rem" }}
            >
              {t("navbar.student_portal", null, "Student Portal")}
            </button>
            <button
              onClick={() => setCurrentView("student_register")}
              className="btn btn-primary btn-sm"
              style={{ padding: "0.55rem 1.25rem" }}
            >
              {t("navbar.register", null, "Register")}
            </button>
            <button
              onClick={() => setCurrentView("admin_login")}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe", padding: "0.55rem 1.2rem" }}
            >
              {t("navbar.faculty_login", null, "Faculty / Admin Login")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
