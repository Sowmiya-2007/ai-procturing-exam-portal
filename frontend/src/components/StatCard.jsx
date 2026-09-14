import React from "react";

export const StatCard = ({ title, value, icon: Icon, color = "indigo", subtitle, badgeText, trend, trendUp }) => {
  const colorMap = {
    indigo: {
      bg: "rgba(99, 102, 241, 0.14)",
      border: "rgba(99, 102, 241, 0.3)",
      text: "#a5b4fc",
      icon: "#818cf8",
      accent: "#6366f1"
    },
    emerald: {
      bg: "rgba(16, 185, 129, 0.14)",
      border: "rgba(16, 185, 129, 0.3)",
      text: "#6ee7b7",
      icon: "#34d399",
      accent: "#10b981"
    },
    amber: {
      bg: "rgba(245, 158, 11, 0.14)",
      border: "rgba(245, 158, 11, 0.3)",
      text: "#fcd34d",
      icon: "#fbbf24",
      accent: "#f59e0b"
    },
    rose: {
      bg: "rgba(244, 63, 94, 0.14)",
      border: "rgba(244, 63, 94, 0.3)",
      text: "#fda4af",
      icon: "#fb7185",
      accent: "#f43f5e"
    },
    purple: {
      bg: "rgba(168, 85, 247, 0.14)",
      border: "rgba(168, 85, 247, 0.3)",
      text: "#d8b4fe",
      icon: "#c084fc",
      accent: "#a855f7"
    },
    cyan: {
      bg: "rgba(6, 182, 212, 0.14)",
      border: "rgba(6, 182, 212, 0.3)",
      text: "#67e8f9",
      icon: "#22d3ee",
      accent: "#06b6d4"
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="glass-card stat-card"
      style={{
        padding: "1.85rem 2.15rem",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderTop: `3.5px solid ${scheme.accent}`,
        borderRadius: "var(--radius-lg)"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.25rem" }}>
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              display: "block",
              marginBottom: "0.45rem"
            }}
          >
            {title}
          </span>
          <div
            style={{
              fontSize: "2.35rem",
              fontWeight: 800,
              color: "var(--text-main)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15
            }}
          >
            {value}
          </div>
        </div>
        <div
          style={{
            background: scheme.bg,
            border: `1px solid ${scheme.border}`,
            color: scheme.icon,
            width: "52px",
            height: "52px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          {Icon && <Icon size={26} />}
        </div>
      </div>

      {(subtitle || badgeText || trend) && (
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.85rem",
            fontSize: "0.875rem"
          }}
        >
          {subtitle && (
            <span style={{ color: "var(--text-subtle)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </span>
          )}
          {badgeText && (
            <span
              style={{
                color: scheme.text,
                fontWeight: 700,
                background: scheme.bg,
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "0.785rem",
                marginLeft: subtitle ? "auto" : "0",
                letterSpacing: "0.02em"
              }}
            >
              {badgeText}
            </span>
          )}
          {trend && (
            <span style={{ color: scheme.text, fontWeight: 700, fontSize: "0.85rem" }}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
