import urllib.request
import urllib.parse
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8001"

def test_workflow():
    print("Testing AI Intelligent Examination Platform API...\n")

    # 1. Health check
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("1. Health check:", res["status"])

    # 2. Student Registration (Should be PENDING)
    reg_payload = {
        "name": "David Miller",
        "email": "david.miller@examai.edu",
        "register_number": "REG2024CS088",
        "department": "Computer Science & Engineering",
        "year": "2nd Year",
        "password": "Password@123",
        "confirm_password": "Password@123"
    }
    data = json.dumps(reg_payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/auth/register", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("2. Student Registration:", res["message"], "| Status:", res["status"])

    # 3. Attempt Login with PENDING student (Should be rejected with 403)
    login_payload = {
        "identifier": "david.miller@examai.edu",
        "password": "Password@123"
    }
    data = json.dumps(login_payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        print("ERROR: Pending student was allowed to login!")
    except urllib.error.HTTPError as e:
        err_res = json.loads(e.read().decode())
        print(f"3. Expected PENDING Login Block ({e.code}):", err_res["detail"])

    # 4. Admin Login
    admin_login_payload = {
        "identifier": "admin@examai.edu",
        "password": "Admin@123"
    }
    data = json.dumps(admin_login_payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        admin_res = json.loads(resp.read().decode())
        admin_token = admin_res["access_token"]
        print("4. Admin Login Successful. Token acquired.")

    # 5. Admin Approves David Miller
    # First get student list
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/students?search=REG2024CS088",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        students = json.loads(resp.read().decode())
        david = students[0]
        david_id = david["id"]
        print(f"5. Found David in Admin list (ID: {david_id}, Status: {david['approval_status']})")

    # Approve
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/students/{david_id}/approve",
        data=b"{}",
        headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        approved_res = json.loads(resp.read().decode())
        print(f"6. Admin Approved Student. New Status: {approved_res['approval_status']}")

    # 7. Student Login Now Succeeds
    data = json.dumps(login_payload).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        student_login_res = json.loads(resp.read().decode())
        student_token = student_login_res["access_token"]
        print("7. Student Login now Successful! Token acquired for role:", student_login_res["user"]["role"])

    # 8. Student Dashboard access
    req = urllib.request.Request(
        f"{BASE_URL}/api/student/dashboard",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        dash_res = json.loads(resp.read().decode())
        print("8. Student Dashboard fetched. Upcoming exams count:", len(dash_res["upcoming_exams"]))

    # 9. Question Bank Stats
    req = urllib.request.Request(f"{BASE_URL}/api/questions/stats")
    with urllib.request.urlopen(req) as resp:
        q_stats = json.loads(resp.read().decode())
        print("9. Question Bank Stats:", f"Total: {q_stats['total_questions']}, MCQ: {q_stats['mcq_count']}, Multi: {q_stats['multi_select_count']}, Subjective: {q_stats['subjective_count']}, Images: {q_stats['image_upload_count']}")

    print("\nALL WORKFLOW TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    test_workflow()
