import React, { useState } from "react";
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  HelpCircle, 
  PlusCircle, 
  GraduationCap, 
  FileCheck2, 
  Sparkles, 
  ShieldCheck, 
  Layers,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ currentView, setCurrentView, pendingCount = 0, pendingExaminersCount = 0 }) => {
  const { user, isAdmin, isExaminer, isStudent } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const adminNavItems = [
    { id: "admin_dashboard", label: "Admin Overview", icon: LayoutDashboard },
    { 
      id: "admin_examiners", 
      label: "Examiner Governance", 
      icon: ShieldCheck,
      badge: pendingExaminersCount > 0 ? pendingExaminersCount : null,
      badgeColor: "#fbbf24"
    },
    { 
      id: "pending_approvals", 
      label: "Student Approvals", 
      icon: UserCheck, 
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: "#fbbf24"
    },
    { id: "approved_students", label: "Approved Students", icon: Users },
    { id: "examiner_results_audit", label: "Submissions & Audit", icon: FileCheck2 },
    { id: "question_bank", label: "Question Bank", icon: HelpCircle },
    { id: "add_question", label: "Create Question", icon: PlusCircle },
    { id: "create_exam", label: "Create Exam", icon: Layers }
  ];

  const examinerNavItems = [
    { id: "examiner_dashboard", label: "Examiner Dashboard", icon: LayoutDashboard },
    { id: "enrolled_students", label: "Enrolled Students", icon: Users },
    { id: "examiner_results_audit", label: "Candidate Submissions", icon: FileCheck2 },
    { id: "create_exam", label: "Create Exam (Random)", icon: Layers },
    { id: "question_bank", label: "Question Bank Hub", icon: HelpCircle },
    { id: "add_question", label: "Create Question", icon: PlusCircle }
  ];

  const studentNavItems = [
    { id: "student_dashboard", label: "Student Examination Portal", icon: GraduationCap }
  ];

  let items = [];
  if (isAdmin) items = adminNavItems;
  else if (isExaminer) items = examinerNavItems;
  else if (isStudent) items = studentNavItems;

  return (
    <aside
      style={{
        width: collapsed ? "72px" : "240px",
        background: "rgba(10, 15, 26, 0.75)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: collapsed ? "1.25rem 0.5rem" : "1.25rem 0.85rem",
        minHeight: "calc(100vh - 70px)",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
        position: "sticky",
        top: "70px",
        height: "calc(100vh - 70px)",
        overflowY: "auto"
      }}
    >
      <div>
        {/* Header with Collapse Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: "0 0.5rem 1rem",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "1rem"
          }}
        >
          {!collapsed && (
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", letterSpacing: "0.08em" }}>
              {isAdmin ? "Admin Panel" : isExaminer ? "Faculty Studio" : "Student Portal"}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              borderRadius: "6px",
              padding: "0.3rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease"
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "space-between",
                  padding: collapsed ? "0.7rem 0" : "0.7rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: isActive ? "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)" : "transparent",
                  color: isActive ? "#ffffff" : "var(--text-muted)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  position: "relative",
                  borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(30, 41, 59, 0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <Icon size={18} color={isActive ? "#818cf8" : "#94a3b8"} />
                  {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span
                    style={{
                      background: "rgba(245, 158, 11, 0.18)",
                      color: item.badgeColor,
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "0.1rem 0.45rem",
                      borderRadius: "9999px"
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "8px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: item.badgeColor
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* AI Proctoring Status Pill */}
      {!collapsed ? (
        <div
          className="glass-card"
          style={{
            padding: "0.85rem 1rem",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "var(--radius-sm)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
            <Sparkles size={14} color="#818cf8" />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#c7d2fe" }}>
              AI Engine v2.6
            </span>
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--text-subtle)", lineHeight: 1.35, margin: 0 }}>
            Proctoring & Image Grading Active.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center" }} title="AI Engine v2.6 Active">
          <Sparkles size={18} color="#818cf8" />
        </div>
      )}
    </aside>
  );
};

