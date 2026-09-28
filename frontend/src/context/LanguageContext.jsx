import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "../i18n";

const LanguageContext = createContext(null);

const STORAGE_KEY = "exam_ai_language";

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && translations[stored]) {
        return stored;
      }
    } catch (e) {
      console.warn("Could not read language from localStorage", e);
    }
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = useCallback((newLang) => {
    if (translations[newLang]) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch (e) {
        console.warn("Could not save language to localStorage", e);
      }
    }
  }, []);

  // Universal translation resolution function
  const t = useCallback((keyPath, arg2 = null, arg3 = null) => {
    if (!keyPath || typeof keyPath !== "string") return "";

    let params = null;
    let fallback = null;

    // Support flexible call signatures:
    // 1. t("key", "Fallback text", { count: 5 })
    // 2. t("key", { count: 5 }, "Fallback text")
    // 3. t("key", "Fallback text")
    // 4. t("key", { count: 5 })
    if (typeof arg2 === "string") {
      fallback = arg2;
      if (typeof arg3 === "object" && arg3 !== null) {
        params = arg3;
      }
    } else if (typeof arg2 === "object" && arg2 !== null) {
      params = arg2;
      if (typeof arg3 === "string") {
        fallback = arg3;
      }
    } else if (typeof arg3 === "string") {
      fallback = arg3;
    } else if (typeof arg3 === "object" && arg3 !== null) {
      params = arg3;
    }

    const resolveKeyFromObject = (obj, path) => {
      if (!obj || typeof obj !== "object") return undefined;
      const parts = path.split(".");
      let current = obj;
      for (const part of parts) {
        if (current === null || typeof current !== "object") return undefined;
        if (part in current) {
          current = current[part];
        } else {
          // Case-insensitive key matching (e.g., KPI_TOTAL_ENROLLED -> kpi_total_enrolled)
          const lowerPart = part.toLowerCase();
          const matchedKey = Object.keys(current).find(k => k.toLowerCase() === lowerPart);
          if (matchedKey && current[matchedKey] !== undefined) {
            current = current[matchedKey];
          } else {
            return undefined;
          }
        }
      }

      // CRITICAL: Translation value must be a primitive string or number, NEVER a dictionary object
      if (typeof current === "string" || typeof current === "number") {
        return String(current);
      }
      return undefined;
    };

    const findTranslation = (langObj, path) => {
      if (!langObj) return undefined;
      // 1. Try exact or case-insensitive path
      let found = resolveKeyFromObject(langObj, path);
      if (found !== undefined) return found;

      // 2. If path has no dots, search in known namespaces
      if (!path.includes(".")) {
        const namespaces = [
          "examiner", "common", "admin", "student_dashboard", 
          "question_bank", "add_edit_question", "create_exam", 
          "exam_hall", "exam_result", "modals", "landing", "login", "register", "status"
        ];
        for (const ns of namespaces) {
          if (langObj[ns] && typeof langObj[ns] === "object") {
            const nested = resolveKeyFromObject(langObj[ns], path);
            if (nested !== undefined) return nested;
          }
        }
      }
      return undefined;
    };

    // 1. Try active selected language
    let val = findTranslation(translations[language], keyPath);

    // 2. Fallback to English
    if (val === undefined || val === null || val === "") {
      val = findTranslation(translations[DEFAULT_LANGUAGE], keyPath);
    }

    // 3. Fallback to explicitly passed fallback string or humanized key
    if (val === undefined || val === null || val === "") {
      if (typeof fallback === "string" && fallback.trim() !== "") {
        val = fallback;
      } else {
        const lastPart = keyPath.split(".").pop() || keyPath;
        val = lastPart
          .replace(/^(col_|kpi_|stat_|tab_|btn_)/i, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // 4. Parameter substitution with object-safe extraction (e.g. {name}, {count}, {status})
    if (typeof val === "string" && params && typeof params === "object") {
      val = val.replace(/\{(\w+)\}/g, (match, paramName) => {
        if (paramName in params) {
          const rep = params[paramName];
          if (rep === undefined || rep === null) return "";
          if (typeof rep === "object") {
            return rep.name || rep.title || rep.label || rep.id || "";
          }
          return String(rep);
        }
        return match;
      });
    }

    return typeof val === "string" ? val : (typeof val === "number" ? String(val) : "");
  }, [language]);

  const currentLangObj = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    currentLang: currentLangObj,
    t
  }), [language, setLanguage, currentLangObj, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
