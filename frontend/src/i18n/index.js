import en from "./locales/en";
import ta from "./locales/ta";
import te from "./locales/te";
import hi from "./locales/hi";
import ml from "./locales/ml";
import kn from "./locales/kn";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" }
];

export const translations = {
  en,
  ta,
  te,
  hi,
  ml,
  kn
};

export const DEFAULT_LANGUAGE = "en";
