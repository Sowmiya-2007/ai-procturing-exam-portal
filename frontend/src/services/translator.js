/**
 * Complete Universal Translation Engine for AI Proctoring Exam Portal
 * Supports English (en), Tamil (ta), Telugu (te), Hindi (hi), Malayalam (ml), Kannada (kn)
 * Handles:
 * 1. Localized Option Letters (A/B/C/D -> அ/ஆ/இ/ஈ, అ/ఆ/ఇ/ఈ, क/ख/ग/घ, etc.)
 * 2. Complete Question, Option, Model Answer, and Explanation Translations
 * 3. Exam Titles, Subjects, Descriptions, Guidelines, and Rubrics
 * 4. Preservation of Technical Keywords (Java, Python, SQL, O(log N), ALU, etc.)
 * 5. Display-layer Student Answer Translations without mutating database records.
 */

export const OPTION_LETTERS = {
  en: ["A", "B", "C", "D", "E", "F", "G", "H"],
  ta: ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ"],
  te: ["అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ"],
  hi: ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज"],
  ml: ["അ", "ആ", "ഇ", "ഈ", "ഉ", "ഊ", "എ", "ഏ"],
  kn: ["ಅ", "ಆ", "ಇ", "ಈ", "ಉ", "ಊ", "ಎ", "ಏ"]
};

/**
 * Get localized letter for option index (0 -> A/அ/అ/क/അ/ಅ)
 */
export function getLocalizedOptionLabel(indexOrLetter, lang = "en") {
  const currentLang = OPTION_LETTERS[lang] ? lang : "en";
  let idx = 0;
  if (typeof indexOrLetter === "number") {
    idx = indexOrLetter;
  } else if (typeof indexOrLetter === "string") {
    const charCode = indexOrLetter.trim().toUpperCase().charCodeAt(0);
    if (charCode >= 65 && charCode <= 72) {
      idx = charCode - 65;
    } else {
      idx = parseInt(indexOrLetter, 10) || 0;
    }
  }
  const letters = OPTION_LETTERS[currentLang] || OPTION_LETTERS.en;
  return letters[idx % letters.length] || letters[0];
}

/**
 * Format question progress label (e.g. "Question 1 of 20" -> "20 இல் கேள்வி 1")
 */
export function formatQuestionNumLabel(current, total, lang = "en") {
  switch (lang) {
    case "ta":
      return `${total} இல் கேள்வி ${current}`;
    case "te":
      return `${total} లో ప్రశ్న ${current}`;
    case "hi":
      return `${total} में से प्रश्न ${current}`;
    case "ml":
      return `${total} ൽ ചോദ്യം ${current}`;
    case "kn":
      return `${total} ರಲ್ಲಿ ಪ್ರಶ್ನೆ ${current}`;
    case "en":
    default:
      return `Question ${current} of ${total}`;
  }
}

/**
 * Master Multilingual Domain Translation Dictionary
 */
export const TRANSLATION_MAP = {
  // 1. Exam Titles & Subjects
  "Computer Science Comprehensive Midterm 2026": {
    ta: "கணினி அறிவியல் விரிவான இடைப்பருவத் தேர்வு 2026",
    te: "కంప్యూటర్ సైన్స్ సమగ్ర మిడ్-టర్మ్ పరీక్ష 2026",
    hi: "कंप्यूटर विज्ञान व्यापक मध्यावधि परीक्षा 2026",
    ml: "കമ്പ്യൂട്ടർ സയൻസ് സമഗ്ര മിഡ്-ടേം പരീക്ഷ 2026",
    kn: "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಸಮಗ್ರ ಮಿಡ್-ಟರ್ಮ್ ಪರೀಕ್ಷೆ 2026"
  },
  "Computer Science & Engineering": {
    ta: "கணினி அறிவியல் மற்றும் பொறியியல்",
    te: "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్",
    hi: "कंप्यूटर विज्ञान और इंजीनियरिंग",
    ml: "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ്",
    kn: "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್"
  },
  "Computer Networks": {
    ta: "கணினி நெட்வொர்க்குகள்",
    te: "కంప్యూటర్ నెట్‌వర్క్‌లు",
    hi: "कंप्यूटर नेटवर्क",
    ml: "കമ്പ്യൂട്ടർ നെറ്റ്‌വർക്കുകൾ",
    kn: "ಕಂಪ್ಯೂಟರ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳು"
  },
  "Data Structures": {
    ta: "தரவு கட்டமைப்புகள்",
    te: "డేటా స్ట్రక్చర్స్",
    hi: "डेटा संरचनाएं",
    ml: "ഡാറ്റാ ഘടനകൾ",
    kn: "ಡೇಟಾ ರಚನೆಗಳು"
  },
  "Database Management Systems": {
    ta: "தரவுத்தள மேலாண்மை அமைப்புகள்",
    te: "డేటాబేస్ మేనేజ్‌మెంట్ సిస్టమ్స్",
    hi: "डेटाबेस प्रबंधन प्रणाली (DBMS)",
    ml: "ഡാറ്റാബേസ് മാനേജ്മെന്റ് സിസ്റ്റംസ്",
    kn: "ಡೇಟಾಬೇಸ್ ಮ್ಯಾನೇಜ್ಮೆಂಟ್ ಸಿಸ್ಟಮ್ಸ್"
  },
  "Artificial Intelligence": {
    ta: "செயற்கை நுண்ணறிவு",
    te: "ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ (కృత్రిమ మేధ)",
    hi: "आर्टिफिशियल इंटेलिजेंस (कृत्रिम बुद्धिमत्ता)",
    ml: "ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ്",
    kn: "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI)"
  },
  "Computer Architecture": {
    ta: "கணினி கட்டமைப்பு",
    te: "కంప్యూటర్ ఆర్కిటెక్చర్",
    hi: "कंप्यूटर आर्किटेक्चर",
    ml: "കമ്പ്യൂട്ടർ ആർക്കിടെക്ചർ",
    kn: "ಕಂಪ್ಯೂಟರ್ ಆರ್ಕಿಟೆಕ್ಚರ್"
  },
  "Official proctored examination covering Networks, Data Structures, Databases, AI, and Microprocessors.": {
    ta: "நெட்வொர்க்குகள், தரவு கட்டமைப்புகள், தரவுத்தளங்கள், AI மற்றும் நுண்செயலிகளை உள்ளடக்கிய அதிகாரப்பூர்வ AI-கண்காணிக்கப்படும் தேர்வு.",
    te: "నెట్‌వర్క్‌లు, డేటా స్ట్రక్చర్‌లు, డేటాబేస్‌లు, AI మరియు మైక్రోప్రాసెసర్‌లను కవర్ చేసే అధికారిక ప్రోక్టర్డ్ పరీక్ష.",
    hi: "नेटवर्क, डेटा संरचनाएं, डेटाबेस, AI और माइक्रोप्रोसेसरों को कवर करने वाली आधिकारिक AI-निगरानी परीक्षा।",
    ml: "നെറ്റ്‌വർക്കുകൾ, ഡാറ്റാ ഘടനകൾ, ഡാറ്റാബേസുകൾ, AI, മൈക്രോപ്രൊസസ്സറുകൾ എന്നിവ ഉൾക്കൊള്ളുന്ന ഔദ്യോഗിക പരീക്ഷ.",
    kn: "ನೆಟ್‌ವರ್ಕ್‌ಗಳು, ಡೇಟಾ ರಚನೆಗಳು, ಡೇಟಾಬೇಸ್‌ಗಳು, AI ಮತ್ತು ಮೈಕ್ರೊಪ್ರೊಸೆಸರ್‌ಗಳನ್ನು ಒಳಗೊಂಡ ಅಧಿಕೃತ ಪರೀಕ್ಷೆ."
  },

  // 2. Exam Questions
  "Which OSI layer is responsible for end-to-end reliable communication, error recovery, and flow control?": {
    ta: "முழுமையான நம்பகமான தகவல் தொடர்பு, பிழை மீட்பு மற்றும் தரவு ஓட்டக் கட்டுப்பாட்டிற்கு எந்த OSI அடுக்கு பொறுப்பாகும்?",
    te: "ఎండ్-టు-ఎండ్ విశ్వసనీయ కమ్యూనికేషన్, లోపం రికవరీ మరియు ఫ్లో నియంత్రణకు ఏ OSI లేయర్ బాధ్యత వహిస్తుంది?",
    hi: "एंड-टू-एंड विश्वसनीय संचार, त्रुटि सुधार और प्रवाह नियंत्रण के लिए कौन सी OSI परत जिम्मेदार है?",
    ml: "എൻഡ്-ടു-എൻഡ് വിശ്വസനീയമായ ആശയവിനിമയം, പിശക് തിരുത്തൽ, ഫ്ലോ നിയന്ത്രണം എന്നിവയ്ക്ക് ഏത് OSI ലെയറാണ് ഉത്തരവാദി?",
    kn: "ಎಂಡ್-ಟು-ಎಂಡ್ ವಿಶ್ವಾಸಾರ್ಹ ಸಂವಹನ, ದೋಷ ಮರುಪಡೆಯುವಿಕೆ ಮತ್ತು ಹರಿವಿನ ನಿಯಂತ್ರಣಕ್ಕೆ ಯಾವ OSI ಲೇಯರ್ ಕಾರಣವಾಗಿದೆ?"
  },
  "Which of the following sorting algorithms have a worst-case time complexity of O(N log N)?": {
    ta: "பின்வரும் வரிசையாக்க அல்காரிதங்களில் எது O(N log N) என்ற மோசமான நேர சிக்கலைக் கொண்டுள்ளது?",
    te: "కింది సార్టింగ్ అల్గారిథమ్‌లలో ఏది O(N log N) యొక్క చెత్త-కేస్ సమయ సంక్లిష్టతను కలిగి ఉంది?",
    hi: "निम्नलिखित में से किस सॉर्टिंग एल्गोरिदम की सबसे खराब समय जटिलता (Worst-case complexity) O(N log N) है?",
    ml: "ഇനിപ്പറയുന്ന സോർട്ടിംഗ് അൽഗോരിതങ്ങളിൽ ഏതിനാണ് O(N log N) വേഴ്സ്റ്റ്-കേസ് ടൈം കോംപ്ലക്സിറ്റി ഉള്ളത്?",
    kn: "ಕೆಳಗಿನ ಯಾವ ವಿಂಗಡಣೆ (sorting) ಅಲ್ಗಾರಿದಮ್‌ಗಳು O(N log N) ನ ಕೆಟ್ಟ-ಸಂದರ್ಭದ ಸಮಯ ಸಂಕೀರ್ಣತೆಯನ್ನು ಹೊಂದಿವೆ?"
  },
  "State the CAP theorem in distributed database systems and define each property.": {
    ta: "விநியோகிக்கப்பட்ட தரவுத்தள அமைப்புகளில் CAP தேற்றத்தைக் கூறி அதன் ஒவ்வொரு பண்பையும் வரையறுக்கவும்.",
    te: "పంపిణీ చేయబడిన డేటాబేస్ సిస్టమ్‌లలో CAP సిద్ధాంతాన్ని తెలిపి ప్రతి లక్షణాన్ని నిర్వచించండి.",
    hi: "वितरित डेटाबेस सिस्टम में CAP प्रमेय का उल्लेख करें और प्रत्येक विशेषता को परिभाषित करें।",
    ml: "വിതരണം ചെയ്ത ഡാറ്റാബേസ് സിസ്റ്റങ്ങളിലെ CAP സിദ്ധാന്തം പ്രസ്താവിക്കുകയും ഓരോ സവിശേഷതയും നിർവചിക്കുകയും ചെയ്യുക.",
    kn: "ವಿತರಿಸಿದ ಡೇಟಾಬೇಸ್ ಸಿಸ್ಟಮ್‌ಗಳಲ್ಲಿ CAP ಪ್ರಮೇಯವನ್ನು ತಿಳಿಸಿ ಮತ್ತು ಪ್ರತಿಯೊಂದು ಗುಣಲಕ್ಷಣವನ್ನು ವಿವರಿಸಿ."
  },
  "Explain the Backpropagation algorithm in Deep Neural Networks. Formulate gradient descent weight updates using the multivariable chain rule.": {
    ta: "ஆழ்ந்த நியூரல் நெட்வொர்க்குகளில் Backpropagation அல்காரிதத்தை விளக்குக. பலமாறி சங்கிலி விதியைப் பயன்படுத்தி gradient descent எடை புதுப்பிப்புகளை சூத்திரப்படுத்துக.",
    te: "డీప్ న్యూరల్ నెట్‌వర్క్‌లలో బ్యాక్‌ప్రాపగేషన్ అల్గారిథమ్‌ను వివరించండి. మల్టీవేరియబుల్ చైన్ రూల్ ఉపయోగించి గ్రేడియంట్ డీసెంట్ వెయిట్ అప్‌డేట్‌లను రూపొందించండి.",
    hi: "डीप न्यूरल नेटवर्क में बैकप्रॉपैगfindingsशन (Backpropagation) एल्गोरिदम की व्याख्या करें। बहुचरीय श्रृंखला नियम का उपयोग करके ग्रेडिएंट डिसेंट वेट अपडेट तैयार करें।",
    ml: "ഡീപ് ന്യൂറൽ നെറ്റ്‌വർക്കുകളിലെ ബാക്ക്‌പ്രൊപ്പാഗേഷൻ അൽഗോരിതം വിശദീകരിക്കുക. ഗ്രേഡിയന്റ് ഡിസെന്റ് വെയ്റ്റ് അപ്‌ഡേറ്റുകൾ സൂത്രവാക്യമാക്കുക.",
    kn: "ಡೀಪ್ ನ್ಯೂರಲ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳಲ್ಲಿ ಬ್ಯಾಕ್‌ಪ್ರೊಪಾಗೇಶನ್ ಅಲ್ಗಾರಿದಮ್ ಅನ್ನು ವಿವರಿಸಿ. ಗ್ರೇಡಿಯಂಟ್ ಡಿಸೆಂಟ್ ತೂಕದ ನವೀಕರಣಗಳನ್ನು ಸೂತ್ರೀಕರಿಸಿ."
  },
  "Draw the complete architectural block diagram of an 8-bit Microprocessor including ALU, Accumulator, Flag Register, PC, and Stack Pointer. Upload a clear handwritten schematic.": {
    ta: "ALU, அக்குமுலேட்டர், கொடிப் பதிவேடு, PC மற்றும் Stack Pointer ஆகியவற்றை உள்ளடக்கிய 8-பிட் நுண்செயலியின் முழுமையான கட்டமைப்பு வரைபடத்தை வரைந்து பதிவேற்றவும்.",
    te: "ALU, అక్యుమ్యులేటర్, ఫ్లాగ్ రిజిస్టర్, PC మరియు స్టాక్ పాయింటర్‌లతో సహా 8-బిట్ మైక్రోప్రాసెసర్ యొక్క పూర్తి ఆర్కిటెక్చరల్ బ్లాక్ రేఖాచిత్రాన్ని గీయండి.",
    hi: "ALU, संचायक (Accumulator), ध्वज रजिस्टर, PC और स्टैक पॉइंटर सहित 8-बिट माइक्रोप्रोसेसर का संपूर्ण ब्लॉक आरेख बनाएं। हस्तलिखित रेखाचित्र अपलोड करें।",
    ml: "ALU, അക്യുമുലേറ്റർ, ഫ്ലാഗ് രജിസ്റ്റർ, PC, സ്റ്റാക്ക് പോയിന്റർ എന്നിവ ഉൾപ്പെടുന്ന 8-ബിറ്റ് മൈക്രോപ്രൊസസ്സറിന്റെ പൂർണ്ണ ബ്ലോക്ക് ഡയഗ്രം വരച്ച് അപ്‌ലോഡ് ചെയ്യുക.",
    kn: "ALU, ಅಕ್ಯುಮ್ಯುಲೇಟರ್, ಫ್ಲ್ಯಾಗ್ ರಿಜಿಸ್ಟರ್, PC ಮತ್ತು ಸ್ಟ್ಯಾಕ್ ಪಾಯಿಂಟರ್ ಸೇರಿದಂತೆ 8-ಬಿಟ್ ಮೈಕ್ರೊಪ್ರೊಸೆಸರ್‌ನ ಸಂಪೂರ್ಣ ಬ್ಲಾಕ್ ರೇಖಾಚಿತ್ರವನ್ನು ಬರೆದು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
  },
  "What is the time complexity of binary search?": {
    ta: "இரும தேடலின் (Binary Search) நேர சிக்கலானது என்ன?",
    te: "బైనరీ సెర్చ్ యొక్క సమయ సంక్లిష్టత (Time Complexity) ఎంత?",
    hi: "बाइनरी सर्च (Binary Search) की समय जटिलता क्या है?",
    ml: "ബൈനറി സെർച്ചിന്റെ ടൈം കോംപ്ലക്സിറ്റി എന്താണ്?",
    kn: "ಬೈನರಿ ಹುಡುಕಾಟದ (Binary Search) ಸಮಯ ಸಂಕೀರ್ಣತೆ ಎಷ್ಟು?"
  },

  // 3. Options
  "Transport Layer": {
    ta: "போக்குவரத்து அடுக்கு (Transport Layer)",
    te: "ట్రాన్స్‌పోర్ట్ లేయర్ (Transport Layer)",
    hi: "ट्रांसपोर्ट परत (Transport Layer)",
    ml: "ട്രാൻസ്പോർട്ട് ലെയർ (Transport Layer)",
    kn: "ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್ (Transport Layer)"
  },
  "Network Layer": {
    ta: "பிணைய அடுக்கு (Network Layer)",
    te: "నెట్‌వర్క్ లేయర్ (Network Layer)",
    hi: "नेटवर्क परत (Network Layer)",
    ml: "നെറ്റ്‌വർക്ക് ലെയർ (Network Layer)",
    kn: "ನೆಟ್‌ವರ್ಕ್ ಲೇಯರ್ (Network Layer)"
  },
  "Data Link Layer": {
    ta: "தரவு இணைப்பு அடுக்கு (Data Link Layer)",
    te: "డేటా లింక్ లేయర్ (Data Link Layer)",
    hi: "डेटा लिंक परत (Data Link Layer)",
    ml: "ഡാറ്റ ലിങ്ക് ലെയർ (Data Link Layer)",
    kn: "ಡೇಟಾ ಲಿಂಕ್ ಲೇಯರ್ (Data Link Layer)"
  },
  "Session Layer": {
    ta: "அமர்வு அடுக்கு (Session Layer)",
    te: "సెషన్ లేయర్ (Session Layer)",
    hi: "सत्र परत (Session Layer)",
    ml: "സെഷൻ ലെയർ (Session Layer)",
    kn: "ಸೆಷನ್ ಲೇಯರ್ (Session Layer)"
  },
  "Merge Sort": {
    ta: "இணைப்பு வரிசையாக்கம் (Merge Sort)",
    te: "మెర్జ్ సార్ట్ (Merge Sort)",
    hi: "मर्ज सॉर्ट (Merge Sort)",
    ml: "മെർജ് സോർട്ട് (Merge Sort)",
    kn: "ಮರ್ಜ್ ಸಾರ್ಟ್ (Merge Sort)"
  },
  "Heap Sort": {
    ta: "குவியல் வரிசையாக்கம் (Heap Sort)",
    te: "హీప్ సార్ట్ (Heap Sort)",
    hi: "हीप सॉर्ट (Heap Sort)",
    ml: "ഹീപ്പ് സോർട്ട് (Heap Sort)",
    kn: "ಹೀಪ್ ಸಾರ್ಟ್ (Heap Sort)"
  },
  "Quick Sort": {
    ta: "விரைவு வரிசையாக்கம் (Quick Sort)",
    te: "క్విక్ సార్ట్ (Quick Sort)",
    hi: "क्विक सॉर्ट (Quick Sort)",
    ml: "ക്വിക്ക് സോർട്ട് (Quick Sort)",
    kn: "ಕ್ವಿಕ್ ಸಾರ್ಟ್ (Quick Sort)"
  },
  "Bubble Sort": {
    ta: "குமிழி வரிசையாக்கம் (Bubble Sort)",
    te: "బబుల్ సార్ట్ (Bubble Sort)",
    hi: "बबल सॉर्ट (Bubble Sort)",
    ml: "ബബിൾ സോർട്ട് (Bubble Sort)",
    kn: "ಬಬಲ್ ಸಾರ್ಟ್ (Bubble Sort)"
  },
  "Logarithmic time": {
    ta: "மடக்கை நேரம் (Logarithmic time / O(log N))",
    te: "లాగరిథమిక్ సమయం (Logarithmic time / O(log N))",
    hi: "लघुगणकीय समय (Logarithmic time / O(log N))",
    ml: "ലോഗരിതമിക് സമയം (Logarithmic time / O(log N))",
    kn: "ಲಾಗರಿಥಮಿಕ್ ಸಮಯ (Logarithmic time / O(log N))"
  },
  "Linear time": {
    ta: "நேரியல் நேரம் (Linear time / O(N))",
    te: "లీనియర్ సమయం (Linear time / O(N))",
    hi: "रैखिक समय (Linear time / O(N))",
    ml: "ലീനിയർ സമയം (Linear time / O(N))",
    kn: "ರೇಖೀಯ ಸಮಯ (Linear time / O(N))"
  },
  "Quadratic time": {
    ta: "இருபடி நேரம் (Quadratic time / O(N²))",
    te: "క్వాడ్రాటిక్ సమయం (Quadratic time / O(N²))",
    hi: "द्विघात समय (Quadratic time / O(N²))",
    ml: "ക്വാഡ്രാറ്റിക് സമയം (Quadratic time / O(N²))",
    kn: "ವರ್ಗೀಯ ಸಮಯ (Quadratic time / O(N²))"
  },
  "Constant time": {
    ta: "மாறிலி நேரம் (Constant time / O(1))",
    te: "స్థిర సమయం (Constant time / O(1))",
    hi: "स्थिर समय (Constant time / O(1))",
    ml: "സ്ഥിര സമയം (Constant time / O(1))",
    kn: "ಸ್ಥಿರ ಸಮಯ (Constant time / O(1))"
  },

  // 4. Model Answers & Explanations
  "Transport layer (Layer 4) provides transparent transfer of data between end users.": {
    ta: "போக்குவரத்து அடுக்கு (அடுக்கு 4) இறுதிப் பயனர்களுக்கு இடையே வெளிப்படையான மற்றும் நம்பகமான தரவுப் பரிமாற்றத்தை வழங்குகிறது.",
    te: "ట్రాన్స్‌పోర్ట్ లేయర్ (లేయర్ 4) తుది వినియోగదారుల మధ్య పారదర్శక మరియు విశ్వసనీయ డేటా బదిలీని అందిస్తుంది.",
    hi: "ट्रांसपोर्ट लेयर (लेयर 4) अंतिम उपयोगकर्ताओं के बीच डेटा का पारदर्शी और विश्वसनीय हस्तांतरण प्रदान करती है।",
    ml: "ട്രാൻസ്പോർട്ട് ലെയർ (ലെയർ 4) അന്തിമ ഉപയോക്താക്കൾക്കിടയിൽ സുതാര്യമായ ഡാറ്റാ കൈമാറ്റം നൽകുന്നു.",
    kn: "ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್ (ಲೇಯರ್ 4) ಬಳಕೆದಾರರ ನಡುವೆ ವಿಶ್ವಾಸಾರ್ಹ ಡೇಟಾ ವರ್ಗಾವಣೆಯನ್ನು ಒದಗಿಸುತ್ತದೆ."
  },
  "Merge Sort and Heap Sort maintain O(N log N) worst-case time complexity.": {
    ta: "Merge Sort மற்றும் Heap Sort ஆகியவை O(N log N) என்ற மோசமான நேர சிக்கலைத் தொடர்ந்து பராமரிக்கின்றன.",
    te: "మెర్జ్ సార్ట్ మరియు హీప్ సార్ట్ O(N log N) చెత్త-కేస్ సమయ సంక్లిష్టతను నిర్వహిస్తాయి.",
    hi: "मर्ज सॉर्ट और हीप सॉर्ट सबसे खराब स्थिति में भी O(N log N) समय जटिलता बनाए रखते हैं।",
    ml: "Merge Sort, Heap Sort എന്നിവ O(N log N) വേഴ്സ്റ്റ്-കേസ് ടൈം കോംപ്ലക്സിറ്റി നിലനിർത്തുന്നു.",
    kn: "Merge Sort ಮತ್ತು Heap Sort O(N log N) ಕೆಟ್ಟ ಸಂದರ್ಭದ ಸಮಯದ ಸಂಕೀರ್ಣತೆಯನ್ನು ನಿರ್ವಹಿಸುತ್ತವೆ."
  },
  "The CAP theorem states that a distributed system cannot simultaneously provide more than two out of Consistency, Availability, and Partition Tolerance.": {
    ta: "ஒரு விநியோகிக்கப்பட்ட அமைப்பால் நிலைத்தன்மை (Consistency), கிடைக்கும் தன்மை (Availability) மற்றும் பகிர்வு சகிப்புத்தன்மை (Partition Tolerance) ஆகியவற்றில் இரண்டிற்கு மேல் ஒரே நேரத்தில் வழங்க முடியாது என்று CAP தேற்றம் கூறுகிறது.",
    te: "పంపిణీ చేయబడిన వ్యవస్థ స్థిరత్వం (Consistency), లభ్యత (Availability) మరియు విభజన సహనం (Partition Tolerance)లలో ఏకకాలంలో రెండింటి కంటే ఎక్కువ అందించలేదని CAP సిద్ధాంతం పేర్కొంటుంది.",
    hi: "CAP प्रमेय कहता है कि एक वितरित प्रणाली एक साथ संगति (Consistency), उपलब्धता (Availability) और विभाजन सहनशीलता (Partition Tolerance) में से दो से अधिक प्रदान नहीं कर सकती है।",
    ml: "ഒരു വിതരണ സംവിധാനത്തിന് ഒരേസമയം Consistency, Availability, Partition Tolerance എന്നിവയിൽ രണ്ടിൽ കൂടുതൽ നൽകാൻ കഴിയില്ലെന്ന് CAP സിദ്ധാന്തം പ്രസ്താവിക്കുന്നു.",
    kn: "ವಿತರಿಸಲಾದ ವ್ಯವಸ್ಥೆಯು ಸ್ಥಿರತೆ (Consistency), ಲಭ್ಯತೆ (Availability) ಮತ್ತು ವಿಭಜನಾ ಸಹಿಷ್ಣುತೆ (Partition Tolerance) ಗಳಲ್ಲಿ ಏಕಕಾಲದಲ್ಲಿ ಎರಡಕ್ಕಿಂತ ಹೆಚ್ಚಿನದನ್ನು ಒದಗಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ ಎಂದು CAP ಪ್ರಮೇಯವು ಹೇಳುತ್ತದೆ."
  },
  "Binary search repeatedly divides the search space into two halves.": {
    ta: "இருமத் தேடல் தேடல் பகுதியை மீண்டும் மீண்டும் இரண்டு பகுதிகளாகப் பிரிக்கிறது, இதனால் O(log N) மடக்கை நேர சிக்கல் ஏற்படுகிறது.",
    te: "బైనరీ సెర్చ్ శోధన స్థలాన్ని పదేపదే రెండు భాగాలుగా విభజిస్తుంది, దీని వలన O(log N) సమయ సంక్లిష్టత లభిస్తుంది.",
    hi: "बाइनरी सर्च खोज स्थान को बार-बार दो हिस्सों में विभाजित करता है, जिसके परिणामस्वरूप O(log N) समय जटिलता होती है।",
    ml: "ബൈനറി സെർച്ച് തിരയൽ സ്ഥലത്തെ ആവർത്തിച്ച് രണ്ട് ഭാഗങ്ങളായി വിഭജിക്കുന്നു, ഇത് O(log N) സമയം നൽകുന്നു.",
    kn: "ಬೈನರಿ ಹುಡುಕಾಟವು ಹುಡುಕಾಟ ಜಾಗವನ್ನು ಪುನರಾವರ್ತಿತವಾಗಿ ಎರಡು ಭಾಗಗಳಾಗಿ ವಿಭಜಿಸುತ್ತದೆ."
  },
  "Binary search has O(log n) complexity.": {
    ta: "இரும தேடலின் நேர சிக்கலானது O(log n) ஆகும்.",
    te: "బైనరీ సెర్చ్ O(log n) సమయ సంక్లిష్టతను కలిగి ఉంది.",
    hi: "बाइनरी सर्च की जटिलता O(log n) है।",
    ml: "ബൈനറി സെർച്ചിന് O(log n) കോംപ്ലക്സിറ്റി ഉണ്ട്.",
    kn: "ಬೈನರಿ ಹುಡುಕಾಟವು O(log n) ಸಂಕೀರ್ಣತೆಯನ್ನು ಹೊಂದಿದೆ."
  },
  "Comprehensive explanation of error propagation across multi-layer perceptrons with learning rate hyperparameter optimization.": {
    ta: "கற்றல் விகித தேர்வுமுறையுடன் கூடிய பல அடுக்கு பெர்செப்ட்ரான்களில் பிழை பரவல் குறித்த விரிவான விளக்கம்.",
    te: "లెర్నింగ్ రేట్ ఆప్టిమైజేషన్‌తో బహుళ-లేయర్ పర్సెప్ట్రాన్‌లలో ఎర్రర్ ప్రచారం యొక్క సమగ్ర వివరణ.",
    hi: "लर्निंग रेट हाइपरपैरामीटर ऑप्टिमाइज़ेशन के साथ मल्टी-लेयर परसेप्ट्रॉन में त्रुटि प्रसार की विस्तृत व्याख्या।",
    ml: "മൾട്ടി-ലെയർ പെർസെപ്‌ട്രോണുകളിലുടനീളമുള്ള പിശക് പ്രചരണത്തെക്കുറിച്ചുള്ള സമഗ്രമായ വിശദീകരണം.",
    kn: "ಕಲಿಕೆಯ ದರ ಆಪ್ಟಿಮೈಸೇಶನ್‌ನೊಂದಿಗೆ ಬಹು-ಪದರದ ಪರ್ಸೆಪ್ಟ್ರಾನ್‌ಗಳಲ್ಲಿ ದೋಷ ಪ್ರಸರಣದ ಸಮಗ್ರ ವಿವರಣೆ."
  },
  "Properly labeled diagram illustrating data bus interconnects, address bus latching, and control bus signals.": {
    ta: "தரவுப் பேருந்து இணைப்புகள், முகவரிப் பேருந்து லேட்ச்சிங் மற்றும் கட்டுப்பாட்டுப் பேருந்து சமிக்ஞைகளை விளக்கும் சரியான லேபிளிட்ட வரைபடம்.",
    te: "డేటా బస్ ఇంటర్‌కనెక్ట్‌లు, అడ్రస్ బస్ లాచింగ్ మరియు కంట్రోల్ బస్ సిగ్నల్‌లను వివరించే సరిగ్గా లేబుల్ చేయబడిన రేఖాచిత్రం.",
    hi: "डेटा बस इंटरकनेक्ट, एड्रेस बस लैचिंग और कंट्रोल बस सिग्नल को दर्शाने वाला उचित लेबल वाला आरेख।",
    ml: "ഡാറ്റാ ബസ് ഇന്റർകണക്റ്റുകൾ, വിലാസ ബസ് ലാച്ചിംഗ്, കൺട്രോൾ ബസ് സിഗ്നലുകൾ എന്നിവ വ്യക്തമാക്കുന്ന ശരിയായ രേഖാചിത്രം.",
    kn: "ಡೇಟಾ ಬಸ್ ಇಂಟರ್‌ಕನೆಕ್ಟ್‌ಗಳು, ಅಡ್ರೆಸ್ ಬಸ್ ಲ್ಯಾಚಿಂಗ್ ಮತ್ತು ಕಂಟ್ರೋಲ್ ಬಸ್ ಸಿಗ್ನಲ್‌ಗಳನ್ನು ವಿವರಿಸುವ ಲೇಬಲ್ ಮಾಡಿದ ರೇಖಾಚಿತ್ರ."
  },
  "Schematic showing internal bus lines, ALU, register array, timing and control logic.": {
    ta: "உள் பேருந்து இணைப்புகள், ALU, பதிவேடு வரிசை, நேரம் மற்றும் கட்டுப்பாட்டு தர்க்கத்தைக் காட்டும் திட்ட வரைபடம்.",
    te: "అంతర్గత బస్సు లైన్లు, ALU, రిజిస్టర్ శ్రేణి, టైమింగ్ మరియు నియంత్రణ లాజిక్‌లను చూపే రేఖాచిత్రం.",
    hi: "आंतरिक बस लाइनें, ALU, रजिस्टर सरणी, समय और नियंत्रण तर्क दिखाने वाला योजनाबद्ध आरेख।",
    ml: "ആന്തരിക ബസ് ലൈനുകൾ, ALU, രജിസ്റ്റർ അറേ, ടൈമിംഗ്, കൺട്രോൾ ലോജിക് എന്നിവ കാണിക്കുന്ന സ്കീമാറ്റിക്.",
    kn: "ಆಂತರಿಕ ಬಸ್ ಲೈನ್‌ಗಳು, ALU, ರಿಜಿಸ್ಟರ್ ಅರೇ ಮತ್ತು ಕಂಟ್ರೋಲ್ ಲಾಜಿಕ್ ಅನ್ನು ತೋರಿಸುವ ರೇಖಾಚಿತ್ರ."
  },
  "Consistency, Availability, Partition Tolerance": {
    ta: "நிலைத்தன்மை (Consistency), கிடைக்கும் தன்மை (Availability), பகிர்வு சகிப்புத்தன்மை (Partition Tolerance)",
    te: "స్థిరత్వం (Consistency), లభ్యత (Availability), విభజన సహనం (Partition Tolerance)",
    hi: "संगति (Consistency), उपलब्धता (Availability), विभाजन सहनशीलता (Partition Tolerance)",
    ml: "Consistency, Availability, Partition Tolerance",
    kn: "ಸ್ಥಿರತೆ (Consistency), ಲಭ್ಯತೆ (Availability), ವಿಭಜನಾ ಸಹಿಷ್ಣುತೆ (Partition Tolerance)"
  },
  "Correct answer selected.": {
    ta: "சரியான விடை தேர்ந்தெடுக்கப்பட்டது.",
    te: "సరైన సమాధానం ఎంపಿಕ చేయబడింది.",
    hi: "सही उत्तर चुना गया।",
    ml: "ശരിയായ ഉത്തരം തിരഞ്ഞെടുത്തു.",
    kn: "ಸರಿಯಾದ ಉತ್ತರವನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ."
  },
  "Incorrect option chosen.": {
    ta: "தவறான விடை தேர்ந்தெடுக்கப்பட்டது.",
    te: "తప్పు ఎంపిక ఎంచుకోబడింది.",
    hi: "गलत विकल्प चुना गया।",
    ml: "തെറ്റായ ഓപ്ഷൻ തിരഞ്ഞെടുത്തു.",
    kn: "ತಪ್ಪು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಲಾಗಿದೆ."
  },
  "All correct options identified precisely.": {
    ta: "அனைத்து சரியான விருப்பங்களும் துல்லியமாக தேர்ந்தெடுக்கப்பட்டுள்ளன.",
    te: "అన్ని సరైన ఎంపికలు ఖచ్చితంగా గుర్తించబడ్డాయి.",
    hi: "सभी सही विकल्पों की सटीक पहचान की गई।",
    ml: "എല്ലാ ശരിയായ ഓപ്ഷനുകളും കൃത്യമായി തിരിച്ചറിഞ്ഞു.",
    kn: "ಎಲ್ಲಾ ಸರಿಯಾದ ಆಯ್ಕೆಗಳನ್ನು ನಿಖರವಾಗಿ ಗುರುತಿಸಲಾಗಿದೆ."
  },
  "Handwritten diagram submission captured. Preliminary suggestion recorded; awaiting examiner review.": {
    ta: "கையால் வரையப்பட்ட வரைபட சமர்ப்பிப்பு பிடிக்கப்பட்டது. தொடக்க மதிப்பீடு பதிவு செய்யப்பட்டது; தேர்வாளர் ஆய்வுக்கு காத்திருக்கிறது.",
    te: "చేతితో రాసిన రేఖాచిత్ర సమర్పణ సంగ్రహించబడింది. ప్రాథమిక సూచన రికార్డ్ చేయబడింది.",
    hi: "हस्तलिखित आरेख प्रस्तुति कैप्चर की गई। प्रारंभिक सुझाव दर्ज किया गया; परीक्षक समीक्षा की प्रतीक्षा है।",
    ml: "കൈയെഴുത്ത് ഡയഗ്രം സമർപ്പണം രേഖപ്പെടുത്തി. പ്രിലിമിനറി നിർദ്ദേശം രേഖപ്പെടുത്തി.",
    kn: "ಹಸ್ತರೇಖಾಚಿತ್ರ ಸಲ್ಲಿಕೆಯನ್ನು ಸೆರೆಹಿಡಿಯಲಾಗಿದೆ. ಪ್ರಾಥಮಿಕ ಸಲಹೆ ದಾಖಲಿಸಲಾಗಿದೆ."
  },
  "No response provided.": {
    ta: "பதில் எதுவும் வழங்கப்படவில்லை.",
    te: "ఎలాంటి సమాధానం ఇవ్వలేదు.",
    hi: "कोई उत्तर नहीं दिया गया।",
    ml: "ഉത്തരമൊന്നും നൽകിയിട്ടില്ല.",
    kn: "ಯಾವುದೇ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿಲ್ಲ."
  },
  "Substantive answer provided. Good explanation depth.": {
    ta: "முக்கியமான பதில் வழங்கப்பட்டது. சிறந்த விளக்க ஆழம்.",
    te: "సమగ్రమైన సమాధానం ఇవ్వబడింది. మంచి వివరణ.",
    hi: "ठोस उत्तर प्रदान किया गया। अच्छी व्याख्या।",
    ml: "വ്യക്തമായ ഉത്തരം നൽകി. നല്ല വിശദീകരണം.",
    kn: "ಸಮಗ್ರ ಉತ್ತರವನ್ನು ನೀಡಲಾಗಿದೆ. ಉತ್ತಮ ವಿವರಣೆ."
  },
  "Clean examination session verified. Webcam, audio parameters, and browser focus remained compliant with institutional standards.": {
    ta: "தூய்மையான தேர்வு அமர்வு சரிபார்க்கப்பட்டது. வெப்கேம், ஆடியோ மற்றும் திரை கவனம் நிறுவன விதிகளுக்கு இணங்க இருந்தது.",
    te: "క్లీన్ పరీక్ష సెషన్ ధృవీకరించబడింది. వెబ్‌క్యామ్, ఆడియో పారామితులు నిబంధనలకు అనుగుణంగా ఉన్నాయి.",
    hi: "स्वच्छ परीक्षा सत्र सत्यापित। वेबकैम, ऑडियो पैरामीटर और ब्राउज़र फोकस संस्थागत मानकों के अनुरूप रहे।",
    ml: "വൃത്തിയുള്ള പരീക്ഷാ സെഷൻ പരിശോധിച്ചുറപ്പിച്ചു. മാനദണ്ഡങ്ങൾ പാലിച്ചു.",
    kn: "ಸ್ವಚ್ಛ ಪರೀಕ್ಷಾ ಅಧಿವೇಶನವನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಮಾನದಂಡಗಳಿಗೆ ಅನುಗುಣವಾಗಿದೆ."
  }
};

/**
 * Universal text translation helper
 * Translates text if matching translation is available in dictionary, otherwise preserves technical syntax.
 */
export function translateContent(text, lang = "en") {
  if (!text || typeof text !== "string" || lang === "en") {
    return text;
  }

  const trimmed = text.trim();
  
  // 1. Direct dictionary match
  if (TRANSLATION_MAP[trimmed] && TRANSLATION_MAP[trimmed][lang]) {
    return TRANSLATION_MAP[trimmed][lang];
  }

  // 2. Case-insensitive lookup
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(TRANSLATION_MAP)) {
    if (key.toLowerCase() === lower && val[lang]) {
      return val[lang];
    }
  }

  return text;
}

/**
 * Deeply translates a question object into the target language,
 * prioritizing direct database multilingual columns (question_text_ta, option_text_ta, etc.)
 */
export function translateQuestionObject(q, lang = "en") {
  if (!q || typeof q !== "object") return q;
  if (lang === "en") return q;

  const lk = lang.toLowerCase();
  const translatedText = q[`question_text_${lk}`] || translateContent(q.question_text, lang);
  const translatedModel = q[`model_answer_${lk}`] || translateContent(q.model_answer, lang);
  const translatedExpected = translateContent(q.expected_answer, lang);
  const translatedGuidelines = translateContent(q.evaluation_guidelines, lang);
  const translatedSubject = q[`subject_${lk}`] || translateContent(q.subject, lang);
  const translatedExplanation = q[`explanation_${lk}`] || translateContent(q.explanation, lang);

  const translatedOptions = (q.options || []).map((opt, idx) => {
    const optText = opt[`option_text_${lk}`] || translateContent(opt.option_text, lang);
    return {
      ...opt,
      option_text: optText,
      localized_letter: getLocalizedOptionLabel(idx, lang)
    };
  });

  return {
    ...q,
    question_text: translatedText,
    subject: translatedSubject,
    model_answer: translatedModel,
    expected_answer: translatedExpected,
    evaluation_guidelines: translatedGuidelines,
    explanation: translatedExplanation,
    options: translatedOptions
  };
}

/**
 * Deeply translates an exam object into the target language
 */
export function translateExamObject(exam, lang = "en") {
  if (!exam || typeof exam !== "object" || lang === "en") return exam;
  const lk = lang.toLowerCase();

  const translatedTitle = exam[`title_${lk}`] || translateContent(exam.title, lang);
  const translatedSubject = exam[`subject_${lk}`] || translateContent(exam.subject, lang);
  const translatedDesc = exam[`description_${lk}`] || translateContent(exam.description, lang);
  const translatedInstructions = exam[`instructions_${lk}`] || translateContent(exam.instructions, lang);
  const translatedQuestions = (exam.exam_questions || []).map(eq => {
    if (!eq.question) return eq;
    return {
      ...eq,
      question: translateQuestionObject(eq.question, lang)
    };
  });

  return {
    ...exam,
    title: translatedTitle,
    subject: translatedSubject,
    description: translatedDesc,
    instructions: translatedInstructions,
    exam_questions: translatedQuestions
  };
}

/**
 * Deeply translates exam session payload (questions, exam title, subject, instructions)
 */
export function translateExamSessionData(sessionData, lang = "en") {
  if (!sessionData || lang === "en") return sessionData;
  const lk = lang.toLowerCase();

  const translatedQuestions = (sessionData.questions || []).map(q => translateQuestionObject(q, lang));
  const translatedTitle = sessionData[`exam_title_${lk}`] || translateContent(sessionData.exam_title, lang);
  const translatedSubject = sessionData[`exam_subject_${lk}`] || translateContent(sessionData.exam_subject, lang);
  const translatedDesc = sessionData[`exam_description_${lk}`] || translateContent(sessionData.exam_description, lang);
  const translatedInstructions = sessionData[`exam_instructions_${lk}`] || translateContent(sessionData.exam_instructions, lang);

  return {
    ...sessionData,
    exam_title: translatedTitle,
    exam_subject: translatedSubject,
    exam_description: translatedDesc,
    exam_instructions: translatedInstructions,
    questions: translatedQuestions
  };
}

/**
 * Deeply translates exam result breakdown items into target language
 */
export function translateResultBreakdownItems(breakdownList, lang = "en") {
  if (!breakdownList || !Array.isArray(breakdownList) || lang === "en") {
    return breakdownList || [];
  }

  return breakdownList.map(item => {
    const translatedQ = translateQuestionObject(item, lang);
    return {
      ...translatedQ,
      ai_feedback: translateContent(item.ai_feedback, lang),
      examiner_feedback: translateContent(item.examiner_feedback, lang),
      text_answer: translateContent(item.text_answer, lang)
    };
  });
}
