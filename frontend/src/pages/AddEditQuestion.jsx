import React, { useState, useEffect } from "react";
import { 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  Save, 
  ArrowLeft, 
  HelpCircle, 
  CheckSquare, 
  Circle, 
  Image as ImageIcon, 
  FileText,
  AlertCircle,
  FileSpreadsheet,
  Edit3,
  Languages,
  Check
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";
import { translateContent, getLocalizedOptionLabel } from "../services/translator";

export const AddEditQuestion = ({ editQuestion = null, setCurrentView }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const isEditing = !!editQuestion;

  const LANGUAGES = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
    { code: "te", name: "Telugu", nativeName: "తెలుగు" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
    { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
    { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" }
  ];

  // Current active language tab for authoring
  const [activeLangTab, setActiveLangTab] = useState("en");

  // Authoring Mode: 'manual', 'ai', 'extractor'
  const [authoringMode, setAuthoringMode] = useState("manual");

  const [questionType, setQuestionType] = useState(editQuestion?.question_type || "MCQ");
  const [subject, setSubject] = useState(editQuestion?.subject || "Artificial Intelligence");
  const [difficulty, setDifficulty] = useState(editQuestion?.difficulty || "MEDIUM");
  const [marks, setMarks] = useState(editQuestion?.marks !== undefined ? editQuestion.marks : 1.0);
  const [negativeMarks, setNegativeMarks] = useState(editQuestion?.negative_marks !== undefined ? editQuestion.negative_marks : 0.0);

  // Multilingual question texts
  const [questionTexts, setQuestionTexts] = useState({
    en: editQuestion?.question_text_en || editQuestion?.question_text || "",
    ta: editQuestion?.question_text_ta || "",
    te: editQuestion?.question_text_te || "",
    hi: editQuestion?.question_text_hi || "",
    ml: editQuestion?.question_text_ml || "",
    kn: editQuestion?.question_text_kn || ""
  });

  // Multilingual model answers / solutions
  const [modelAnswers, setModelAnswers] = useState({
    en: editQuestion?.model_answer_en || editQuestion?.model_answer || "",
    ta: editQuestion?.model_answer_ta || "",
    te: editQuestion?.model_answer_te || "",
    hi: editQuestion?.model_answer_hi || "",
    ml: editQuestion?.model_answer_ml || "",
    kn: editQuestion?.model_answer_kn || ""
  });

  // Multilingual evaluation guidelines
  const [evaluationGuidelines, setEvaluationGuidelines] = useState(editQuestion?.evaluation_guidelines || "");

  // Options state for MCQ / MULTI_SELECT with multilingual fields
  const [options, setOptions] = useState(
    editQuestion?.options?.length > 0
      ? editQuestion.options.map((o) => ({
          is_correct: Boolean(o.is_correct),
          en: o.option_text_en || o.option_text || "",
          ta: o.option_text_ta || "",
          te: o.option_text_te || "",
          hi: o.option_text_hi || "",
          ml: o.option_text_ml || "",
          kn: o.option_text_kn || ""
        }))
      : [
          { is_correct: true, en: "", ta: "", te: "", hi: "", ml: "", kn: "" },
          { is_correct: false, en: "", ta: "", te: "", hi: "", ml: "", kn: "" },
          { is_correct: false, en: "", ta: "", te: "", hi: "", ml: "", kn: "" },
          { is_correct: false, en: "", ta: "", te: "", hi: "", ml: "", kn: "" }
        ]
  );

  useEffect(() => {
    if (editQuestion) {
      setQuestionType(editQuestion.question_type || "MCQ");
      setSubject(editQuestion.subject || "Artificial Intelligence");
      setDifficulty(editQuestion.difficulty || "MEDIUM");
      setMarks(editQuestion.marks !== undefined ? editQuestion.marks : 1.0);
      setNegativeMarks(editQuestion.negative_marks !== undefined ? editQuestion.negative_marks : 0.0);
      
      setQuestionTexts({
        en: editQuestion.question_text_en || editQuestion.question_text || "",
        ta: editQuestion.question_text_ta || "",
        te: editQuestion.question_text_te || "",
        hi: editQuestion.question_text_hi || "",
        ml: editQuestion.question_text_ml || "",
        kn: editQuestion.question_text_kn || ""
      });

      setModelAnswers({
        en: editQuestion.model_answer_en || editQuestion.model_answer || "",
        ta: editQuestion.model_answer_ta || "",
        te: editQuestion.model_answer_te || "",
        hi: editQuestion.model_answer_hi || "",
        ml: editQuestion.model_answer_ml || "",
        kn: editQuestion.model_answer_kn || ""
      });

      setEvaluationGuidelines(editQuestion.evaluation_guidelines || "");

      if (editQuestion.options && editQuestion.options.length > 0) {
        setOptions(
          editQuestion.options.map((o) => ({
            is_correct: Boolean(o.is_correct),
            en: o.option_text_en || o.option_text || "",
            ta: o.option_text_ta || "",
            te: o.option_text_te || "",
            hi: o.option_text_hi || "",
            ml: o.option_text_ml || "",
            kn: o.option_text_kn || ""
          }))
        );
      }
    }
  }, [editQuestion]);

  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const subjectsList = [
    "Artificial Intelligence",
    "Data Structures & Algorithms",
    "Database Systems",
    "Cybersecurity & Networks",
    "Computer Organization",
    "Digital Electronics",
    "Software Engineering",
    "Operating Systems",
    "Mathematics & Statistics"
  ];

  // Adjust default marks when question type changes (if not editing)
  const handleTypeChange = (newType) => {
    setQuestionType(newType);
    if (!isEditing) {
      if (newType === "MCQ") {
        setMarks(1.0);
        setNegativeMarks(0.25);
      } else if (newType === "MULTI_SELECT") {
        setMarks(2.0);
        setNegativeMarks(0.5);
      } else if (newType === "SHORT_ANSWER") {
        setMarks(5.0);
        setNegativeMarks(0.0);
      } else if (newType === "LONG_ANSWER") {
        setMarks(10.0);
        setNegativeMarks(0.0);
      } else if (newType === "IMAGE_UPLOAD") {
        setMarks(15.0);
        setNegativeMarks(0.0);
      }
    }
  };

  const handleOptionTextChange = (idx, text) => {
    const newOpts = [...options];
    newOpts[idx][activeLangTab] = text;
    // Keep English option as default if editing in English
    if (activeLangTab === "en") {
      newOpts[idx].en = text;
    }
    setOptions(newOpts);
  };

  const handleOptionCorrectToggle = (idx) => {
    const newOpts = [...options];
    if (questionType === "MCQ") {
      newOpts.forEach((opt, i) => {
        opt.is_correct = i === idx;
      });
    } else {
      newOpts[idx].is_correct = !newOpts[idx].is_correct;
    }
    setOptions(newOpts);
  };

  const handleAddOption = () => {
    setOptions([...options, { is_correct: false, en: "", ta: "", te: "", hi: "", ml: "", kn: "" }]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) {
      showToast("Questions require at least 2 options.", "warning");
      return;
    }
    const newOpts = options.filter((_, i) => i !== idx);
    setOptions(newOpts);
  };

  // Auto-translate all missing non-English languages from the English text
  const handleAutoTranslateMissing = () => {
    const enQ = questionTexts.en.trim();
    if (!enQ) {
      showToast("Please enter English question prompt first to auto-translate.", "warning");
      return;
    }

    const updatedQ = { ...questionTexts };
    const updatedModel = { ...modelAnswers };

    ["ta", "te", "hi", "ml", "kn"].forEach((lang) => {
      if (!updatedQ[lang] || updatedQ[lang].trim() === "") {
        updatedQ[lang] = translateContent(enQ, lang);
      }
      if (modelAnswers.en && (!updatedModel[lang] || updatedModel[lang].trim() === "")) {
        updatedModel[lang] = translateContent(modelAnswers.en, lang);
      }
    });
    setQuestionTexts(updatedQ);
    setModelAnswers(updatedModel);

    // Also translate options
    const updatedOpts = options.map((opt) => {
      const copy = { ...opt };
      const enOptText = opt.en.trim();
      if (enOptText) {
        ["ta", "te", "hi", "ml", "kn"].forEach((lang) => {
          if (!copy[lang] || copy[lang].trim() === "") {
            copy[lang] = translateContent(enOptText, lang);
          }
        });
      }
      return copy;
    });
    setOptions(updatedOpts);

    showToast("Auto-populated multilingual translations across Tamil, Telugu, Hindi, Malayalam, and Kannada!", "success");
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) {
      showToast("Please enter a topic for AI generation (e.g. Convolutional Neural Networks).", "warning");
      return;
    }
    setGeneratingAi(true);
    try {
      const generated = await api.aiGenerateQuestion({
        topic: aiTopic,
        subject,
        question_type: questionType,
        difficulty
      });

      const genQText = generated.question_text || "";
      setQuestionTexts({
        en: genQText,
        ta: translateContent(genQText, "ta"),
        te: translateContent(genQText, "te"),
        hi: translateContent(genQText, "hi"),
        ml: translateContent(genQText, "ml"),
        kn: translateContent(genQText, "kn")
      });

      setMarks(generated.marks);
      setNegativeMarks(generated.negative_marks);

      if (generated.options && generated.options.length > 0) {
        setOptions(
          generated.options.map((opt) => {
            const optText = opt.option_text || "";
            return {
              is_correct: Boolean(opt.is_correct),
              en: optText,
              ta: translateContent(optText, "ta"),
              te: translateContent(optText, "te"),
              hi: translateContent(optText, "hi"),
              ml: translateContent(optText, "ml"),
              kn: translateContent(optText, "kn")
            };
          })
        );
      }

      if (generated.model_answer) {
        const genModel = generated.model_answer;
        setModelAnswers({
          en: genModel,
          ta: translateContent(genModel, "ta"),
          te: translateContent(genModel, "te"),
          hi: translateContent(genModel, "hi"),
          ml: translateContent(genModel, "ml"),
          kn: translateContent(genModel, "kn")
        });
      }

      if (generated.evaluation_guidelines) {
        setEvaluationGuidelines(generated.evaluation_guidelines);
      }
      showToast(`Synthesized question for "${aiTopic}" with all language versions!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const primaryText = questionTexts.en || questionTexts[activeLangTab];
    if (!primaryText || !primaryText.trim()) {
      setErrorMsg("Question prompt is required.");
      return;
    }

    if (questionType === "MCQ" || questionType === "MULTI_SELECT") {
      const validOpts = options.filter((o) => (o.en || o[activeLangTab] || "").trim() !== "");
      if (validOpts.length < 2) {
        setErrorMsg("Please provide at least 2 valid option choices.");
        return;
      }
      const correctCount = validOpts.filter((o) => o.is_correct).length;
      if (questionType === "MCQ" && correctCount !== 1) {
        setErrorMsg("MCQ (Single choice) must have exactly ONE correct option chosen.");
        return;
      }
      if (questionType === "MULTI_SELECT" && correctCount < 1) {
        setErrorMsg("Multi-Select questions must have at least one correct option chosen.");
        return;
      }
    }

    const payload = {
      question_text: questionTexts.en || primaryText,
      question_type: questionType,
      subject,
      difficulty,
      marks: parseFloat(marks),
      negative_marks: parseFloat(negativeMarks || 0),
      model_answer: modelAnswers.en || modelAnswers[activeLangTab] || null,
      evaluation_guidelines: evaluationGuidelines || null,
      
      // Multilingual fields
      question_text_en: questionTexts.en || primaryText,
      question_text_ta: questionTexts.ta || null,
      question_text_te: questionTexts.te || null,
      question_text_hi: questionTexts.hi || null,
      question_text_ml: questionTexts.ml || null,
      question_text_kn: questionTexts.kn || null,

      explanation_en: modelAnswers.en || null,
      explanation_ta: modelAnswers.ta || null,
      explanation_te: modelAnswers.te || null,
      explanation_hi: modelAnswers.hi || null,
      explanation_ml: modelAnswers.ml || null,
      explanation_kn: modelAnswers.kn || null,

      model_answer_en: modelAnswers.en || null,
      model_answer_ta: modelAnswers.ta || null,
      model_answer_te: modelAnswers.te || null,
      model_answer_hi: modelAnswers.hi || null,
      model_answer_ml: modelAnswers.ml || null,
      model_answer_kn: modelAnswers.kn || null,

      options: (questionType === "MCQ" || questionType === "MULTI_SELECT")
        ? options.map((opt) => ({
            option_text: opt.en || opt[activeLangTab] || "",
            is_correct: opt.is_correct,
            option_text_en: opt.en || opt[activeLangTab] || "",
            option_text_ta: opt.ta || null,
            option_text_te: opt.te || null,
            option_text_hi: opt.hi || null,
            option_text_ml: opt.ml || null,
            option_text_kn: opt.kn || null
          })).filter((o) => o.option_text.trim() !== "")
        : []
    };

    setLoading(true);

    try {
      if (isEditing) {
        await api.updateQuestion(editQuestion.id, payload);
        showToast(`Question #${editQuestion.id} updated with all language translations!`, "success");
      } else {
        await api.createQuestion(payload);
        showToast("New multilingual question saved to repository!", "success");
      }
      setCurrentView("question_bank");
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: "960px", paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <button
          onClick={() => setCurrentView("question_bank")}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} /> {t("add_edit_question.back_to_bank", "Back to Question Bank")}
        </button>
        <h1 style={{ fontSize: "1.65rem", fontWeight: 800, margin: 0 }}>
          {isEditing ? t("add_edit_question.edit_title", "Edit Question #{id}", { id: editQuestion.id }) : t("add_edit_question.add_title", "Create New Assessment Item")}
        </h1>
        <div style={{ width: "80px" }} />
      </div>

      {/* Authoring Mode Switcher */}
      {!isEditing && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.75rem",
            background: "rgba(15, 23, 42, 0.6)",
            padding: "0.35rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)"
          }}
        >
          <button
            type="button"
            onClick={() => setAuthoringMode("manual")}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: authoringMode === "manual" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "transparent",
              color: authoringMode === "manual" ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <Edit3 size={16} /> {t("add_edit_question.mode_manual", "Manual Multilingual Form")}
          </button>
          <button
            type="button"
            onClick={() => setAuthoringMode("ai")}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: authoringMode === "ai" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "transparent",
              color: authoringMode === "ai" ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <Sparkles size={16} /> {t("add_edit_question.mode_ai", "AI Question Synthesizer")}
          </button>
          <button
            type="button"
            onClick={() => setAuthoringMode("extractor")}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: authoringMode === "extractor" ? "linear-gradient(135deg, #059669, #10b981)" : "transparent",
              color: authoringMode === "extractor" ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <FileSpreadsheet size={16} /> {t("add_edit_question.mode_extractor", "Extract from File (Excel / Word / PDF)")}
          </button>
        </div>
      )}

      {/* MODE 3: DOCUMENT EXTRACTOR */}
      {authoringMode === "extractor" && !isEditing ? (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <DocumentQuestionExtractor
            currentSubject={subject}
            onQuestionsSavedToBank={(created) => {
              showToast(`Saved ${created.length} question(s) from document into Question Bank!`, "success");
              setCurrentView("question_bank");
            }}
          />
        </div>
      ) : (
        <>
          {/* AI Assistance Generator Bar */}
          {(!isEditing && (authoringMode === "ai" || authoringMode === "manual")) && (
            <div
              className="glass-card"
              style={{
                padding: "1.25rem",
                marginBottom: "1.75rem",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.35)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <Sparkles size={18} color="#818cf8" />
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c7d2fe" }}>
                  {t("add_edit_question.ai_box_title", "AI Question Synthesizer")}
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
                {t("add_edit_question.ai_box_desc", "Type a concept or topic and let the AI generate question text, option choices, and model answer keys automatically across all 6 languages!")}
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t("add_edit_question.ai_topic_placeholder", "e.g. Binary Search, SQL Indexing, Backpropagation Neural Networks...")}
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAiGenerate}
                  disabled={generatingAi}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <Sparkles size={16} />
                  {generatingAi ? t("add_edit_question.generating_ai", "Synthesizing...") : t("add_edit_question.generate_ai_btn", "Generate AI Item")}
                </button>
              </div>
            </div>
          )}

      {errorMsg && (
        <div
          style={{
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            color: "#fda4af",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Main Question Form */}
      <form onSubmit={handleSubmit}>
        <div className="glass-card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          
          {/* Question Type, Subject, Difficulty Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t("add_edit_question.question_type_label", "Question Type *")}</label>
              <select
                className="form-control"
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="MCQ">1. {t("status.mcq_single", "MCQ (Single Choice)")}</option>
                <option value="MULTI_SELECT">2. {t("status.multi_select", "Multi-Select (Multiple Choice)")}</option>
                <option value="SHORT_ANSWER">3. {t("status.short_answer", "Short Answer")}</option>
                <option value="LONG_ANSWER">4. {t("status.long_answer", "Long Answer")}</option>
                <option value="IMAGE_UPLOAD">5. {t("status.image_upload", "Image Upload Question")}</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t("add_edit_question.subject_label", "Subject *")}</label>
              <select
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {translateContent(s, activeLangTab) || s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t("add_edit_question.difficulty_label", "Difficulty Level *")}</label>
              <select
                className="form-control"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="EASY">{t("status.easy", "Easy")}</option>
                <option value="MEDIUM">{t("status.medium", "Medium")}</option>
                <option value="HARD">{t("status.hard", "Hard")}</option>
              </select>
            </div>
          </div>

          {/* Marks & Negative Marks */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t("add_edit_question.marks_label", "Marks Awarded *")}</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                className="form-control"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t("add_edit_question.neg_marks_label", "Negative Penalty (Optional)")}</label>
              <input
                type="number"
                step="0.25"
                min="0"
                className="form-control"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(e.target.value)}
              />
            </div>
          </div>

          {/* Multilingual Authoring Language Tabs (Requirement 10) */}
          <div style={{ marginBottom: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Languages size={18} color="#818cf8" />
                <span style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {t("add_edit_question.multilingual_tabs_header", "Multilingual Content Authoring (6 Languages)")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoTranslateMissing}
                className="btn btn-secondary btn-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  color: "#c7d2fe",
                  fontSize: "0.775rem",
                  fontWeight: 700
                }}
              >
                <Sparkles size={13} color="#a78bfa" />
                {t("add_edit_question.auto_translate_all", "Auto-Fill All 6 Languages from English")}
              </button>
            </div>

            {/* Language Selection Tabs */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", background: "rgba(15, 23, 42, 0.5)", padding: "0.3rem", borderRadius: "8px" }}>
              {LANGUAGES.map((lang) => {
                const isActive = activeLangTab === lang.code;
                const hasText = questionTexts[lang.code] && questionTexts[lang.code].trim() !== "";
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLangTab(lang.code)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "6px",
                      border: "none",
                      background: isActive ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "transparent",
                      color: isActive ? "#ffffff" : (hasText ? "#93c5fd" : "var(--text-muted)"),
                      fontWeight: 700,
                      fontSize: "0.825rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span>{lang.nativeName} ({lang.name})</span>
                    {hasText && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Text for Active Language Tab */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label className="form-label" style={{ margin: 0 }}>
                {t("add_edit_question.question_text_label", "Question Prompt / Problem Statement *")} ({LANGUAGES.find(l => l.code === activeLangTab)?.nativeName})
              </label>
              {activeLangTab !== "en" && !questionTexts[activeLangTab] && questionTexts.en && (
                <button
                  type="button"
                  onClick={() => {
                    setQuestionTexts({
                      ...questionTexts,
                      [activeLangTab]: translateContent(questionTexts.en, activeLangTab)
                    });
                  }}
                  style={{ background: "transparent", border: "none", color: "#818cf8", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                >
                  {t("add_edit_question.translate_from_en", "Translate this prompt from English")}
                </button>
              )}
            </div>
            <textarea
              rows={4}
              required={activeLangTab === "en"}
              placeholder={`Enter question prompt in ${LANGUAGES.find(l => l.code === activeLangTab)?.name}...`}
              className="form-control"
              value={questionTexts[activeLangTab] || ""}
              onChange={(e) => setQuestionTexts({ ...questionTexts, [activeLangTab]: e.target.value })}
            />
          </div>

          {/* Dynamic Options Section for MCQ and MULTI_SELECT */}
          {(questionType === "MCQ" || questionType === "MULTI_SELECT") && (
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {questionType === "MCQ" ? t("add_edit_question.options_single_header", "Options (Single Correct Radio)") : t("add_edit_question.options_multi_header", "Options (Multi-Select Checkboxes)")} - {LANGUAGES.find(l => l.code === activeLangTab)?.nativeName}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                    {t("add_edit_question.options_hint", "Click the radio/checkbox to set the correct answer(s)")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn btn-secondary btn-sm"
                >
                  <PlusCircle size={14} /> {t("add_edit_question.add_option", "+ Add Option")}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {options.map((opt, idx) => {
                  const localizedLetter = getLocalizedOptionLabel(idx, activeLangTab);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        background: opt.is_correct ? "rgba(16, 185, 129, 0.08)" : "rgba(15, 23, 42, 0.6)",
                        border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)"}`,
                        borderRadius: "var(--radius-md)",
                        padding: "0.65rem 0.85rem"
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          cursor: "pointer",
                          color: opt.is_correct ? "#34d399" : "var(--text-main)",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          userSelect: "none"
                        }}
                        title="Select correct answer"
                      >
                        {questionType === "MCQ" ? (
                          <input
                            type="radio"
                            name="add_edit_mcq_radio"
                            checked={Boolean(opt.is_correct)}
                            onChange={() => handleOptionCorrectToggle(idx)}
                            style={{
                              accentColor: "#10b981",
                              width: "18px",
                              height: "18px",
                              cursor: "pointer"
                            }}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={Boolean(opt.is_correct)}
                            onChange={() => handleOptionCorrectToggle(idx)}
                            style={{
                              accentColor: "#10b981",
                              width: "18px",
                              height: "18px",
                              cursor: "pointer"
                            }}
                          />
                        )}
                        <span>{localizedLetter})</span>
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Option ${localizedLetter} text in ${LANGUAGES.find(l => l.code === activeLangTab)?.name}...`}
                        value={opt[activeLangTab] || ""}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        style={{ flex: 1, padding: "0.5rem 0.75rem" }}
                      />

                      {opt.is_correct && (
                        <span className="badge badge-approved" style={{ fontSize: "0.7rem" }}>
                          {t("add_edit_question.correct_checkbox", "Correct")}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#fb7185",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                        title={t("add_edit_question.remove_option", "Remove option")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Model Answer for Short Answer / Long Answer / Image Upload / Solution Key */}
          {(questionType === "SHORT_ANSWER" || questionType === "LONG_ANSWER" || questionType === "IMAGE_UPLOAD" || questionType === "MCQ" || questionType === "MULTI_SELECT") && (
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label">
                  {t("add_edit_question.model_answer_label", "Expected / Model Answer / Solution Key")} ({LANGUAGES.find(l => l.code === activeLangTab)?.nativeName})
                </label>
                <textarea
                  rows={4}
                  placeholder={`Provide solution / model answer in ${LANGUAGES.find(l => l.code === activeLangTab)?.name}...`}
                  className="form-control"
                  value={modelAnswers[activeLangTab] || ""}
                  onChange={(e) => setModelAnswers({ ...modelAnswers, [activeLangTab]: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Evaluation Guidelines for Long Answer / Image Upload */}
          {(questionType === "LONG_ANSWER" || questionType === "IMAGE_UPLOAD" || questionType === "SHORT_ANSWER") && (
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label">
                {t("add_edit_question.guidelines_label", "Evaluation Rubric & Guidelines (For AI Vision / Manual Grading)")}
              </label>
              <textarea
                rows={3}
                placeholder={t("add_edit_question.guidelines_placeholder", "Specify marking breakdown: e.g. 4 Marks for circuit schematic, 3 Marks for truth table...")}
                className="form-control"
                value={evaluationGuidelines}
                onChange={(e) => setEvaluationGuidelines(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentView("question_bank")}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            <Save size={18} />
            {loading ? t("add_edit_question.saving", "Saving Multilingual Item...") : isEditing ? t("add_edit_question.update_btn", "Update Question Item") : t("add_edit_question.save_question_btn", "Save Question to Bank")}
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  );
};
