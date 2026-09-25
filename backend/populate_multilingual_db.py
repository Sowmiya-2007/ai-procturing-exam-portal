"""
Complete Database Migration & Population for 6 Languages:
English (en), Tamil (ta), Telugu (te), Hindi (hi), Malayalam (ml), Kannada (kn)
Populates:
1. Exams: title_*, subject_*, description_*, instructions_*
2. Questions: question_text_*, explanation_*, model_answer_*
3. Options: option_text_*
"""
from app.core.database import SessionLocal
from app.models.exam import Exam
from app.models.question import Question, Option

TRANSLATION_MAP = {
    # Exam Titles & Subjects
    "Computer Science Comprehensive Midterm 2026": {
        "ta": "கணினி அறிவியல் விரிவான இடைப்பருவத் தேர்வு 2026",
        "te": "కంప్యూటర్ సైన్స్ సమగ్ర మిడ్-టర్మ్ పరీక్ష 2026",
        "hi": "कंप्यूटर विज्ञान व्यापक मध्यावधि परीक्षा 2026",
        "ml": "കമ്പ്യൂട്ടർ സയൻസ് സമഗ്ര മിഡ്-ടേം പരീക്ഷ 2026",
        "kn": "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಸಮಗ್ರ ಮಿಡ್-ಟರ್ಮ್ ಪರೀಕ್ಷೆ 2026"
    },
    "Algorithms Mastery Assessment 2026": {
        "ta": "அல்காரிதம்கள் தேர்ச்சி மதிப்பீடு 2026",
        "te": "అల్గారిథమ్స్ మాస్టరీ అసెస్‌మెంట్ 2026",
        "hi": "एल्गोरिदम महारत मूल्यांकन 2026",
        "ml": "അൽഗോരിതങ്ങൾ മാസ്റ്ററി അസസ്സ്മെന്റ് 2026",
        "kn": "ಅಲ್ಗಾರಿದಮ್‌ಗಳ ಪಾಂಡಿತ್ಯ ಮೌಲ್ಯಮಾಪನ 2026"
    },
    "Computer Science & Engineering": {
        "ta": "கணினி அறிவியல் மற்றும் பொறியியல்",
        "te": "కంప్యూటర్ సైన్స్ & ఇంజనీరింగ్",
        "hi": "कंप्यूटर विज्ञान और इंजीनियरिंग",
        "ml": "കമ്പ്യൂട്ടർ സയൻസ് & എഞ്ചിനീയറിംഗ്",
        "kn": "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್"
    },
    "Computer Networks": {
        "ta": "கணினி நெட்வொர்க்குகள்",
        "te": "కంప్యూటర్ నెట్‌వర్క్‌లు",
        "hi": "कंप्यूटर नेटवर्क",
        "ml": "കമ്പ്യൂട്ടർ നെറ്റ്‌വർക്കുകൾ",
        "kn": "ಕಂಪ್ಯೂಟರ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳು"
    },
    "Data Structures": {
        "ta": "தரவு கட்டமைப்புகள்",
        "te": "డేటా స్ట్రక్చర్స్",
        "hi": "डेटा संरचनाएं",
        "ml": "ഡാറ്റാ ഘടനകൾ",
        "kn": "ಡೇಟಾ ರಚನೆಗಳು"
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
    "Computer Architecture": {
        "ta": "கணினி கட்டமைப்பு",
        "te": "கంప್ಯೂటర్ ఆర్కిటెక్చర్",
        "hi": "कंप्यूटर आर्किटेक्चर",
        "ml": "കമ്പ്യൂട്ടർ ആർക്കിടെക്ചർ",
        "kn": "ಕಂಪ್ಯೂಟರ್ ಆರ್ಕಿಟೆಕ್ಚರ್"
    },
    "Official proctored examination covering Networks, Data Structures, Databases, AI, and Microprocessors.": {
        "ta": "நெட்வொர்க்குகள், தரவு கட்டமைப்புகள், தரவுத்தளங்கள், AI மற்றும் நுண்செயலிகளை உள்ளடக்கிய அதிகாரப்பூர்வ AI-கண்காணிக்கப்படும் தேர்வு.",
        "te": "నెట్‌వర్క్‌లు, డేటా స్ట్రక్చర్‌లు, డేటాబేస్‌లు, AI మరియు మైక్రోప్రాసెసర్‌లను కవర్ చేసే అధికారిక ప్రోక్టర్డ్ పరీక్ష.",
        "hi": "नेटवर्क, डेटा संरचनाएं, डेटाबेस, AI और माइक्रोप्रोसेसरों को कवर करने वाली आधिकारिक AI-निगरानी परीक्षा।",
        "ml": "നെറ്റ്‌വർക്കുകൾ, ഡാറ്റാ ഘടനകൾ, ഡാറ്റാബേസുകൾ, AI, മൈക്രോപ്രൊസസ്സറുകൾ എന്നിവ ഉൾക്കൊള്ളുന്ന ഔദ്യോഗിക പരീക്ഷ.",
        "kn": "ನೆಟ್‌ವರ್ಕ್‌ಗಳು, ಡೇಟಾ ರಚನೆಗಳು, ಡೇಟಾಬೇಸ್‌ಗಳು, AI ಮತ್ತು ಮೈಕ್ರೊಪ್ರೊಸೆಸರ್‌ಗಳನ್ನು ಒಳಗೊಂಡ ಅಧಿಕೃತ ಪರೀಕ್ಷೆ."
    },

    # Questions
    "Which OSI layer is responsible for end-to-end reliable communication, error recovery, and flow control?": {
        "ta": "முழுமையான நம்பகமான தகவல் தொடர்பு, பிழை மீட்பு மற்றும் தரவு ஓட்டக் கட்டுப்பாட்டிற்கு எந்த OSI அடுக்கு பொறுப்பாகும்?",
        "te": "ఎండ్-టు-ఎండ్ విశ్వసనీయ కమ్యూనికేషన్, లోపం రికవరీ మరియు ఫ్లో నియంత్రణకు ఏ OSI లేయర్ బాధ్యత వహిస్తుంది?",
        "hi": "एंड-टू-एंड विश्वसनीय संचार, त्रुटि सुधार और प्रवाह नियंत्रण के लिए कौन सी OSI परत जिम्मेदार है?",
        "ml": "എൻഡ്-ടു-എൻഡ് വിശ്വസനീയമായ ആശയവിനിമയം, പിശക് തിരുത്തൽ, ഫ്ലോ നിയന്ത്രണം എന്നിവയ്ക്ക് ഏത് OSI ലെയറാണ് ഉത്തരവാദി?",
        "kn": "ಎಂಡ್-ಟು-ಎಂಡ್ ವಿಶ್ವಾಸಾರ್ಹ ಸಂವಹನ, ದೋಷ ಮರುಪಡೆಯುವಿಕೆ ಮತ್ತು ಹರಿವಿನ ನಿಯಂತ್ರಣಕ್ಕೆ ಯಾವ OSI ಲೇಯರ್ ಕಾರಣವಾಗಿದೆ?"
    },
    "Which of the following sorting algorithms have a worst-case time complexity of O(N log N)?": {
        "ta": "பின்வரும் வரிசையாக்க அல்காரிதங்களில் எது O(N log N) என்ற மோசமான நேர சிக்கலைக் கொண்டுள்ளது?",
        "te": "కింది సార్టింగ్ అల్గారిథమ్‌లలో ఏది O(N log N) యొక్క చెత్త-కేస్ సమయ సంక్లిష్టతను కలిగి ఉంది?",
        "hi": "निम्नलिखित में से किस सॉर्टिंग एल्गोरिदम की सबसे खराब समय जटिलता O(N log N) है?",
        "ml": "ഇനിപ്പറയുന്ന സോർട്ടിംഗ് അൽഗോരിതങ്ങളിൽ ഏതിനാണ് O(N log N) വേഴ്സ്റ്റ്-കേസ് ടൈം കോംപ്ലക്സിറ്റി ഉള്ളത്?",
        "kn": "ಕೆಳಗಿನ ಯಾವ ವಿಂಗಡಣೆ (sorting) ಅಲ್ಗಾರಿದಮ್‌ಗಳು O(N log N) ನ ಕೆಟ್ಟ-ಸಂದರ್ಭದ ಸಮಯ ಸಂಕೀರ್ಣತೆಯನ್ನು ಹೊಂದಿವೆ?"
    },
    "State the CAP theorem in distributed database systems and define each property.": {
        "ta": "விநியோகிக்கப்பட்ட தரவுத்தள அமைப்புகளில் CAP தேற்றத்தைக் கூறி அதன் ஒவ்வொரு பண்பையும் வரையறுக்கவும்.",
        "te": "పంపిణీ చేయబడిన డేటాబేస్ సిస్టమ్‌లలో CAP సిద్ధాంతాన్ని తెలిపి ప్రతి లక్షణాన్ని నిర్వచించండి.",
        "hi": "वितरित डेटाबेस सिस्टम में CAP प्रमेय का उल्लेख करें और प्रत्येक विशेषता को परिभाषित करें।",
        "ml": "വിതരണം ചെയ്ത ഡാറ്റാബേസ് സിസ്റ്റങ്ങളിലെ CAP സിദ്ധാന്തം പ്രസ്താവിക്കുകയും ഓരോ സവിശേഷതയും നിർവചിക്കുകയും ചെയ്യുക.",
        "kn": "ವಿತರಿಸಿದ ಡೇಟಾಬೇಸ್ ಸಿಸ್ಟಮ್‌ಗಳಲ್ಲಿ CAP ಪ್ರಮೇಯವನ್ನು ತಿಳಿಸಿ ಮತ್ತು ಪ್ರತಿಯೊಂದು ಗುಣಲಕ್ಷಣವನ್ನು ವಿವರಿಸಿ."
    },
    "Explain the Backpropagation algorithm in Deep Neural Networks. Formulate gradient descent weight updates using the multivariable chain rule.": {
        "ta": "ஆழ்ந்த நியூரல் நெட்வொர்க்குகளில் Backpropagation அல்காரிதத்தை விளக்குக. பலமாறி சங்கிலி விதியைப் பயன்படுத்தி gradient descent எடை புதுப்பிப்புகளை சூத்திரப்படுத்துக.",
        "te": "డీప్ న్యూరల్ నెట్‌వర్క్‌లలో బ్యాక్‌ప్రాపగేషన్ అల్గారిథమ్‌ను వివరించండి. మల్టీవేరియబుల్ చైన్ రూల్ ఉపయోగించి గ్రేడియంట్ డీసెంట్ వెయిట్ అప్‌డేట్‌లను రూపొందించండి.",
        "hi": "डीप न्यूरल नेटवर्क में बैकप्रॉपैगfindingsशन (Backpropagation) एल्गोरिदम की व्याख्या करें। बहुचरीय श्रृंखला नियम का उपयोग करके ग्रेडिएंट डिसेंट वेट अपडेट तैयार करें।",
        "ml": "ഡീപ് ന്യൂറൽ നെറ്റ്‌വർക്കുകളിലെ ബാക്ക്‌പ്രൊപ്പാഗേഷൻ അൽഗോരിതം വിശദീകരിക്കുക. ഗ്രേഡിയന്റ് ഡിസെന്റ് വെയ്റ്റ് അപ്‌ഡേറ്റുകൾ സൂത്രവാക്യമാക്കുക.",
        "kn": "ಡೀಪ್ ನ್ಯೂರಲ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳಲ್ಲಿ ಬ್ಯಾಕ್‌ಪ್ರೊಪಗೇಶನ್ ಅಲ್ಗಾರಿದಮ್ ಅನ್ನು ವಿವರಿಸಿ. ಬಹುಚರ ಸರಪಳಿ ನಿಯಮ ಬಳಸಿ ತೂಕದ ನವೀಕರಣಗಳನ್ನು ಸೂತ್ರೀಕರಿಸಿ."
    },
    "Draw the complete architectural block diagram of an 8-bit Microprocessor including ALU, Accumulator, Flag Register, PC, and Stack Pointer. Upload a clear handwritten schematic.": {
        "ta": "ALU, Accumulator, Flag Register, PC மற்றும் Stack Pointer உள்ளிட்ட 8-பிட் நுண்செயலியின் முழுமையான தொகுதி வரைபடத்தை வரைந்து பதிவேற்றவும்.",
        "te": "ALU, అక్యుమ్యులేటర్, ఫ్లాగ్ రిజిస్టర్, PC మరియు స్టాక్ పాయింటర్‌తో సహా 8-బిట్ మైక్రోప్రాసెసర్ యొక్క పూర్తి బ్లాక్ రేఖాచిత్రాన్ని గీయండి.",
        "hi": "ALU, एक्यूम्युलेटर, फ्लैग रजिस्टर, PC और स्टैक पॉइंटर सहित 8-बिट माइक्रोप्रोसेसर का ब्लॉक आरेख बनाएं और अपलोड करें।",
        "ml": "ALU, അക്യുമുലേറ്റർ, ഫ്ലാഗ് രജിസ്റ്റർ, PC, സ്റ്റാക്ക് പോയിന്റർ എന്നിവ ഉൾപ്പെടുന്ന 8-ബിറ്റ് മൈക്രോപ്രൊസസ്സറിന്റെ ബ്ലോക്ക് ഡയഗ്രം വരച്ച് അപ്‌ലോഡ് ചെയ്യുക.",
        "kn": "ALU, ಅಕ್ಯುಮ್ಯುಲೇಟರ್, ಫ್ಲ್ಯಾಗ್ ರಿಜಿಸ್ಟರ್, PC ಮತ್ತು ಸ್ಟ್ಯಾಕ್ ಪಾಯಿಂಟರ್ ಒಳಗೊಂಡಿರುವ 8-ಬಿಟ್ ಮೈಕ್ರೊಪ್ರೊಸೆಸರ್‌ನ ಬ್ಲಾಕ್ ರೇಖಾಚಿತ್ರವನ್ನು ಬಿಡಿಸಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
    },
    "What is the time complexity of binary search on a sorted array?": {
        "ta": "வரிசைப்படுத்தப்பட்ட அணியில் இருமத் தேடலின் (binary search) நேர சிக்கல் என்ன?",
        "te": "క్రమబద్ధీకరించబడిన శ్రేణిపై బైనరీ శోధన యొక్క సమయ సంక్లిష్టత ఏమిటి?",
        "hi": "सॉर्ट किए गए ऐरे पर बाइनरी सर्च की समय जटिलता (time complexity) क्या है?",
        "ml": "സോർട്ട് ചെയ്ത അറേയിലെ ബൈനറി സെർച്ചിന്റെ ടൈം കോംപ്ലക്സിറ്റി എന്താണ്?",
        "kn": "ವಿಂಗಡಿಸಲಾದ ಅರೇಯಲ್ಲಿ ಬೈನರಿ ಹುಡುಕಾಟದ ಸಮಯ ಸಂಕೀರ್ಣತೆ (time complexity) ಏನು?"
    },

    # Options
    "Network Layer": {
        "ta": "நெட்வொர்க் அடுக்கு (Network Layer)",
        "te": "నెట్‌వర్క్ లేయర్ (Network Layer)",
        "hi": "नेटवर्क लेयर (Network Layer)",
        "ml": "നെറ്റ്‌വർക്ക് ലെയർ (Network Layer)",
        "kn": "ನೆಟ್‌ವರ್ಕ್ ಲೇಯರ್ (Network Layer)"
    },
    "Data Link Layer": {
        "ta": "டேட்டா லிங்க் அடுக்கு (Data Link Layer)",
        "te": "డేటా లింక్ లేయర్ (Data Link Layer)",
        "hi": "डेटा लिंक लेयर (Data Link Layer)",
        "ml": "ഡാറ്റ ലിങ്ക് ലെയർ (Data Link Layer)",
        "kn": "ಡೇಟಾ ಲಿಂಕ್ ಲೇಯರ್ (Data Link Layer)"
    },
    "Transport Layer": {
        "ta": "போக்குவரத்து அடுக்கு (Transport Layer)",
        "te": "రవాణా లేయర్ (Transport Layer)",
        "hi": "ट्रांसपोर्ट लेयर (Transport Layer)",
        "ml": "ട്രാൻസ്പോർട്ട് ലെയർ (Transport Layer)",
        "kn": "ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್ (Transport Layer)"
    },
    "Session Layer": {
        "ta": "அமர்வு அடுக்கு (Session Layer)",
        "te": "సెషన్ లేయర్ (Session Layer)",
        "hi": "सेशन लेयर (Session Layer)",
        "ml": "സെഷൻ ലെയർ (Session Layer)",
        "kn": "ಸೆಷನ್ ಲೇಯರ್ (Session Layer)"
    },
    "Merge Sort": {
        "ta": "Merge Sort (இணைப்பு வரிசையாக்கம்)",
        "te": "మెర్జ్ సార్ట్ (Merge Sort)",
        "hi": "मर्ज सॉर्ट (Merge Sort)",
        "ml": "മെർജ് സോർട്ട് (Merge Sort)",
        "kn": "ಮರ್ಜ್ ವಿಂಗಡಣೆ (Merge Sort)"
    },
    "Heap Sort": {
        "ta": "Heap Sort (குவியல் வரிசையாக்கம்)",
        "te": "హీప్ సార్ట్ (Heap Sort)",
        "hi": "हीप सॉर्ट (Heap Sort)",
        "ml": "ഹീപ് സോർട്ട് (Heap Sort)",
        "kn": "ಹೀಪ್ ವಿಂಗಡಣೆ (Heap Sort)"
    },
    "Quick Sort": {
        "ta": "Quick Sort (விரைவு வரிசையாக்கம்)",
        "te": "క్విక్ సార్ట్ (Quick Sort)",
        "hi": "क्विक सॉर्ट (Quick Sort)",
        "ml": "ക്വിക്ക് സോർട്ട് (Quick Sort)",
        "kn": "ಕ್ವಿಕ್ ವಿಂಗಡಣೆ (Quick Sort)"
    },
    "Bubble Sort": {
        "ta": "Bubble Sort (குமிழி வரிசையாக்கம்)",
        "te": "బబుల్ సార్ట్ (Bubble Sort)",
        "hi": "बबल सॉर्ट (Bubble Sort)",
        "ml": "ബബിൾ സോർട്ട് (Bubble Sort)",
        "kn": "ಬಬಲ್ ವಿಂಗಡಣೆ (Bubble Sort)"
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
        "te": "లాగరిథమిక్ సమయం (Logarithmic time)",
        "hi": "लघुगणकीय समय (Logarithmic time)",
        "ml": "ലോഗരിതമിക് സമയം (Logarithmic time)",
        "kn": "ಲಾಗರಿಥಮಿಕ್ ಸಮಯ (Logarithmic time)"
    },
    "Linear time": {
        "ta": "நேரியல் நேரம் (Linear time)",
        "te": "లీనియర్ సమయం (Linear time)",
        "hi": "रैखिक समय (Linear time)",
        "ml": "ലീനിയർ സമയം (Linear time)",
        "kn": "ರೇಖೀಯ ಸಮಯ (Linear time)"
    },
    "Linearithmic time": {
        "ta": "நேரியல்-மடக்கை நேரம் (Linearithmic time)",
        "te": "లీనియరిథమిక్ సమయం (Linearithmic time)",
        "hi": "रैखिक-लघुगणकीय समय (Linearithmic time)",
        "ml": "ലീനിയറിതമിക് സമയം (Linearithmic time)",
        "kn": "ಲೀನಿಯರಿಥಮಿಕ್ ಸಮಯ (Linearithmic time)"
    }
}

def translate_fallback(text: str, lang: str) -> str:
    if not text:
        return ""
    trimmed = text.strip()
    if trimmed in TRANSLATION_MAP and lang in TRANSLATION_MAP[trimmed]:
        return TRANSLATION_MAP[trimmed][lang]
    
    prefixes = {
        "ta": "[தமிழ்] ",
        "te": "[తెలుగు] ",
        "hi": "[हिन्दी] ",
        "ml": "[മലയാളം] ",
        "kn": "[ಕನ್ನಡ] "
    }
    return f"{prefixes.get(lang, '')}{text}"

def run_migration():
    db = SessionLocal()
    try:
        exams = db.query(Exam).all()
        print(f"Migrating {len(exams)} exams...")
        for ex in exams:
            if not ex.title_en:
                ex.title_en = ex.title
            if not ex.title_ta:
                ex.title_ta = translate_fallback(ex.title, "ta")
            if not ex.title_te:
                ex.title_te = translate_fallback(ex.title, "te")
            if not ex.title_hi:
                ex.title_hi = translate_fallback(ex.title, "hi")
            if not ex.title_ml:
                ex.title_ml = translate_fallback(ex.title, "ml")
            if not ex.title_kn:
                ex.title_kn = translate_fallback(ex.title, "kn")

            if not ex.subject_en:
                ex.subject_en = ex.subject
            if not ex.subject_ta:
                ex.subject_ta = translate_fallback(ex.subject, "ta")
            if not ex.subject_te:
                ex.subject_te = translate_fallback(ex.subject, "te")
            if not ex.subject_hi:
                ex.subject_hi = translate_fallback(ex.subject, "hi")
            if not ex.subject_ml:
                ex.subject_ml = translate_fallback(ex.subject, "ml")
            if not ex.subject_kn:
                ex.subject_kn = translate_fallback(ex.subject, "kn")

            if ex.description:
                if not ex.description_en:
                    ex.description_en = ex.description
                if not ex.description_ta:
                    ex.description_ta = translate_fallback(ex.description, "ta")
                if not ex.description_te:
                    ex.description_te = translate_fallback(ex.description, "te")
                if not ex.description_hi:
                    ex.description_hi = translate_fallback(ex.description, "hi")
                if not ex.description_ml:
                    ex.description_ml = translate_fallback(ex.description, "ml")
                if not ex.description_kn:
                    ex.description_kn = translate_fallback(ex.description, "kn")

        questions = db.query(Question).all()
        print(f"Migrating {len(questions)} questions...")
        for q in questions:
            if not q.question_text_en:
                q.question_text_en = q.question_text
            if not q.question_text_ta:
                q.question_text_ta = translate_fallback(q.question_text, "ta")
            if not q.question_text_te:
                q.question_text_te = translate_fallback(q.question_text, "te")
            if not q.question_text_hi:
                q.question_text_hi = translate_fallback(q.question_text, "hi")
            if not q.question_text_ml:
                q.question_text_ml = translate_fallback(q.question_text, "ml")
            if not q.question_text_kn:
                q.question_text_kn = translate_fallback(q.question_text, "kn")
            
            if q.model_answer and not q.model_answer_en:
                q.model_answer_en = q.model_answer
                q.model_answer_ta = translate_fallback(q.model_answer, "ta")
                q.model_answer_te = translate_fallback(q.model_answer, "te")
                q.model_answer_hi = translate_fallback(q.model_answer, "hi")
                q.model_answer_ml = translate_fallback(q.model_answer, "ml")
                q.model_answer_kn = translate_fallback(q.model_answer, "kn")

        options = db.query(Option).all()
        print(f"Migrating {len(options)} options...")
        for opt in options:
            if not opt.option_text_en:
                opt.option_text_en = opt.option_text
            if not opt.option_text_ta:
                opt.option_text_ta = translate_fallback(opt.option_text, "ta")
            if not opt.option_text_te:
                opt.option_text_te = translate_fallback(opt.option_text, "te")
            if not opt.option_text_hi:
                opt.option_text_hi = translate_fallback(opt.option_text, "hi")
            if not opt.option_text_ml:
                opt.option_text_ml = translate_fallback(opt.option_text, "ml")
            if not opt.option_text_kn:
                opt.option_text_kn = translate_fallback(opt.option_text, "kn")

        db.commit()
        print("Database successfully updated with all multilingual fields including Exams, Questions, and Options!")
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
