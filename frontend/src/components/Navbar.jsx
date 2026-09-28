import React, { useState } from "react";
import { Cpu, LogOut, User, Sparkles, ExternalLink, ShieldCheck, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { RoleBadge, StatusBadge } from "./StatusBadge";
import { LanguageSelector } from "./LanguageSelector";

export const Navbar = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated, isStudent, isExaminer, isAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBrandClick = () => {
    setMobileMenuOpen(false);
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

  const handleNavAction = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        height: "76px",
        background: "rgba(10, 15, 26, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2.25rem",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}
    >
      {/* Brand */}
      <div
        onClick={handleBrandClick}
        style={{ display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer", flexShrink: 0 }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            padding: "0.6rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(99, 102, 241, 0.35)"
          }}
        >
          <Cpu size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em", color: "#ffffff" }}>
              EXAM<span className="gradient-text">.AI</span>
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                background: "rgba(99, 102, 241, 0.18)",
                color: "#a5b4fc",
                padding: "0.15rem 0.45rem",
                borderRadius: "6px",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                letterSpacing: "0.04em"
              }}
            >
              {t("navbar.intelligent_badge", null, "INTELLIGENT")}
            </span>
          </div>
          <span style={{ fontSize: "0.725rem", color: "var(--text-subtle)", display: "block", marginTop: "0.05rem" }}>
            {t("navbar.brand_sub", null, "College Examination & Evaluation Platform")}
          </span>
        </div>
      </div>

      {/* Desktop Controls */}
      <div className="navbar-desktop-controls" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Multilingual Selector */}
        <LanguageSelector />

        {isAuthenticated && user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                background: "rgba(30, 41, 59, 0.6)",
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-color)"
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: isExaminer ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}
              >
                {user.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span>{user.name}</span>
                  <RoleBadge role={user.role} />
                  {isExaminer && user.approval_status && (
                    <StatusBadge status={user.approval_status} />
                  )}
                </div>
                {user.department && (
                  <div style={{ fontSize: "0.725rem", color: "var(--text-subtle)", marginTop: "0.05rem" }}>
                    {user.department}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title={t("navbar.logout", null, "Logout")}
              style={{ color: "#fb7185", borderColor: "rgba(244, 63, 94, 0.3)" }}
            >
              <LogOut size={15} />
              <span>{t("navbar.logout", null, "Logout")}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setCurrentView("student_login")}
              className="btn btn-secondary btn-sm"
            >
              {t("navbar.student_portal", null, "Student Portal")}
            </button>
            <button
              onClick={() => setCurrentView("student_register")}
              className="btn btn-primary btn-sm"
            >
              {t("navbar.register", null, "Register")}
            </button>
            <button
              onClick={() => setCurrentView("admin_login")}
              className="btn btn-outline btn-sm"
              style={{ borderColor: "rgba(168, 85, 247, 0.35)", color: "#d8b4fe" }}
            >
              {t("navbar.faculty_login", null, "Faculty / Admin Login")}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Hamburger Button */}
      <div className="navbar-mobile-toggle" style={{ display: "none" }}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-secondary btn-sm"
          style={{ padding: "0.5rem" }}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "76px",
            left: 0,
            right: 0,
            background: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-color)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            zIndex: 99,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Language / மொழி</span>
            <LanguageSelector />
          </div>

          {isAuthenticated && user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#fff"
                  }}
                >
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{user.email || user.department}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="btn btn-secondary"
                style={{ color: "#fb7185", justifyContent: "center" }}
              >
                <LogOut size={16} /> {t("navbar.logout", null, "Logout")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={() => handleNavAction("student_login")}
                className="btn btn-secondary"
                style={{ justifyContent: "center" }}
              >
                {t("navbar.student_portal", null, "Student Portal")}
              </button>
              <button
                onClick={() => handleNavAction("student_register")}
                className="btn btn-primary"
                style={{ justifyContent: "center" }}
              >
                {t("navbar.register", null, "Register")}
              </button>
              <button
                onClick={() => handleNavAction("admin_login")}
                className="btn btn-outline"
                style={{ justifyContent: "center", borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe" }}
              >
                {t("navbar.faculty_login", null, "Faculty / Admin Login")}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

