import os
import sys
import re
import json
import logging
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Optional, List, Any, Union

from app.core.config import settings

logger = logging.getLogger("TranslationService")

# Canonical 6 Supported Languages
SUPPORTED_LANGUAGES: List[str] = ["en", "ta", "hi", "te", "ml", "kn"]

LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "ta": "Tamil",
    "hi": "Hindi",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada"
}

MYMEMORY_LANG_MAP: Dict[str, str] = {
    "en": "en-GB",
    "ta": "ta-IN",
    "hi": "hi-IN",
    "te": "te-IN",
    "ml": "ml-IN",
    "kn": "kn-IN"
}

# In-memory translation cache (source_text + "_" + target_lang -> translated_text)
_TRANSLATION_CACHE: Dict[str, str] = {}

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
    "Stack": {
        "ta": "ஸ்டேக் (Stack - LIFO)",
        "te": "స్టాక్ (Stack)",
        "hi": "स्टैक (Stack)",
        "ml": "സ്റ്റാക്ക് (Stack)",
        "kn": "ಸ್ಟ್ಯಾಕ್ (Stack)"
    },
    "Queue": {
        "ta": "வரிசை (Queue - FIFO)",
        "te": "క్యూ (Queue)",
        "hi": "कतार (Queue)",
        "ml": "ക്യൂ (Queue)",
        "kn": "ಕ್ಯೂ (Queue)"
    },
    "Tree": {
        "ta": "மரம் (Tree)",
        "te": "ట్రీ (Tree)",
        "hi": "ट्री (Tree)",
        "ml": "ട്രീ (Tree)",
        "kn": "ಟ್ರೀ (Tree)"
    },
    "Graph": {
        "ta": "வரைபடம் (Graph)",
        "te": "గ్రాఫ్ (Graph)",
        "hi": "ग्राफ (Graph)",
        "ml": "ഗ്രാഫ് (Graph)",
        "kn": "ಗ್ರಾಫ್ (Graph)"
    },
    "Algorithms Mastery Assessment 2026": {
        "ta": "அல்காரிதம்கள் தேர்ச்சி மதிப்பீடு 2026",
        "te": "అల్గారిథమ్స్ మాస్టరీ అసెస్‌మెంట్ 2026",
        "hi": "एल्गोरिदम महारत मूल्यांकन 2026",
        "ml": "അൽഗോരിതങ്ങൾ മാസ്റ്ററി അസസ്സ്മെന്റ് 2026",
        "kn": "ಅಲ್ಗಾರಿದಮ್‌ಗಳ ಪಾಂಡಿತ್ಯ ಮೌಲ್ಯಮಾಪನ 2026"
    },
    "Computer Science Comprehensive Midterm 2026": {
        "ta": "கணினி அறிவியல் விரிவான இடைப்பருவத் தேர்வு 2026",
        "te": "కంప్యూటర్ సైన్స్ సమగ్ర మిడ్-టర్మ్ పరీక్ష 2026",
        "hi": "कंप्यूटर विज्ञान व्यापक मध्यावधि परीक्षा 2026",
        "ml": "കമ്പ്യൂട്ടർ സയൻസ് സമഗ്ര മിഡ്-ടേം പരീക്ഷ 2026",
        "kn": "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಸಮಗ್ರ ಮಿಡ್-ಟರ್ಮ್ ಪರೀಕ್ಷೆ 2026"
    },
    "What is the time complexity of binary search on a sorted array?": {
        "ta": "வரிசைப்படுத்தப்பட்ட அணியில் இருமத் தேடலின் (binary search) நேர சிக்கல் என்ன?",
        "te": "క్రమబద్ధీకరించబడిన శ్రేణిపై బైనరీ శోధన యొక్క సమయ సంక్లిష్టత ఏమిటి?",
        "hi": "सॉर्ट किए गए ऐरे पर बाइनरी सर्च की समय जटिलता (time complexity) क्या है?",
        "ml": "സോർട്ട് ചെയ്ത അറേയിലെ ബൈനറി സെർച്ചിന്റെ ടൈം കോംപ്ലക്സിറ്റി എന്താണ്?",
        "kn": "ವಿಂಗಡಿಸಲಾದ ಅರೇಯಲ್ಲಿ ಬೈನರಿ ಹುಡುಕಾಟದ ಸಮಯ ಸಂಕೀರ್ಣತೆ (time complexity) ಏನು?"
    },
    "Which data structure uses FIFO?": {
        "ta": "எந்த தரவு அமைப்பு FIFO (முதலில் வருபவர் முதலில் வெளியேறுவார்) முறையைப் பயன்படுத்துகிறது?",
        "te": "ఏ డేటా స్ట్రక్చర్ FIFO ని ఉపయోగిస్తుంది?",
        "hi": "कौन सी डेटा संरचना FIFO का उपयोग करती है?",
        "ml": "ഏത് ഡാറ്റാ ഘടനയാണ് FIFO ഉപയോഗിക്കുന്നത്?",
        "kn": "ಯಾವ ಡೇಟಾ ರಚನೆಯು FIFO ಅನ್ನು ಬಳಸುತ್ತದೆ?"
    },
    "Which data structure operates on a First-In-First-Out (FIFO) basis?": {
        "ta": "எந்த தரவு அமைப்பு முதலில் வருபவர் முதலில் வெளியேறுவார் (FIFO) அடிப்படையில் இயங்குகிறது?",
        "te": "మొదట వచ్చినది మొదట వెళ్తుంది (FIFO) ఆధారంగా ఏ డేటా స్ట్రక్చర్ పనిచేస్తుంది?",
        "hi": "कौन सा डेटा स्ट्रक्चर फर्स्ट-इन-फर्स्ट-आउट (FIFO) के आधार पर संचालित होता है?",
        "ml": "ഫസ്റ്റ്-ഇൻ-ഫസ്റ്റ്-ഔട്ട് (FIFO) അടിസ്ഥാനത്തിൽ പ്രവർത്തിക്കുന്ന ഡാറ്റാ ഘടന ഏതാണ്?",
        "kn": "ಫಸ್ಟ್-ಇನ್-ಫಸ್ಟ್-ಔಟ್ (FIFO) ಆಧಾರದ ಮೇಲೆ ಯಾವ ಡೇಟಾ ರಚನೆಯು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ?"
    },
    "Which OSI layer is responsible for end-to-end reliable communication, error recovery, and flow control?": {
        "ta": "முழுமையான நம்பகமான தகவல் தொடர்பு, பிழை மீட்பு மற்றும் தரவு ஓட்டக் கட்டுப்பாட்டிற்கு எந்த OSI அடுக்கு பொறுப்பாகும்?",
        "te": "ఎండ్-టు-ఎండ్ విశ్వసనీయ కమ్యూనికేషన్, లోపం రికవరీ మరియు ఫ్లో నియంత్రణకు ఏ OSI లేయర్ బాధ్యత వహిస్తుంది?",
        "hi": "एंड-टू-एंड विश्वसनीय संचार, त्रुटि सुधार और प्रवाह नियंत्रण के लिए कौन सी OSI परत जिम्मेदार है?",
        "ml": "എൻഡ്-ടു-എൻഡ് വിശ്വസനീയമായ ആശയവിനിമയം, പിശക് തിരുത്തൽ, ഫ്ലോ നിയന്ത്രണം എന്നിവയ്ക്ക് ഏത് OSI ലെയറാണ് ഉത്തരവാദി?",
        "kn": "ಎಂಡ್-ಟು-ಎಂಡ್ ವಿಶ್ವಾಸಾರ್ಹ ಸಂವಹನ, ದೋಷ ಮರುಪಡೆಯುವಿಕೆ ಮತ್ತು ಹರಿವಿನ ನಿಯಂತ್ರಣಕ್ಕೆ ಯಾವ OSI ಲೇಯರ್ ಕಾರಣವಾಗಿದೆ?"
    },
    "O(1) - Constant time": {
        "ta": "O(1) - நிலையான நேரம் (Constant time)",
        "te": "O(1) - స్థిరమైన సమయం (Constant time)",
        "hi": "O(1) - स्थिर समय (Constant time)",
        "ml": "O(1) - സ്ഥിരമായ സമയം (Constant time)",
        "kn": "O(1) - ಸ್ಥಿರ ಸಮಯ (Constant time)"
    },
    "O(log N) - Logarithmic time": {
        "ta": "O(log N) - மடக்கை நேரம் (Logarithmic time)",
        "te": "O(log N) - సంవర్గమాన సమయం (Logarithmic time)",
        "hi": "O(log N) - लघुगणकीय समय (Logarithmic time)",
        "ml": "O(log N) - ലോഗരിതമിക് സമയം (Logarithmic time)",
        "kn": "O(log N) - ಲಾಗರಿಥಮಿಕ್ ಸಮಯ (Logarithmic time)"
    },
    "O(N) - Linear time": {
        "ta": "O(N) - நேரியல் நேரம் (Linear time)",
        "te": "O(N) - సరళ సమయం (Linear time)",
        "hi": "O(N) - रैखिक समय (Linear time)",
        "ml": "O(N) - രേഖീയ സമയം (Linear time)",
        "kn": "O(N) - ರೇಖೀಯ ಸಮಯ (Linear time)"
    },
    "O(N log N) - Linearithmic time": {
        "ta": "O(N log N) - நேரியல்-மடக்கை நேரம் (Linearithmic time)",
        "te": "O(N log N) - లీనియరిథమిక్ సమయం (Linearithmic time)",
        "hi": "O(N log N) - लीनियरिदमिक समय (Linearithmic time)",
        "ml": "O(N log N) - ലീനിയറിതമിക് സമയം (Linearithmic time)",
        "kn": "O(N log N) - ಲೀನಿಯರಿಥಮಿಕ್ ಸಮಯ (Linearithmic time)"
    }
}

# --- Technical Term & Code Masking ---

def _protect_technical_terms(text: str) -> tuple[str, dict[str, str]]:
    """
    Masks code tokens, big-O notation, equations, and programming keywords
    so translation engines don't distort them.
    """
    token_map = {}
    counter = 0

    patterns = [
        r"O\([^\)]+\)",                                                      # O(1), O(log N), O(N), etc.
        r"\b(Java|Python|C\+\+|SQL|HTML|CSS|JavaScript|TypeScript)\b",
        r"\b(ALU|CPU|RAM|ROM|OSI|TCP/IP|UDP|HTTP|HTTPS|DNS|DHCP|REST|JSON|XML|API|DBMS|ACID|CAP|FIFO|LIFO)\b",
        r"\b(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|INNER JOIN|LEFT JOIN|RIGHT JOIN|INSERT INTO|UPDATE|DELETE)\b",
        r"\b(System\.out\.println|public static void main|def |return |class |int |float |bool |void )\b",
        r"```[\s\S]*?```",                                                   # Fenced code blocks
        r"`[^`]+`"                                                           # Inline code
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
        cleaned_ph = placeholder.replace("_", "")
        for variant in [placeholder.lower(), placeholder.upper(), f"__{cleaned_ph}__", f"__ {cleaned_ph} __"]:
            restored = restored.replace(variant, original)
    return restored

# --- Translation Engines ---

def _get_openai_client():
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.startswith("your-") or len(api_key) < 10:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception as e:
        logger.debug(f"OpenAI client initialization skipped: {e}")
        return None

def _translate_with_openai(text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """
    Translates text using OpenAI GPT-4o-mini / GPT-4o with rigorous academic exam preservation prompt.
    """
    client = _get_openai_client()
    if not client:
        return None

    target_lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)
    model_name = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    prompt = (
        f"You are an expert academic and technical examination translator.\n"
        f"Translate the following educational examination text accurately from English to {target_lang_name} ({target_lang}).\n\n"
        f"STRICT RULES:\n"
        f"1. Preserve all programming code, syntax, keywords (Java, Python, C++, SQL), and variable names exactly.\n"
        f"2. Preserve mathematical formulas, numbers, equations, and Big-O notation (e.g. O(log N)).\n"
        f"3. Preserve the exact meaning and intended correct answer.\n"
        f"4. Do NOT add explanations, notes, markdown fencing, or conversational filler.\n"
        f"5. Return ONLY the plain translated text.\n\n"
        f"Text to translate:\n{text}"
    )

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a professional academic examination translation system."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1500
        )
        if response.choices and len(response.choices) > 0:
            result = response.choices[0].message.content
            if result and result.strip():
                return result.strip().strip('"').strip("'")
    except Exception as e:
        logger.warning(f"OpenAI translation failed for {target_lang}: {e}")
    return None

def _translate_with_deep_translator(text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """
    Translates text using the deep-translator package (GoogleTranslator).
    """
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        res = translator.translate(text)
        if res and res.strip() and res.strip() != text.strip():
            return res.strip()
    except Exception as e:
        logger.debug(f"DeepTranslator failed for {target_lang}: {e}")
    return None

def _translate_with_mymemory(text: str, source_lang: str, target_lang: str, timeout_sec: int = 4) -> Optional[str]:
    """
    Translates text using the MyMemory public API with User-Agent header.
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
        logger.debug(f"MyMemory translation failed: {e}")
    return None

def _translate_with_gtx(text: str, source_lang: str, target_lang: str, timeout_sec: int = 5) -> Optional[str]:
    """
    Translates text using Google GTX HTTP service with User-Agent header.
    """
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={urllib.parse.quote(text)}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                parts = [part[0] for part in data[0] if part and isinstance(part, list) and len(part) > 0 and part[0]]
                res = "".join(parts).strip()
                if res and res != text.strip():
                    return res
    except Exception as e:
        logger.debug(f"GTX translation failed for {target_lang}: {e}")
    return None

# --- Core Translation Function ---

def translate_text(text: Optional[str], source_lang: str = "en", target_lang: str = "ta") -> str:
    """
    Translates a single string into the requested target language.
    Guarantees:
    - Never throws exceptions
    - Uses OpenAI -> GTX -> DeepTranslator -> MyMemory -> Curated Dictionary
    - Gracefully falls back to original text if language matches or service is unreachable
    """
    if not text or not text.strip():
        return text or ""

    trimmed = text.strip()

    if target_lang == source_lang or target_lang == "en":
        return trimmed

    if target_lang not in SUPPORTED_LANGUAGES:
        return trimmed

    cache_key = f"{trimmed}_{target_lang}"
    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key]

    # 1. Check curated domain dictionary first
    if trimmed in CORE_CS_DICTIONARY and target_lang in CORE_CS_DICTIONARY[trimmed]:
        result = CORE_CS_DICTIONARY[trimmed][target_lang]
        _TRANSLATION_CACHE[cache_key] = result
        return result

    # 2. Try OpenAI Translation (if configured)
    openai_res = _translate_with_openai(trimmed, source_lang=source_lang, target_lang=target_lang)
    if openai_res:
        _TRANSLATION_CACHE[cache_key] = openai_res
        return openai_res

    # 3. Protect technical terms for secondary translation services
    masked_text, token_map = _protect_technical_terms(trimmed)

    # 4. Try GTX engine
    gtx_res = _translate_with_gtx(masked_text, source_lang=source_lang, target_lang=target_lang)
    if not gtx_res:
        gtx_res = _translate_with_gtx(trimmed, source_lang=source_lang, target_lang=target_lang)

    if gtx_res:
        final_result = _restore_technical_terms(gtx_res, token_map)
        _TRANSLATION_CACHE[cache_key] = final_result
        return final_result

    # 5. Try DeepTranslator (GoogleTranslator)
    dt_res = _translate_with_deep_translator(masked_text, source_lang=source_lang, target_lang=target_lang)
    if dt_res:
        final_result = _restore_technical_terms(dt_res, token_map)
        _TRANSLATION_CACHE[cache_key] = final_result
        return final_result

    # 6. Try MyMemory API
    mm_res = _translate_with_mymemory(masked_text, source_lang=source_lang, target_lang=target_lang)
    if not mm_res:
        mm_res = _translate_with_mymemory(trimmed, source_lang=source_lang, target_lang=target_lang)

    if mm_res:
        final_result = _restore_technical_terms(mm_res, token_map)
        _TRANSLATION_CACHE[cache_key] = final_result
        return final_result

    # 7. Fallback safely to original text without crashing
    _TRANSLATION_CACHE[cache_key] = trimmed
    return trimmed

def translate_to_all_languages(text: Optional[str], source_lang: str = "en") -> Dict[str, str]:
    """
    Concurrently translates text into all 6 supported languages:
    {"en": ..., "ta": ..., "hi": ..., "te": ..., "ml": ..., "kn": ...}
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
