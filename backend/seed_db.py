import os
import sys
from datetime import datetime, timezone, timedelta
import bcrypt

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models import (
    User, Question, Option, Exam, ExamQuestion, 
    ExamSession, Answer, Result, ProctorEvent
)
from app.enums.enums import (
    UserRole, ApprovalStatus, QuestionType, 
    DifficultyLevel, ExamStatus, SessionStatus, ProctorEventType
)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def seed_database():
    """
    Seeds initial development data for the AI-Based Examination Platform.
    Includes Admin, Approved/Pending/Rejected Examiners, Students, Questions, Exams, Sessions, and Telemetry.
    """
    # Create tables if not existing
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Checking existing records...")
        existing_admin = db.query(User).filter(User.email == "admin@examai.edu").first()
        if existing_admin:
            print("Database already contains seed data.")
            return

        print("Seeding users, examiners, and candidates...")
        # 1. Admin User
        admin = User(
            name="Institutional Admin",
            email="admin@examai.edu",
            password_hash=hash_password("Admin@123"),
            role=UserRole.ADMIN,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(admin)
        db.flush()

        # 2. Approved Examiner
        approved_examiner = User(
            name="Prof. Alan Turing",
            email="examiner@examai.edu",
            password_hash=hash_password("Examiner@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.APPROVED,
            approved_by=admin.id,
            approved_at=datetime.now(timezone.utc),
            is_active=True
        )
        db.add(approved_examiner)

        # 3. Pending Examiner (Awaiting Admin Approval)
        pending_examiner = User(
            name="Dr. Ada Lovelace",
            email="pending.examiner@examai.edu",
            password_hash=hash_password("Examiner@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.PENDING,
            is_active=True
        )
        db.add(pending_examiner)

        # 4. Rejected Examiner
        rejected_examiner = User(
            name="Dr. John Doe",
            email="rejected.examiner@examai.edu",
            password_hash=hash_password("Examiner@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.REJECTED,
            approved_by=admin.id,
            approved_at=datetime.now(timezone.utc),
            rejection_reason="Incomplete faculty accreditation and department verification.",
            is_active=True
        )
        db.add(rejected_examiner)

        # 5. Student
        student = User(
            name="Elena Rostova",
            email="student@examai.edu",
            password_hash=hash_password("Student@123"),
            role=UserRole.STUDENT,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(student)
        db.flush()

        print("Seeding question bank items across all 5 question types...")
        # Question 1: MCQ
        q1 = Question(
            subject="Computer Networks",
            question_text="Which OSI layer is responsible for end-to-end reliable communication, error recovery, and flow control?",
            question_text_en="Which OSI layer is responsible for end-to-end reliable communication, error recovery, and flow control?",
            question_text_ta="முழுமையான நம்பகமான தகவல் தொடர்பு, பிழை மீட்பு மற்றும் தரவு ஓட்டக் கட்டுப்பாட்டிற்கு எந்த OSI அடுக்கு பொறுப்பாகும்?",
            question_text_te="ఎండ్-టు-ఎండ్ విశ్వసనీయ కమ్యూనికేషన్, లోపం రికవరీ మరియు ఫ్లో నియంత్రణకు ఏ OSI లేయర్ బాధ్యత వహిస్తుంది?",
            question_text_hi="एंड-टू-एंड विश्वसनीय संचार, त्रुटि सुधार और प्रवाह नियंत्रण के लिए कौन सी OSI परत जिम्मेदार है?",
            question_text_ml="എൻഡ്-ടു-എൻഡ് വിശ്വസനീയമായ ആശയവിനിമയം, പിശക് തിരുത്തൽ, ഫ്ലോ നിയന്ത്രണം എന്നിവയ്ക്ക് ഏത് OSI ലെയറാണ് ഉത്തരവാദി?",
            question_text_kn="ಎಂಡ್-ಟು-ಎಂಡ್ ವಿಶ್ವಾಸಾರ್ಹ ಸಂವಹನ, ದೋಷ ಮರುಪಡೆಯುವಿಕೆ ಮತ್ತು ಹರಿವಿನ ನಿಯಂತ್ರಣಕ್ಕೆ ಯಾವ OSI ಲೇಯರ್ ಕಾರಣವಾಗಿದೆ?",
            question_type=QuestionType.MCQ,
            difficulty=DifficultyLevel.MEDIUM,
            expected_answer="Transport Layer",
            model_answer="Transport layer (Layer 4) provides transparent transfer of data between end users.",
            model_answer_en="Transport layer (Layer 4) provides transparent transfer of data between end users.",
            model_answer_ta="போக்குவரத்து அடுக்கு (அடுக்கு 4) பயனர்களுக்கு இடையே வெளிப்படையான தரவு பரிமாற்றத்தை வழங்குகிறது.",
            model_answer_te="రవాణా లేయర్ (లేయర్ 4) తుది వినియోగదారుల మధ్య పారదర్శక డేటా బదిలీని అందిస్తుంది.",
            model_answer_hi="ट्रांसपोर्ट लेयर (लेयर 4) एंड यूजर्स के बीच पारदर्शी डेटा ट्रांसफर प्रदान करता है।",
            model_answer_ml="ട്രാൻസ്പോർട്ട് ലെയർ (ലെയർ 4) എൻഡ് യൂസേഴ്സിന് സുതാര്യമായ ഡാറ്റ കൈമാറ്റം നൽകുന്നു.",
            model_answer_kn="ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್ (ಲೇಯರ್ 4) ಅಂತಿಮ ಬಳಕೆದಾರರ ನಡುವೆ ಪಾರದರ್ಶಕ ಡೇಟಾ ವರ್ಗಾವಣೆಯನ್ನು ಒದಗಿಸುತ್ತದೆ.",
            explanation_en="Layer 4 (Transport Layer) ensures reliable end-to-end transmission using protocols like TCP.",
            explanation_ta="அடுக்கு 4 (போக்குவரத்து அடுக்கு) TCP போன்ற நெறிமுறைகளைப் பயன்படுத்தி நம்பகமான பரிமாற்றத்தை உறுதி செய்கிறது.",
            explanation_te="లేయర్ 4 (రవాణా లేయర్) TCP వంటి ప్రోటోకాల్‌లను ఉపయోగించి నమ్మకమైన ప్రసారాన్ని నిర్ధారిస్తుంది.",
            explanation_hi="लेयर 4 (ट्रांसपोर्ट लेयर) TCP जैसे प्रोटोकॉल का उपयोग करके विश्वसनीय संचरण सुनिश्चित करता है।",
            explanation_ml="ലെയർ 4 (ട്രാൻസ്പോർട്ട് ലെയർ) ടിസിപി പോലുള്ള പ്രോട്ടോക്കോളുകൾ ഉപയോഗിച്ച് വിശ്വസനീയമായ പ്രക്ഷേപണം ഉറപ്പാക്കുന്നു.",
            explanation_kn="ಲೇಯರ್ 4 (ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್) TCP ನಂತಹ ಪ್ರೋಟೋಕಾಲ್‌ಗಳನ್ನು ಬಳಸಿಕೊಂಡು ವಿಶ್ವಾಸಾರ್ಹ ಪ್ರಸರಣವನ್ನು ಖಚಿತಪಡಿಸುತ್ತದೆ.",
            max_marks=2.0,
            negative_marks=0.5,
            created_by=approved_examiner.id
        )
        db.add(q1)
        db.flush()

        db.add_all([
            Option(
                question_id=q1.id, 
                option_text="Network Layer",
                option_text_en="Network Layer",
                option_text_ta="நெட்வொர்க் அடுக்கு",
                option_text_te="నెట్‌వర్క్ లేయర్",
                option_text_hi="नेटवर्क लेयर",
                option_text_ml="നെറ്റ്‌വർക്ക് ലെയർ",
                option_text_kn="ನೆಟ್‌ವರ್ಕ್ ಲೇಯರ್",
                is_correct=False
            ),
            Option(
                question_id=q1.id, 
                option_text="Data Link Layer",
                option_text_en="Data Link Layer",
                option_text_ta="டேட்டா லிங்க் அடுக்கு",
                option_text_te="డేటా లింక్ లేయర్",
                option_text_hi="डेटा लिंक लेयर",
                option_text_ml="ഡാറ്റ ലിങ്ക് ലെയർ",
                option_text_kn="ಡೇಟಾ ಲಿಂಕ್ ಲೇಯರ್",
                is_correct=False
            ),
            Option(
                question_id=q1.id, 
                option_text="Transport Layer",
                option_text_en="Transport Layer",
                option_text_ta="போக்குவரத்து அடுக்கு",
                option_text_te="రవాణా లేయర్ (ట్రాన్స్‌పోర్ట్)",
                option_text_hi="ट्रांसपोर्ट लेयर",
                option_text_ml="ട്രാൻസ്പോർട്ട് ലെയർ",
                option_text_kn="ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್",
                is_correct=True
            ),
            Option(
                question_id=q1.id, 
                option_text="Session Layer",
                option_text_en="Session Layer",
                option_text_ta="அமர்வு அடுக்கு",
                option_text_te="సెషన్ లేయర్",
                option_text_hi="सेशन लेयर",
                option_text_ml="സെഷൻ ലെയർ",
                option_text_kn="ಸೆಷನ್ ಲೇಯರ್",
                is_correct=False
            ),
        ])

        # Question 2: Multi-Select
        q2 = Question(
            subject="Data Structures",
            question_text="Which of the following sorting algorithms have a worst-case time complexity of O(N log N)?",
            question_text_en="Which of the following sorting algorithms have a worst-case time complexity of O(N log N)?",
            question_text_ta="பின்வரும் வரிசையாக்க அல்காரிதங்களில் எது O(N log N) என்ற மோசமான நேர சிக்கலைக் கொண்டுள்ளது?",
            question_text_te="కింది సార్టింగ్ అల్గారిథమ్‌లలో ఏది O(N log N) యొక్క చెత్త-కేస్ సమయ సంక్లిష్టతను కలిగి ఉంది?",
            question_text_hi="निम्नलिखित में से किस सॉर्टिंग एल्गोरिदम की सबसे खराब समय जटिलता O(N log N) है?",
            question_text_ml="ഇനിപ്പറയുന്ന സോർട്ടിംഗ് അൽഗോരിതങ്ങളിൽ ഏതിനാണ് O(N log N) വേഴ്സ്റ്റ്-കേസ് ടൈം കോംപ്ലക്സിറ്റി ഉള്ളത്?",
            question_text_kn="ಕೆಳಗಿನ ಯಾವ ವಿಂಗಡಣೆ (sorting) ಅಲ್ಗಾರಿದಮ್‌ಗಳು O(N log N) ನ ಕೆಟ್ಟ-ಸಂದರ್ಭದ ಸಮಯ ಸಂಕೀರ್ಣತೆಯನ್ನು ಹೊಂದಿವೆ?",
            question_type=QuestionType.MULTI_SELECT,
            difficulty=DifficultyLevel.MEDIUM,
            expected_answer="Merge Sort and Heap Sort",
            model_answer="Merge Sort and Heap Sort maintain O(N log N) worst-case time complexity.",
            model_answer_en="Merge Sort and Heap Sort maintain O(N log N) worst-case time complexity.",
            model_answer_ta="Merge Sort மற்றும் Heap Sort ஆகியவை O(N log N) மோசமான நேர சிக்கலைப் பராமரிக்கின்றன.",
            model_answer_te="మెర్జ్ సార్ట్ మరియు హీప్ సార్ట్ O(N log N) వర్స్ట్-కేస్ టైమ్ కాంప్లెక్సిటీని కలిగి ఉంటాయి.",
            model_answer_hi="मर्ज सॉर्ट और हीप सॉर्ट O(N log N) सबसे खराब स्थिति समय जटिलता बनाए रखते हैं।",
            model_answer_ml="മെർജ് സോർട്ടും ഹീപ് സോർട്ടും O(N log N) വേഴ്സ്റ്റ്-കേസ് ടൈം കോംപ്ലക്സിറ്റി നിലനിർത്തുന്നു.",
            model_answer_kn="ಮರ್ಜ್ ವಿಂಗಡಣೆ ಮತ್ತು ಹೀಪ್ ವಿಂಗಡಣೆಯು O(N log N) ಕೆಟ್ಟ ಸಂದರ್ಭದ ಸಮಯದ ಸಂಕೀರ್ಣತೆಯನ್ನು ನಿರ್ವಹಿಸುತ್ತವೆ.",
            max_marks=3.0,
            negative_marks=0.5,
            created_by=approved_examiner.id
        )
        db.add(q2)
        db.flush()

        db.add_all([
            Option(
                question_id=q2.id, 
                option_text="Merge Sort",
                option_text_en="Merge Sort",
                option_text_ta="Merge Sort (இணைப்பு வரிசையாக்கம்)",
                option_text_te="మెర్జ్ సార్ట్ (Merge Sort)",
                option_text_hi="मर्ज सॉर्ट (Merge Sort)",
                option_text_ml="മെർജ് സോർട്ട് (Merge Sort)",
                option_text_kn="ಮರ್ಜ್ ವಿಂಗಡಣೆ (Merge Sort)",
                is_correct=True
            ),
            Option(
                question_id=q2.id, 
                option_text="Heap Sort",
                option_text_en="Heap Sort",
                option_text_ta="Heap Sort (குவியல் வரிசையாக்கம்)",
                option_text_te="హీప్ సార్ట్ (Heap Sort)",
                option_text_hi="हीप सॉर्ट (Heap Sort)",
                option_text_ml="ഹീപ് സോർട്ട് (Heap Sort)",
                option_text_kn="ಹೀಪ್ ವಿಂಗಡಣೆ (Heap Sort)",
                is_correct=True
            ),
            Option(
                question_id=q2.id, 
                option_text="Quick Sort",
                option_text_en="Quick Sort",
                option_text_ta="Quick Sort (விரைவு வரிசையாக்கம்)",
                option_text_te="క్విక్ సార్ట్ (Quick Sort)",
                option_text_hi="क्विक सॉर्ट (Quick Sort)",
                option_text_ml="ക്വിക്ക് സോർട്ട് (Quick Sort)",
                option_text_kn="ಕ್ವಿಕ್ ವಿಂಗಡಣೆ (Quick Sort)",
                is_correct=False
            ),
            Option(
                question_id=q2.id, 
                option_text="Bubble Sort",
                option_text_en="Bubble Sort",
                option_text_ta="Bubble Sort (குமிழி வரிசையாக்கம்)",
                option_text_te="బబుల్ సార్ట్ (Bubble Sort)",
                option_text_hi="बबल सॉर्ट (Bubble Sort)",
                option_text_ml="ബബിൾ സോർട്ട് (Bubble Sort)",
                option_text_kn="ಬಬಲ್ ವಿಂಗಡಣೆ (Bubble Sort)",
                is_correct=False
            ),
        ])

        # Question 3: Short Answer
        q3 = Question(
            subject="Database Management Systems",
            question_text="State the CAP theorem in distributed database systems and define each property.",
            question_text_en="State the CAP theorem in distributed database systems and define each property.",
            question_text_ta="விநியோகிக்கப்பட்ட தரவுத்தள அமைப்புகளில் CAP தேற்றத்தைக் கூறி அதன் ஒவ்வொரு பண்பையும் வரையறுக்கவும்.",
            question_text_te="పంపిణీ చేయబడిన డేటాబేస్ సిస్టమ్‌లలో CAP సిద్ధాంతాన్ని తెలిపి ప్రతి లక్షణాన్ని నిర్వచించండి.",
            question_text_hi="वितरित डेटाबेस सिस्टम में CAP प्रमेय का उल्लेख करें और प्रत्येक विशेषता को परिभाषित करें।",
            question_text_ml="വിതരണം ചെയ്ത ഡാറ്റാബേസ് സിസ്റ്റങ്ങളിലെ CAP സിദ്ധാന്തം പ്രസ്താവിക്കുകയും ഓരോ സവിശേഷതയും നിർവചിക്കുകയും ചെയ്യുക.",
            question_text_kn="ವಿತರಿಸಿದ ಡೇಟಾಬೇಸ್ ಸಿಸ್ಟಮ್‌ಗಳಲ್ಲಿ CAP ಪ್ರಮೇಯವನ್ನು ತಿಳಿಸಿ ಮತ್ತು ಪ್ರತಿಯೊಂದು ಗುಣಲಕ್ಷಣವನ್ನು ವಿವರಿಸಿ.",
            question_type=QuestionType.SHORT_ANSWER,
            difficulty=DifficultyLevel.EASY,
            expected_answer="Consistency, Availability, Partition Tolerance",
            model_answer="The CAP theorem states that a distributed system cannot simultaneously provide more than two out of Consistency, Availability, and Partition Tolerance.",
            model_answer_en="The CAP theorem states that a distributed system cannot simultaneously provide more than two out of Consistency, Availability, and Partition Tolerance.",
            model_answer_ta="CAP தேற்றத்தின்படி, விநியோகிக்கப்பட்ட அமைப்பால் நிலைத்தன்மை (Consistency), கிடைக்கும் தன்மை (Availability), மற்றும் பகிர்வு சகிப்புத்தன்மை (Partition Tolerance) ஆகியவற்றில் இரண்டை மட்டுமே ஒரே நேரத்தில் வழங்க முடியும்.",
            model_answer_te="CAP సిద్ధాంతం ప్రకారం, పంపిణీ చేయబడిన సిస్టమ్ ఏకకాలంలో స్థిరత్వం, లభ్యత మరియు విభజన సహనం లలో రెండింటిని మాత్రమే అందించగలదు.",
            model_answer_hi="CAP प्रमेय बताता है कि एक वितरित प्रणाली एक साथ संगति (Consistency), उपलब्धता (Availability) और विभाजन सहिष्णुता (Partition Tolerance) में से दो से अधिक प्रदान नहीं कर सकती है।",
            model_answer_ml="സ്ഥിരത (Consistency), ലഭ്യത (Availability), പാർട്ടീഷൻ ടോളറൻസ് (Partition Tolerance) എന്നിവയിൽ രണ്ടിൽ കൂടുതൽ ഒരേസമയം നൽകാൻ വിതരണം ചെയ്ത സിസ്റ്റത്തിന് കഴിയില്ലെന്ന് CAP സിദ്ധാന്തം പറയുന്നു.",
            model_answer_kn="CAP ಪ್ರಮೇಯವು ವಿತರಿಸಿದ ಸಿಸ್ಟಮ್ ಏಕಕಾಲದಲ್ಲಿ ಸ್ಥಿರತೆ, ಲಭ್ಯತೆ ಮತ್ತು ವಿಭಜನಾ ಸಹಿಷ್ಣುತೆ ಇವುಗಳಲ್ಲಿ ಎರಡಕ್ಕಿಂತ ಹೆಚ್ಚಿನದನ್ನು ಒದಗಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ ಎಂದು ಹೇಳುತ್ತದೆ.",
            max_marks=5.0,
            negative_marks=0.0,
            created_by=approved_examiner.id
        )
        db.add(q3)

        # Question 4: Long Answer
        q4 = Question(
            subject="Artificial Intelligence",
            question_text="Explain the Backpropagation algorithm in Deep Neural Networks. Formulate gradient descent weight updates using the multivariable chain rule.",
            question_text_en="Explain the Backpropagation algorithm in Deep Neural Networks. Formulate gradient descent weight updates using the multivariable chain rule.",
            question_text_ta="ஆழ்ந்த நியூரல் நெட்வொர்க்குகளில் Backpropagation அல்காரிதத்தை விளக்குக. பலமாறி சங்கிலி விதியைப் பயன்படுத்தி gradient descent எடை புதுப்பிப்புகளை சூத்திரப்படுத்துக.",
            question_text_te="డీప్ న్యూరల్ నెట్‌వర్క్‌లలో బ్యాక్‌ప్రాపగేషన్ అల్గారిథమ్‌ను వివరించండి. మల్టీవేరియబుల్ చైన్ రూల్ ఉపయోగించి గ్రేడియంట్ డీసెంట్ వెయిట్ అప్‌డేట్‌లను రూపొందించండి.",
            question_text_hi="डीप न्यूरल नेटवर्क में बैकप्रॉपैगfindingsशन (Backpropagation) एल्गोरिदम की व्याख्या करें। बहुचरीय श्रृंखला नियम का उपयोग करके ग्रेडिएंट डिसेंट वेट अपडेट तैयार करें।",
            question_text_ml="ഡീപ് ന്യൂറൽ നെറ്റ്‌വർക്കുകളിലെ ബാക്ക്‌പ്രൊപ്പാഗേഷൻ അൽഗോരിതം വിശദീകരിക്കുക. ഗ്രേഡിയന്റ് ഡിസെന്റ് വെയ്റ്റ് അപ്‌ഡേറ്റുകൾ സൂത്രവാക്യമാക്കുക.",
            question_text_kn="ಡೀಪ್ ನ್ಯೂರಲ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳಲ್ಲಿ ಬ್ಯಾಕ್‌ಪ್ರೊಪಗೇಶನ್ ಅಲ್ಗಾರಿದಮ್ ಅನ್ನು ವಿವರಿಸಿ. ಬಹುಚರ ಸರಪಳಿ ನಿಯಮ ಬಳಸಿ ತೂಕದ ನವೀಕರಣಗಳನ್ನು ಸೂತ್ರೀಕರಿಸಿ.",
            question_type=QuestionType.LONG_ANSWER,
            difficulty=DifficultyLevel.HARD,
            expected_answer="Detailed mathematical derivation of forward pass, loss calculation, backward pass error deltas, and weight matrix updates.",
            model_answer="Comprehensive explanation of error propagation across multi-layer perceptrons with learning rate hyperparameter optimization.",
            max_marks=10.0,
            negative_marks=0.0,
            created_by=approved_examiner.id
        )
        db.add(q4)

        # Question 5: Image Upload
        q5 = Question(
            subject="Computer Architecture",
            question_text="Draw the complete architectural block diagram of an 8-bit Microprocessor including ALU, Accumulator, Flag Register, PC, and Stack Pointer. Upload a clear handwritten schematic.",
            question_text_en="Draw the complete architectural block diagram of an 8-bit Microprocessor including ALU, Accumulator, Flag Register, PC, and Stack Pointer. Upload a clear handwritten schematic.",
            question_text_ta="ALU, Accumulator, Flag Register, PC மற்றும் Stack Pointer உள்ளிட்ட 8-பிட் நுண்செயலியின் முழுமையான தொகுதி வரைபடத்தை வரைந்து பதிவேற்றவும்.",
            question_text_te="ALU, అక్యుమ్యులేటర్, ఫ్లాగ్ రిజిస్టర్, PC మరియు స్టాక్ పాయింటర్‌తో సహా 8-బిట్ మైక్రోప్రాసెసర్ యొక్క పూర్తి బ్లాక్ రేఖాచిత్రాన్ని గీయండి.",
            question_text_hi="ALU, एक्यूम्युलेटर, फ्लैग रजिस्टर, PC और स्टैक पॉइंटर सहित 8-बिट माइक्रोप्रोसेसर का ब्लॉक आरेख बनाएं और अपलोड करें।",
            question_text_ml="ALU, അക്യുമുലേറ്റർ, ഫ്ലാഗ് രജിസ്റ്റർ, PC, സ്റ്റാക്ക് പോയിന്റർ എന്നിവ ഉൾപ്പെടുന്ന 8-ബിറ്റ് മൈക്രോപ്രൊസസ്സറിന്റെ ബ്ലോക്ക് ഡയഗ്രം വരച്ച് അപ്‌ലോഡ് ചെയ്യുക.",
            question_text_kn="ALU, ಅಕ್ಯುಮ್ಯುಲೇಟರ್, ಫ್ಲ್ಯಾಗ್ ರಿಜಿಸ್ಟರ್, PC ಮತ್ತು ಸ್ಟ್ಯಾಕ್ ಪಾಯಿಂಟರ್ ಒಳಗೊಂಡಿರುವ 8-ಬಿಟ್ ಮೈಕ್ರೊಪ್ರೊಸೆಸರ್‌ನ ಬ್ಲಾಕ್ ರೇಖಾಚಿತ್ರವನ್ನು ಬಿಡಿಸಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
            question_type=QuestionType.IMAGE_UPLOAD,
            difficulty=DifficultyLevel.HARD,
            expected_answer="Schematic showing internal bus lines, ALU, register array, timing and control logic.",
            model_answer="Properly labeled diagram illustrating data bus interconnects, address bus latching, and control bus signals.",
            max_marks=15.0,
            negative_marks=0.0,
            created_by=approved_examiner.id
        )
        db.add(q5)
        db.flush()

        print("Seeding sample exam and junction associations...")
        exam = Exam(
            title="Computer Science Comprehensive Midterm 2026",
            subject="Computer Science & Engineering",
            description="Official proctored examination covering Networks, Data Structures, Databases, AI, and Microprocessors.",
            duration_minutes=90,
            total_questions=5,
            randomization_enabled=True,
            negative_marking_enabled=True,
            default_negative_marks=0.5,
            proctoring_enabled=True,
            webcam_monitoring_enabled=True,
            gaze_tracking_enabled=True,
            gaze_sensitivity_threshold=0.75,
            max_tab_switch_warnings=3,
            status=ExamStatus.PUBLISHED,
            created_by=approved_examiner.id,
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(exam)
        db.flush()

        # Link questions to exam via exam_questions
        for order, q in enumerate([q1, q2, q3, q4, q5], start=1):
            db.add(ExamQuestion(
                exam_id=exam.id,
                question_id=q.id,
                question_order=order,
                marks=q.max_marks
            ))
        db.flush()

        print("Seeding exam session, candidate answers, and proctoring telemetry...")
        session = ExamSession(
            exam_id=exam.id,
            student_id=student.id,
            session_token="SESSION-TOKEN-AI-2026-CS001",
            started_at=datetime.now(timezone.utc) - timedelta(minutes=45),
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            status=SessionStatus.SUBMITTED
        )
        db.add(session)
        db.flush()

        # Answers
        db.add(Answer(
            session_id=session.id,
            question_id=q1.id,
            selected_option_ids=[3],
            marks_awarded=2.0
        ))
        db.add(Answer(
            session_id=session.id,
            question_id=q3.id,
            text_answer="CAP theorem specifies Consistency, Availability, and Partition tolerance trade-offs.",
            marks_awarded=5.0
        ))

        # Results
        db.add(Result(
            exam_id=exam.id,
            student_id=student.id,
            total_marks=35.0,
            obtained_marks=32.0,
            percentage=91.4,
            is_approved=True,
            approved_by=examiner.id,
            approved_at=datetime.now(timezone.utc),
            approval_notes="Faculty audited and released scorecard."
        ))

        # Proctor Events
        db.add_all([
            ProctorEvent(
                session_id=session.id,
                event_type=ProctorEventType.WINDOW_FOCUS,
                event_data={"window": "ExamPortal", "fullscreen": True},
                suspicion_score=0.0
            ),
            ProctorEvent(
                session_id=session.id,
                event_type=ProctorEventType.TAB_SWITCH,
                event_data={"switched_to": "ExternalApplication", "duration_ms": 1200},
                suspicion_score=0.45
            ),
            ProctorEvent(
                session_id=session.id,
                event_type=ProctorEventType.GAZE_AWAY,
                event_data={"direction": "BOTTOM_LEFT", "duration_sec": 3.2},
                suspicion_score=0.60
            )
        ])

        db.commit()
        print("Database successfully seeded with all 9 models and test records!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
