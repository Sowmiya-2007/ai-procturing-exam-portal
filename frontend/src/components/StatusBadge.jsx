import React from "react";
import { Clock, CheckCircle2, XCircle, Shield, GraduationCap, Award } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export const StatusBadge = ({ status }) => {
  const { t } = useLanguage();

  switch (status?.toUpperCase()) {
    case "PENDING":
      return (
        <span className="badge badge-pending">
          <Clock size={12} />
          {t("status.pending", null, "Pending")}
        </span>
      );
    case "APPROVED":
      return (
        <span className="badge badge-approved">
          <CheckCircle2 size={12} />
          {t("status.approved", null, "Approved")}
        </span>
      );
    case "REJECTED":
      return (
        <span className="badge badge-rejected">
          <XCircle size={12} />
          {t("status.rejected", null, "Rejected")}
        </span>
      );
    default:
      return <span className="badge">{status || t("status.unknown", null, "Unknown")}</span>;
  }
};

export const RoleBadge = ({ role }) => {
  const { t } = useLanguage();

  switch (role?.toUpperCase()) {
    case "ADMIN":
      return (
        <span className="badge badge-role-admin">
          <Shield size={12} />
          {t("status.administrator", null, "Administrator")}
        </span>
      );
    case "EXAMINER":
      return (
        <span className="badge badge-role-examiner">
          <Award size={12} />
          {t("status.examiner", null, "Examiner")}
        </span>
      );
    case "STUDENT":
      return (
        <span className="badge badge-role-student">
          <GraduationCap size={12} />
          {t("status.student", null, "Student")}
        </span>
      );
    default:
      return <span className="badge">{role || t("status.user", null, "User")}</span>;
  }
};

export const DifficultyBadge = ({ difficulty }) => {
  const { t } = useLanguage();

  switch (difficulty?.toUpperCase()) {
    case "EASY":
      return <span className="badge badge-diff-easy">{t("status.easy", null, "Easy")}</span>;
    case "MEDIUM":
      return <span className="badge badge-diff-medium">{t("status.medium", null, "Medium")}</span>;
    case "HARD":
      return <span className="badge badge-diff-hard">{t("status.hard", null, "Hard")}</span>;
    default:
      return <span className="badge">{difficulty}</span>;
  }
};

export const QuestionTypeBadge = ({ type }) => {
  const { t } = useLanguage();

  const labels = {
    MCQ: t("status.mcq_single", null, "MCQ (Single)"),
    MULTI_SELECT: t("status.multi_select", null, "Multi-Select"),
    SHORT_ANSWER: t("status.short_answer", null, "Short Answer"),
    LONG_ANSWER: t("status.long_answer", null, "Long Answer"),
    IMAGE_UPLOAD: t("status.image_upload", null, "Image / Diagram")
  };
  return <span className="badge badge-type">{labels[type] || type}</span>;
};

export const TypeBadge = QuestionTypeBadge;


