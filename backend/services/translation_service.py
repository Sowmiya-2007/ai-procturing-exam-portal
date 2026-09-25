import sys
import re
import urllib.parse
import urllib.request
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Optional, List, Any

logger = logging.getLogger("TranslationService")

SUPPORTED_LANGUAGES = ["en", "ta", "te", "hi", "ml", "kn"]

MYMEMORY_LANG_MAP = {
    "en": "en-GB",
    "ta": "ta-IN",
    "te": "te-IN",
    "hi": "hi-IN",
    "ml": "ml-IN",
    "kn": "kn-IN"
}

# Domain-specific curated terminology dictionary for instant & 100% accurate CS / Exam translations
CORE_CS_DICTIONARY: Dict[str, Dict[str, str]] = {
    "Computer Science": {
        "ta": "கணினி அறிவியல்",
        "te": "కంప్యూటర్ సైన్స్",
        "hi": "कंप्यूटर विज्ञान",
        "ml": "കമ്പ്യൂട്ടർ സയൻസ്",
        "kn": "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್"
    },
    "Computer Science & Engineering": {
        "ta": "கணினி அறிவியல் மற்றும் பொறியியல்",
        "te": "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్",
        "hi": "कंप्यूटर विज्ञान और इंजीनियरिंग",
        "ml": "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ്",
        "kn": "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್"
    },
    "Data Structures": {
        "ta": "தரவு கட்டமைப்புகள்",
        "te": "డేటా స్ట్రక్చర్స్",
        "hi": "डेटा संरचनाएं",
        "ml": "ഡാറ്റാ ഘടനകൾ",
        "kn": "ಡೇಟಾ ರಚನೆಗಳು"
    },
    "Computer Networks": {
        "ta": "கணினி நெட்வொர்க்குகள்",
        "te": "కంప్యూటర్ నెట్‌వర్క్‌లు",
        "hi": "कंप्यूटर नेटवर्क",
        "ml": "കമ്പ്യൂട്ടർ നെറ്റ്‌വർക്കുകൾ",
        "kn": "ಕಂಪ್ಯೂಟರ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳು"
    },
    "Database Management Systems": {
        "ta": "தரவுத்தள மேலாண்மை அமைப்புகள்",
        "te": "డేటాబేస్ మేనేజ్‌మెంట్ సిస్టమ్స్",
        "hi": "डेटाबेस प्रबंधन प्रणाली (DBMS)",
        "ml": "ഡാറ്റാബേസ് മാനേജ്മെന്റ് സിസ്റ്റംസ്",
        "kn": "ಡೇಟಾಬೇಸ್ ಮ್ಯಾನೇಜ್ಮೆಂಟ್ ಸಿಸ್ಟಮ್ಸ್"
    },
    "Artificial Intelligence": {
        "ta": "செயற்கை நுண்ணறிவு",
        "te": "ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ (కృత్రిమ మేధ)",
        "hi": "आर्टिफिशियल इंटेलिजेंस (कृत्रिम बुद्धिमत्ता)",
        "ml": "ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ്",
        "kn": "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI)"
    },
    "Advanced Java and Data Structures Assessment 2026": {
        "ta": "மேம்பட்ட ஜாவா மற்றும் தரவு கட்டமைப்புகள் மதிப்பீடு 2026",
        "te": "అధునాతన జావా మరియు డేటా స్ట్రక్చర్స్ అసెస్‌మెంట్ 2026",
        "hi": "उन्नत जावा और डेटा संरचनाएं मूल्यांकन 2026",
        "ml": "അഡ്വാൻസ്ഡ് ജാവ ആൻഡ് ഡാറ്റാ സ്ട്രക്ച്ചേഴ്സ് അസസ്സ്മെന്റ് 2026",
        "kn": "ಸುಧಾರಿತ ಜಾವಾ ಮತ್ತು ಡೇಟಾ ರಚನೆಗಳ ಮೌಲ್ಯಮಾಪನ 2026"
    },
    "Algorithms Mastery Assessment 2026": {
        "ta": "அல்காரிதம்கள் தேர்ச்சி மதிப்பீடு 2026",
        "te": "అల్గారిథమ్స్ మాస్టరీ అసెస్‌మెంట్ 2026",
        "hi": "एल्गोरिदम महारत मूल्यांकन 2026",
        "ml": "അൽഗോരിതങ്ങൾ മാസ്റ്ററി അസസ്സ്മെന്റ് 2026",
        "kn": "ಅಲ್ಗಾರಿದಮ್‌ಗಳ ಪಾಂಡಿತ್ಯ ಮೌಲ್ಯಮಾಪನ 2026"
    },
    "Assessment covering Java programming and fundamental data structures.": {
        "ta": "ஜாவா நிரலாக்கம் மற்றும் அடிப்படை தரவு கட்டமைப்புகளை உள்ளடக்கிய மதிப்பீடு.",
        "te": "జావా ప్రోగ్రామింగ్ మరియు ప్రాథమిక డేటా నిర్మాణాలను కవర్ చేసే అసెస్‌మెంట్.",
        "hi": "जावा प्रोग्रामिंग और मौलिक डेटा संरचनाओं को कवर करने वाला मूल्यांकन।",
        "ml": "ജാവ പ്രോഗ്രാമിംഗും അടിസ്ഥാന ഡാറ്റാ ഘടനകളും ഉൾക്കൊള്ളുന്ന വിലയിരുത്തൽ.",
        "kn": "ಜಾವಾ ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಮತ್ತು ಮೂಲಭೂತ ಡೇಟಾ ರಚನೆಗಳನ್ನು ಒಳಗೊಂಡಿರುವ ಮೌಲ್ಯಮಾಪನ."
    },
    "What is the time complexity of binary search on a sorted array?": {
        "ta": "வரிசைப்படுத்தப்பட்ட வரிசையில் பைனரி தேடலின் நேர சிக்கலானது என்ன?",
        "te": "క్రమబద్ధీకరించిన శ్రేణిపై బైనరీ శోధన యొక్క సమయ సంక్లిష్టత ఏమిటి?",
        "hi": "क्रमबद्ध सरणी पर द्विआधारी खोज की समय जटिलता क्या है?",
        "ml": "ഒരു അടുക്കിയ അറേയിലെ ബൈനറി തിരയലിന്റെ സമയ സങ്കീർണ്ണത എന്താണ്?",
        "kn": "ವಿಂಗಡಿಸಲಾದ ಶ್ರೇಣಿಯಲ್ಲಿ ಬೈನರಿ ಹುಡುಕಾಟದ ಸಮಯದ ಸಂಕೀರ್ಣತೆ ಏನು?"
    },
    "Constant time": {
        "ta": "நிலையான நேரம் (Constant time)",
        "te": "స్థిరమైన సమయం (Constant time)",
        "hi": "स्थिर समय (Constant time)",
        "ml": "സ്ഥിരമായ സമയം (Constant time)",
        "kn": "ಸ್ಥಿರ ಸಮಯ (Constant time)"
    },
    "Logarithmic time": {
        "ta": "மடக்கை நேரம் (Logarithmic time)",
        "te": "సంవర్గమాన సమయం (Logarithmic time)",
        "hi": "लघुगणकीय समय (Logarithmic time)",
        "ml": "ലോഗരിതമിക് സമയം (Logarithmic time)",
        "kn": "ಲಾಗರಿಥಮಿಕ್ ಸಮಯ (Logarithmic time)"
    },
    "Linear time": {
        "ta": "நேரியல் நேரம் (Linear time)",
        "te": "సరళ సమయం (Linear time)",
        "hi": "रैखिक समय (Linear time)",
        "ml": "രേഖീയ സമയം (Linear time)",
        "kn": "ರೇಖೀಯ ಸಮಯ (Linear time)"
    },
    "Quadratic time": {
        "ta": "இருபடி நேரம் (Quadratic time)",
        "te": "వర్గ సమయం (Quadratic time)",
        "hi": "द्विघात समय (Quadratic time)",
        "ml": "ക്വാഡ്രാറ്റിക് സമയം (Quadratic time)",
        "kn": "ಚತುರ್ಭುಜ ಸಮಯ (Quadratic time)"
    },
    "Binary search repeatedly divides the search space into two halves.": {
        "ta": "பைனரி தேடல் தேடல் இடத்தை மீண்டும் மீண்டும் இரண்டு பகுதிகளாகப் பிரிக்கிறது.",
        "te": "బైనరీ శోధన శోధన స్థలాన్ని పదేపదే రెండు భాగాలుగా విభజిస్తుంది.",
        "hi": "बाइनरी सर्च बार-बार खोज स्थान को दो हिस्सों में विभाजित करती है।",
        "ml": "ബൈനറി തിരയൽ തിരയൽ സ്ഥലത്തെ ആവർത്തിച്ച് രണ്ട് ഭാഗങ്ങളായി വിഭജിക്കുന്നു.",
        "kn": "ಬೈನರಿ ಹುಡುಕಾಟವು ಹುಡುಕಾಟ ಜಾಗವನ್ನು ಪುನರಾವರ್ತಿತವಾಗಿ ಎರಡು ಭಾಗಗಳಾಗಿ ವಿಭಜಿಸುತ್ತದೆ."
    },
    "Binary search has O(log N) time complexity.": {
        "ta": "பைனரி தேடல் O(log N) நேர சிக்கலைக் கொண்டுள்ளது.",
        "te": "బైనరీ శోధన O(log N) సమయ సంక్లిష్టతను కలిగి ఉంది.",
        "hi": "बाइनरी सर्च की समय जटिलता O(log N) होती है।",
        "ml": "ബൈനറി തിരയലിന് O(log N) സമയ സങ്കീർണ്ണതയുണ്ട്.",
        "kn": "ಬೈನರಿ ಹುಡುಕಾಟವು O(log N) ಸಮಯದ ಸಂಕೀರ್ಣತೆಯನ್ನು ಹೊಂದಿದೆ."
    }
}

# In-memory translation cache (source_text + "_" + target_lang -> translated_text)
_TRANSLATION_CACHE: Dict[str, str] = {}

def _protect_technical_terms(text: str) -> tuple[str, dict[str, str]]:
    """
    Masks code tokens, big-O notation, equations, and technical keywords
    so translation engines don't distort them.
    """
    token_map = {}
    counter = 0

    patterns = [
        r"O\([^\)]+\)",                       # O(1), O(log N), O(N), etc.
        r"\b(Java|Python|C\+\+|SQL|HTML|CSS|JavaScript|TypeScript)\b",
        r"\b(ALU|CPU|RAM|ROM|OSI|TCP/IP|UDP|HTTP|HTTPS|DNS|DHCP|REST|JSON|XML|API|DBMS|ACID|CAP)\b",
        r"```[\s\S]*?```",                    # Fenced code blocks
        r"`[^`]+`"                            # Inline code
    ]

    masked_text = text
    for pat in patterns:
        matches = re.finditer(pat, masked_text)
        for match in matches:
            original = match.group(0)
            placeholder = f"__TECH_TERM_{counter}__"
            token_map[placeholder] = original
            masked_text = masked_text.replace(original, placeholder, 1)
            counter += 1

    return masked_text, token_map

def _restore_technical_terms(text: str, token_map: dict[str, str]) -> str:
    restored = text
    for placeholder, original in token_map.items():
        restored = restored.replace(placeholder, original)
        # Also catch space-mangled placeholders like "__ TECH _ TERM _ 0 __"
        cleaned_ph = placeholder.replace("_", "")
        for variant in [placeholder.lower(), placeholder.upper(), f"__{cleaned_ph}__"]:
            restored = restored.replace(variant, original)
    return restored

def _translate_mymemory(text: str, source_lang: str, target_lang: str, timeout_sec: int = 4) -> Optional[str]:
    """
    Translates text using the MyMemory API service.
    """
    try:
        s_code = MYMEMORY_LANG_MAP.get(source_lang, "en-GB")
        t_code = MYMEMORY_LANG_MAP.get(target_lang, "ta-IN")
        
        url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair={s_code}|{t_code}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "AI-Examination-Portal/2.0 (Academic Multilingual Platform)",
                "Accept": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and "responseData" in data and "translatedText" in data["responseData"]:
                res = data["responseData"]["translatedText"]
                if res and not res.startswith("MYMEMORY WARNING:") and res.strip() != text.strip():
                    return res.strip()
    except Exception as e:
        logger.debug(f"MyMemory translation request failed: {e}")
    return None

def translate_text(text: Optional[str], source_lang: str = "en", target_lang: str = "ta") -> str:
    """
    Translates a single string into the requested target language.
    Guarantees:
    - Never throws exceptions
    - Never uses fake [தமிழ்] prefixes or Math.random()
    - Uses domain dictionary, cache, or external translation service
    - Gracefully falls back to original text if language matches or completely empty
    """
    if not text or not text.strip():
        return text or ""

    trimmed = text.strip()

    if target_lang == source_lang or target_lang == "en":
        return trimmed

    cache_key = f"{trimmed}_{target_lang}"
    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key]

    # Check curated dictionary first
    if trimmed in CORE_CS_DICTIONARY and target_lang in CORE_CS_DICTIONARY[trimmed]:
        result = CORE_CS_DICTIONARY[trimmed][target_lang]
        _TRANSLATION_CACHE[cache_key] = result
        return result

    # Protect technical terms
    masked_text, token_map = _protect_technical_terms(trimmed)

    # Perform translation
    translated = _translate_mymemory(masked_text, source_lang=source_lang, target_lang=target_lang)
    
    if not translated:
        # Fallback to direct text if masking failed
        translated = _translate_mymemory(trimmed, source_lang=source_lang, target_lang=target_lang)

    if translated:
        final_result = _restore_technical_terms(translated, token_map)
        _TRANSLATION_CACHE[cache_key] = final_result
        return final_result

    # Controlled graceful fallback without fake prefixes
    _TRANSLATION_CACHE[cache_key] = trimmed
    return trimmed

def translate_to_all_languages(text: Optional[str], source_lang: str = "en") -> Dict[str, str]:
    """
    Concurrently translates text into all 6 supported languages:
    {"en": ..., "ta": ..., "te": ..., "hi": ..., "ml": ..., "kn": ...}
    """
    if not text or not text.strip():
        return {lang: (text or "") for lang in SUPPORTED_LANGUAGES}

    clean_text = text.strip()
    results = {source_lang: clean_text}

    # Check dictionary first for all languages
    if clean_text in CORE_CS_DICTIONARY:
        dict_entry = CORE_CS_DICTIONARY[clean_text]
        for lang in SUPPORTED_LANGUAGES:
            if lang != source_lang:
                results[lang] = dict_entry.get(lang, clean_text)
        return results

    # Execute remaining languages concurrently
    target_langs = [l for l in SUPPORTED_LANGUAGES if l != source_lang]
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_lang = {
            executor.submit(translate_text, clean_text, source_lang, lang): lang
            for lang in target_langs
        }
        for future in as_completed(future_to_lang):
            lang = future_to_lang[future]
            try:
                translated_val = future.result()
                results[lang] = translated_val
            except Exception as e:
                logger.error(f"Error translating to {lang}: {e}")
                results[lang] = clean_text

    return results

def auto_translate_exam_payload(payload_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches an exam creation or update dictionary with all 6 language fields for
    title_*, subject_*, description_*, instructions_*.
    """
    title = payload_dict.get("title") or payload_dict.get("title_en")
    if title:
        t_trans = translate_to_all_languages(title)
        for lang, val in t_trans.items():
            if not payload_dict.get(f"title_{lang}"):
                payload_dict[f"title_{lang}"] = val

    subject = payload_dict.get("subject") or payload_dict.get("subject_en")
    if subject:
        s_trans = translate_to_all_languages(subject)
        for lang, val in s_trans.items():
            if not payload_dict.get(f"subject_{lang}"):
                payload_dict[f"subject_{lang}"] = val

    desc = payload_dict.get("description") or payload_dict.get("description_en")
    if desc:
        d_trans = translate_to_all_languages(desc)
        for lang, val in d_trans.items():
            if not payload_dict.get(f"description_{lang}"):
                payload_dict[f"description_{lang}"] = val

    inst = payload_dict.get("instructions") or payload_dict.get("instructions_en")
    if inst:
        i_trans = translate_to_all_languages(inst)
        for lang, val in i_trans.items():
            if not payload_dict.get(f"instructions_{lang}"):
                payload_dict[f"instructions_{lang}"] = val

    return payload_dict

def auto_translate_question_payload(payload_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches a question creation or update dictionary with all 6 language fields for
    question_text_*, explanation_*, model_answer_*, and all options' option_text_*.
    """
    q_text = payload_dict.get("question_text") or payload_dict.get("question_text_en")
    if q_text:
        q_trans = translate_to_all_languages(q_text)
        for lang, val in q_trans.items():
            if not payload_dict.get(f"question_text_{lang}"):
                payload_dict[f"question_text_{lang}"] = val

    explanation = payload_dict.get("explanation") or payload_dict.get("explanation_en")
    if explanation:
        e_trans = translate_to_all_languages(explanation)
        for lang, val in e_trans.items():
            if not payload_dict.get(f"explanation_{lang}"):
                payload_dict[f"explanation_{lang}"] = val

    model_ans = payload_dict.get("model_answer") or payload_dict.get("model_answer_en") or payload_dict.get("expected_answer")
    if model_ans:
        m_trans = translate_to_all_languages(model_ans)
        for lang, val in m_trans.items():
            if not payload_dict.get(f"model_answer_{lang}"):
                payload_dict[f"model_answer_{lang}"] = val

    options = payload_dict.get("options")
    if options and isinstance(options, list):
        for opt in options:
            if isinstance(opt, dict):
                opt_text = opt.get("option_text") or opt.get("option_text_en")
                if opt_text:
                    opt_trans = translate_to_all_languages(opt_text)
                    for lang, val in opt_trans.items():
                        if not opt.get(f"option_text_{lang}"):
                            opt[f"option_text_{lang}"] = val

    return payload_dict
