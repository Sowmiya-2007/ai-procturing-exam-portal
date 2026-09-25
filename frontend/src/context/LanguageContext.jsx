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

  // Translation helper function
  const t = useCallback((keyPath, params = null, fallback = null) => {
    if (!keyPath || typeof keyPath !== "string") return "";

    const getNestedValue = (obj, path) => {
      if (!obj) return undefined;
      const parts = path.split(".");
      let current = obj;
      for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
      }
      return current;
    };

    // 1. Try active language
    let val = getNestedValue(translations[language], keyPath);

    // 2. Fallback to English
    if (val === undefined || val === null || val === "") {
      val = getNestedValue(translations[DEFAULT_LANGUAGE], keyPath);
    }

    // 3. Fallback to passed fallback or key
    if (val === undefined || val === null || val === "") {
      val = fallback !== null && fallback !== undefined ? fallback : keyPath;
    }

    // 4. Parameter substitution (e.g. {name}, {count}, {status})
    if (typeof val === "string" && params && typeof params === "object") {
      return val.replace(/\{(\w+)\}/g, (match, paramName) => {
        if (paramName in params) {
          return params[paramName] !== undefined && params[paramName] !== null ? String(params[paramName]) : "";
        }
        return match;
      });
    }

    return typeof val === "string" ? val : String(val);
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
