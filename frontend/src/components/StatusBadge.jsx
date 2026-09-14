import React from "react";
import { Clock, CheckCircle2, XCircle, Shield, GraduationCap, Award } from "lucide-react";

export const StatusBadge = ({ status }) => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return (
        <span className="badge badge-pending">
          <Clock size={12} />
          Pending
        </span>
      );
    case "APPROVED":
      return (
        <span className="badge badge-approved">
          <CheckCircle2 size={12} />
          Approved
        </span>
      );
    case "REJECTED":
      return (
        <span className="badge badge-rejected">
          <XCircle size={12} />
          Rejected
        </span>
      );
    default:
      return <span className="badge">{status || "Unknown"}</span>;
  }
};

export const RoleBadge = ({ role }) => {
  switch (role?.toUpperCase()) {
    case "ADMIN":
      return (
        <span className="badge badge-role-admin">
          <Shield size={12} />
          Administrator
        </span>
      );
    case "EXAMINER":
      return (
        <span className="badge badge-role-examiner">
          <Award size={12} />
          Examiner
        </span>
      );
    case "STUDENT":
      return (
        <span className="badge badge-role-student">
          <GraduationCap size={12} />
          Student
        </span>
      );
    default:
      return <span className="badge">{role || "User"}</span>;
  }
};

export const DifficultyBadge = ({ difficulty }) => {
  switch (difficulty?.toUpperCase()) {
    case "EASY":
      return <span className="badge badge-diff-easy">Easy</span>;
    case "MEDIUM":
      return <span className="badge badge-diff-medium">Medium</span>;
    case "HARD":
      return <span className="badge badge-diff-hard">Hard</span>;
    default:
      return <span className="badge">{difficulty}</span>;
  }
};

export const QuestionTypeBadge = ({ type }) => {
  const labels = {
    MCQ: "MCQ (Single)",
    MULTI_SELECT: "Multi-Select",
    SHORT_ANSWER: "Short Answer",
    LONG_ANSWER: "Long Answer",
    IMAGE_UPLOAD: "Image / Diagram"
  };
  return <span className="badge badge-type">{labels[type] || type}</span>;
};

export const TypeBadge = QuestionTypeBadge;

