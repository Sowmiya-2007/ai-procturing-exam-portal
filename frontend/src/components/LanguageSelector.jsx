import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export const LanguageSelector = ({ variant = "navbar" }) => {
  const { language, setLanguage, languages, currentLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="language-selector-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary btn-sm language-selector-btn"
        aria-label="Select Language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.85rem",
          background: "rgba(30, 41, 59, 0.7)",
          borderColor: isOpen ? "var(--primary)" : "var(--border-color)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-main)",
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: isOpen ? "0 0 12px rgba(99, 102, 241, 0.3)" : "none"
        }}
      >
        <Globe size={16} color="#818cf8" />
        <span>{currentLang?.nativeName || currentLang?.name || "English"}</span>
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            color: "var(--text-muted)"
          }}
        />
      </button>

      {isOpen && (
        <div
          className="glass-card language-dropdown-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "200px",
            padding: "0.5rem",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            animation: "fadeIn 0.15s ease-out"
          }}
        >
          <div
            style={{
              padding: "0.4rem 0.6rem 0.3rem",
              fontSize: "0.72rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-subtle)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              marginBottom: "0.25rem"
            }}
          >
            Select Language / மொழி
          </div>

          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: isSelected ? "rgba(99, 102, 241, 0.25)" : "transparent",
                  color: isSelected ? "#a5b4fc" : "var(--text-main)",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "1rem" }}>{lang.flag}</span>
                  <div>
                    <span style={{ display: "block", lineHeight: 1.2 }}>{lang.nativeName}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>{lang.name}</span>
                  </div>
                </div>
                {isSelected && <Check size={16} color="#818cf8" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
