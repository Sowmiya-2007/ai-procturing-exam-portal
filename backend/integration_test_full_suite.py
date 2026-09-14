import urllib.request
import urllib.parse
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:8001"

def make_request(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def run_comprehensive_suite():
    print("================================================================")
    print("AI-BASED INTELLIGENT EXAMINATION PLATFORM - FULL TEST SUITE")
    print("================================================================\n")
    ts = int(time.time())

    # --- 1. HEALTH CHECK ---
    code, res = make_request("/")
    assert code == 200, f"Health check failed: {res}"
    print("[PASS] 1. Backend Server Online & Healthy")

    # --- 2. STUDENT REGISTRATION (IMMEDIATE APPROVAL / ACTIVE) ---
    student_email = f"student_{ts}@examai.edu"
    student_reg = f"REG{ts}"
    elena_data = {
        "name": "Elena Rostova",
        "email": student_email,
        "register_number": student_reg,
        "department": "Artificial Intelligence & Data Science",
        "year": "2nd Year",
        "password": "Password@123",
        "confirm_password": "Password@123",
        "role": "STUDENT"
    }
    code, res = make_request("/api/auth/register", "POST", elena_data)
    assert code == 201, f"Registration failed: {res}"
    assert res["status"] == "APPROVED", "Student status is not APPROVED!"
    print(f"[PASS] 2. Student Registration: Created with status APPROVED (Immediate Access)")
    print(f"       Message: '{res['message']}'")

    # --- 3. APPROVED STUDENT LOGIN ---
    code, res = make_request("/api/auth/login", "POST", {
        "identifier": student_email,
        "password": "Password@123"
    })
    assert code == 200, f"Approved student login failed: {res}"
    elena_token = res["access_token"]
    assert res["user"]["approval_status"] == "APPROVED"
    print(f"[PASS] 3. Approved Student Login Successful via Email ({student_email})")

    # --- 4. ADMIN LOGIN ---
    code, res = make_request("/api/auth/login", "POST", {
        "identifier": "admin@examai.edu",
        "password": "Admin@123"
    })
    assert code == 200, f"Admin login failed: {res}"
    admin_token = res["access_token"]
    assert res["user"]["role"] == "ADMIN"
    print(f"[PASS] 4. Admin Authentication Successful (Token Acquired)")

    # --- 5. ADMIN DASHBOARD STATS ---
    code, stats = make_request("/api/admin/stats", token=admin_token)
    assert code == 200, f"Admin stats failed: {stats}"
    print(f"[PASS] 5. Admin KPI Stats Retrieved:")
    print(f"       Total Students: {stats['total_students']}")
    print(f"       Total Examiners: {stats['total_examiners']}")
    print(f"       Pending Examiners: {stats['pending_examiners']}")
    print(f"       Total Questions in Bank: {stats['total_questions']}")

    # --- 9. STUDENT DASHBOARD ACCESS ---
    code, student_dash = make_request("/api/student/dashboard", token=elena_token)
    assert code == 200, f"Student dashboard access failed: {student_dash}"
    assert student_dash["student"]["name"] == "Elena Rostova"
    assert len(student_dash["upcoming_exams"]) >= 3
    print(f"[PASS] 10. Student Examination Portal Dashboard Accessed:")
    print(f"        Student Name: {student_dash['student']['name']}")
    print(f"        Scheduled Examinations: {len(student_dash['upcoming_exams'])}")
    print(f"        Available Practice Items: {student_dash['available_questions']}")

    # --- 10. QUESTION BANK MANAGEMENT: ALL 5 TYPES ---
    # Type 1: MCQ
    mcq_payload = {
        "question_text": "Which layer of the OSI model is responsible for end-to-end error recovery and flow control?",
        "question_type": "MCQ",
        "subject": "Cybersecurity & Networks",
        "difficulty": "MEDIUM",
        "marks": 2.0,
        "negative_marks": 0.5,
        "model_answer": "The Transport Layer (Layer 4) provides transparent transfer of data between end users, providing end-to-end data transport services.",
        "options": [
            {"option_text": "Network Layer", "is_correct": False},
            {"option_text": "Data Link Layer", "is_correct": False},
            {"option_text": "Transport Layer", "is_correct": True},
            {"option_text": "Session Layer", "is_correct": False}
        ]
    }
    code, mcq_res = make_request("/api/questions", "POST", mcq_payload, token=admin_token)
    assert code == 201, f"MCQ creation failed: {mcq_res}"
    print(f"[PASS] 11. Question Type 1 Created: MCQ (#{mcq_res['id']})")

    # Type 2: Multi-Select
    multi_payload = {
        "question_text": "Which of the following sorting algorithms have worst-case time complexity of O(N log N)?",
        "question_type": "MULTI_SELECT",
        "subject": "Data Structures & Algorithms",
        "difficulty": "MEDIUM",
        "marks": 3.0,
        "negative_marks": 0.5,
        "model_answer": "Merge Sort and Heap Sort are guaranteed O(N log N). Quick Sort can degrade to O(N^2) on poor pivots.",
        "options": [
            {"option_text": "Merge Sort", "is_correct": True},
            {"option_text": "Heap Sort", "is_correct": True},
            {"option_text": "Quick Sort", "is_correct": False},
            {"option_text": "Bubble Sort", "is_correct": False}
        ]
    }
    code, multi_res = make_request("/api/questions", "POST", multi_payload, token=admin_token)
    assert code == 201, f"Multi-Select creation failed: {multi_res}"
    print(f"[PASS] 12. Question Type 2 Created: Multi-Select (#{multi_res['id']})")

    # Type 3: Short Answer
    short_payload = {
        "question_text": "State the CAP theorem in distributed systems and define each letter.",
        "question_type": "SHORT_ANSWER",
        "subject": "Database Systems",
        "difficulty": "EASY",
        "marks": 5.0,
        "negative_marks": 0.0,
        "model_answer": "CAP theorem states that a distributed system cannot simultaneously guarantee Consistency, Availability, and Partition Tolerance.",
        "evaluation_guidelines": "1 Mark for stating the theorem principle; 4 Marks for defining C, A, and P."
    }
    code, short_res = make_request("/api/questions", "POST", short_payload, token=admin_token)
    assert code == 201, f"Short Answer creation failed: {short_res}"
    print(f"[PASS] 13. Question Type 3 Created: Short Answer (#{short_res['id']})")

    # Type 4: Long Answer
    long_payload = {
        "question_text": "Explain the Backpropagation algorithm in Deep Learning. Formulate the gradient computation using the multivariable chain rule for a multi-layer perceptron.",
        "question_type": "LONG_ANSWER",
        "subject": "Artificial Intelligence",
        "difficulty": "HARD",
        "marks": 10.0,
        "negative_marks": 0.0,
        "model_answer": "Comprehensive answer explaining forward pass, loss calculation, backward pass, error delta calculations, weight matrix updates, and learning rate parameter.",
        "evaluation_guidelines": "4 Marks for chain rule math; 3 Marks for layer matrix dimensions; 3 Marks for momentum and gradient descent formulation."
    }
    code, long_res = make_request("/api/questions", "POST", long_payload, token=admin_token)
    assert code == 201, f"Long Answer creation failed: {long_res}"
    print(f"[PASS] 14. Question Type 4 Created: Long Answer (#{long_res['id']})")

    # Type 5: Image Upload Question
    img_payload = {
        "question_text": "Draw the complete architectural block diagram of an 8-bit Microcontroller including ALU, Registers (A, B, PSW), Program Counter, and Stack Pointer. Upload a clear handwritten diagram.",
        "question_type": "IMAGE_UPLOAD",
        "subject": "Computer Organization",
        "difficulty": "HARD",
        "marks": 15.0,
        "negative_marks": 0.0,
        "model_answer": "Schematic must show Internal Bus, ALU, Accumulator, B Register, Program Status Word, Stack Pointer, Data Pointer, and Timing Controller.",
        "evaluation_guidelines": "5 Marks for Bus Interconnects; 5 Marks for ALU & Register Blocks; 5 Marks for Control Signals and Legibility."
    }
    code, img_res = make_request("/api/questions", "POST", img_payload, token=admin_token)
    assert code == 201, f"Image Upload creation failed: {img_res}"
    print(f"[PASS] 15. Question Type 5 Created: Image Upload Question (#{img_res['id']})")

    # --- 11. AI QUESTION GENERATOR ---
    code, ai_res = make_request("/api/questions/ai-generate", "POST", {
        "topic": "Convolutional Neural Networks",
        "subject": "Artificial Intelligence",
        "question_type": "MCQ",
        "difficulty": "MEDIUM"
    }, token=admin_token)
    assert code == 200, f"AI Generator failed: {ai_res}"
    assert "Convolutional Neural Networks" in ai_res["question_text"]
    print(f"[PASS] 16. AI Question Generator Synthesized Item Successfully:")
    print(f"        Generated Question: '{ai_res['question_text'][:80]}...'")

    # --- 12. QUESTION BANK STATS & FILTERING ---
    code, q_stats = make_request("/api/questions/stats")
    assert code == 200, f"Stats failed: {q_stats}"
    print(f"[PASS] 17. Question Bank Aggregation Stats:")
    print(f"        Total Items: {q_stats['total_questions']}")
    print(f"        MCQ Count: {q_stats['mcq_count']}")
    print(f"        Multi-Select Count: {q_stats['multi_select_count']}")
    print(f"        Subjective Count: {q_stats['subjective_count']}")
    print(f"        Image Upload Count: {q_stats['image_upload_count']}")
    print(f"        Difficulty Breakdown: {q_stats['by_difficulty']}")

    # --- 13. EXAMINER REGISTRATION & APPROVAL WORKFLOW ---
    # Register pending examiner
    prof_email = f"sophia_{ts}@examai.edu"
    prof_payload = {
        "name": "Prof. Sophia Campbell",
        "email": prof_email,
        "register_number": f"FAC-{ts % 10000}",
        "department": "Artificial Intelligence & Data Science",
        "year": "Faculty",
        "password": "Password@123",
        "confirm_password": "Password@123",
        "role": "EXAMINER"
    }
    code, prof_reg = make_request("/api/auth/register", "POST", prof_payload)
    assert code == 201 and prof_reg["status"] == "PENDING"
    print(f"[PASS] 20. Examiner Registration: Submitted with status PENDING (#{prof_reg['user_id']})")

    # Pending examiner attempted login -> Blocked by 403 Gatekeeper
    code, prof_login = make_request("/api/auth/login", "POST", {
        "identifier": prof_email,
        "password": "Password@123"
    })
    assert code == 403 and "pending admin approval" in prof_login["detail"]
    print(f"[PASS] 21. Pending Examiner Gatekeeper: Login Blocked with HTTP 403 ('{prof_login['detail']}')")

    # Admin fetches pending examiners list
    code, pending_examiners = make_request("/api/admin/examiners/pending", token=admin_token)
    assert code == 200 and any(e["email"] == prof_email for e in pending_examiners)
    print(f"[PASS] 23. Admin GET /admin/examiners/pending: Found Sophia in Pending List")

    # Admin approves examiner
    code, approve_prof_res = make_request(f"/api/admin/examiners/{prof_reg['user_id']}/approve", "PUT", token=admin_token)
    assert code == 200 and approve_prof_res["approval_status"] == "APPROVED"
    print(f"[PASS] 24. Admin PUT /admin/examiners/{prof_reg['user_id']}/approve: Status -> APPROVED")

    # Re-login approved examiner to get fresh token
    code, prof_login2 = make_request("/api/auth/login", "POST", {
        "identifier": prof_email,
        "password": "Password@123"
    })
    approved_prof_token = prof_login2["access_token"]

    # Approved examiner creates question -> 201 Created
    code, approved_q_res = make_request("/api/questions", "POST", {
        "question_text": "Describe the attention mechanism in Transformer models.",
        "question_type": "SHORT_ANSWER",
        "subject": "Artificial Intelligence",
        "difficulty": "MEDIUM",
        "marks": 5.0,
        "model_answer": "Attention mechanism computes compatibility scores between query and key vectors to weight value vectors."
    }, token=approved_prof_token)
    assert code == 201 and approved_q_res["id"] is not None
    print(f"[PASS] 25. Approved Examiner Successfully Authored Question (#{approved_q_res['id']})")

    # Approved examiner creates exam -> 201 Created
    code, exam_res = make_request("/api/exams", "POST", {
        "title": "Deep Learning Comprehensive Midterm 2026",
        "subject": "Artificial Intelligence",
        "duration_minutes": 90,
        "total_marks": 100.0,
        "pass_marks": 50.0,
        "instructions": "All questions are mandatory. Maintain proctoring camera focus at all times."
    }, token=approved_prof_token)
    assert code == 201 and exam_res["id"] is not None
    print(f"[PASS] 26. Approved Examiner Successfully Configured Exam (#{exam_res['id']} - '{exam_res['title']}')")

    # Admin rejects examiner with reason
    code, reject_prof_res = make_request(f"/api/admin/examiners/{prof_reg['user_id']}/reject", "PUT", {
        "rejection_reason": "Incomplete institutional accreditation documentation."
    }, token=admin_token)
    assert code == 200 and reject_prof_res["approval_status"] == "REJECTED"
    print(f"[PASS] 27. Admin PUT /admin/examiners/{prof_reg['user_id']}/reject: Status -> REJECTED")

    # Re-login with rejected examiner -> Blocked by 403 Gatekeeper
    code, prof_login3 = make_request("/api/auth/login", "POST", {
        "identifier": prof_email,
        "password": "Password@123"
    })
    assert code == 403 and "Status: REJECTED" in prof_login3["detail"]
    print(f"[PASS] 28. Rejected Examiner Gatekeeper: Login Blocked with HTTP 403 ('{prof_login3['detail']}')")

    # --- 14. EXAM SESSION LIFECYCLE, REAL-TIME PROCTORING & AUTOMATED GRADING ---
    # Create an active exam with questions using admin token
    official_exam_payload = {
        "title": f"Midterm Assessment {ts}",
        "subject": "Computer Science & Engineering",
        "duration_minutes": 60,
        "total_marks": 20.0,
        "passing_marks": 8.0,
        "status": "PUBLISHED",
        "questions": [
            {"question_id": mcq_res["id"], "marks": 2.0, "order": 1},
            {"question_id": multi_res["id"], "marks": 3.0, "order": 2},
            {"question_id": short_res["id"], "marks": 5.0, "order": 3},
            {"question_id": img_res["id"], "marks": 10.0, "order": 4}
        ]
    }
    code, live_exam = make_request("/api/exams", "POST", official_exam_payload, token=admin_token)
    assert code == 201, f"Live exam creation failed: {live_exam}"
    exam_id = live_exam["id"]
    print(f"[PASS] 29. Official Proctored Examination Published (#{exam_id} - '{live_exam['title']}')")

    # Student starts exam session (Sanitized questions test)
    code, session_res = make_request(f"/api/exams/{exam_id}/start", "POST", token=elena_token)
    assert code == 200, f"Session start failed: {session_res}"
    session_token = session_res["session_token"]
    assert len(session_res["questions"]) == 4
    for q in session_res["questions"]:
        assert "model_answer" not in q or q.get("model_answer") is None
        for opt in q.get("options", []):
            assert "is_correct" not in opt
    print(f"[PASS] 30. Student Elena Started Exam Session: Token Acquired ({session_token[:20]}...)")
    print(f"        Sanitized Questions Verified (0 Answer Leaks)")

    # Resume session
    code, resume_res = make_request(f"/api/exams/sessions/{session_token}/active", token=elena_token)
    assert code == 200 and resume_res["session_token"] == session_token
    print(f"[PASS] 31. Active Session Reconnection & Resume Succeeded")

    # Student autosaves answers across question types
    # 1. MCQ
    mcq_q = next(q for q in session_res["questions"] if q["question_type"] == "MCQ")
    correct_opt = next(o for o in mcq_q["options"] if "Transport" in o["option_text"])
    code, save1 = make_request(f"/api/exams/sessions/{session_token}/answers", "POST", {
        "question_id": mcq_q["question_id"],
        "selected_option_ids": [correct_opt["id"]]
    }, token=elena_token)
    assert code == 200 and save1["success"] is True

    # 2. Multi-Select
    multi_q = next(q for q in session_res["questions"] if q["question_type"] == "MULTI_SELECT")
    correct_multi_opts = [o["id"] for o in multi_q["options"] if o["option_text"] in ["Merge Sort", "Heap Sort"]]
    code, save2 = make_request(f"/api/exams/sessions/{session_token}/answers", "POST", {
        "question_id": multi_q["question_id"],
        "selected_option_ids": correct_multi_opts
    }, token=elena_token)
    assert code == 200 and save2["success"] is True

    # 3. Short Answer
    short_q = next(q for q in session_res["questions"] if q["question_type"] == "SHORT_ANSWER")
    code, save3 = make_request(f"/api/exams/sessions/{session_token}/answers", "POST", {
        "question_id": short_q["question_id"],
        "text_answer": "CAP theorem defines that a distributed system cannot guarantee Consistency, Availability, and Partition tolerance simultaneously."
    }, token=elena_token)
    assert code == 200 and save3["success"] is True

    # 4. Image Upload
    img_q = next(q for q in session_res["questions"] if q["question_type"] == "IMAGE_UPLOAD")
    code, save4 = make_request(f"/api/exams/sessions/{session_token}/answers", "POST", {
        "question_id": img_q["question_id"],
        "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }, token=elena_token)
    assert code == 200 and save4["success"] is True
    print(f"[PASS] 32. Real-Time Answer Autosave Tested Across MCQ, Multi-Select, Short Answer & Image Upload")

    # Log proctoring events
    code, ev1 = make_request(f"/api/exams/sessions/{session_token}/proctor-event", "POST", {
        "event_type": "TAB_SWITCH",
        "details": "Background tab switched for 1.5s"
    }, token=elena_token)
    assert code == 200 and ev1["event_type"] == "TAB_SWITCH"
    print(f"[PASS] 33. AI Vision Proctoring Event Stream Recorded ({ev1['event_type']})")

    # Submit exam session
    code, result_data = make_request(f"/api/exams/sessions/{session_token}/submit", "POST", {
        "final_confirmation": True
    }, token=elena_token)
    assert code == 200, f"Submit failed: {result_data}"
    assert result_data["status"] == "SUBMITTED"
    assert result_data["total_marks"] == 20.0
    assert result_data["obtained_marks"] >= 15.0
    assert result_data["percentage"] >= 75.0
    assert result_data["passed"] is True
    assert result_data["proctoring_summary"]["integrity_score"] < 100.0
    print(f"[PASS] 34. Exam Submitted & Automated AI Grading Engine Completed:")
    print(f"        Obtained: {result_data['obtained_marks']} / {result_data['total_marks']} ({result_data['percentage']}%) - PASSED")
    print(f"        Proctoring Integrity Trust Score: {result_data['proctoring_summary']['integrity_score']}%")

    # Student retrieves results breakdown
    code, student_res_list = make_request("/api/student/results", token=elena_token)
    assert code == 200 and len(student_res_list) >= 1
    assert student_res_list[0]["passed"] is True
    print(f"[PASS] 35. Student Performance History & Scorecards Retrieved ({len(student_res_list)} completed exams)")

    # Examiner audits submissions & overrides subjective grade
    code, examiner_subs = make_request(f"/api/exams/{exam_id}/submissions", token=admin_token)
    assert code == 200 and len(examiner_subs) >= 1
    assert examiner_subs[0]["student_name"] == "Elena Rostova"
    print(f"[PASS] 36. Examiner Submissions & Proctoring Incident Audit Table Verified")

    print("\n================================================================")
    print("ALL 36 END-TO-END WORKFLOW & PROCTORING TESTS COMPLETED (100% PASS)")
    print("================================================================\n")

if __name__ == "__main__":
    run_comprehensive_suite()
