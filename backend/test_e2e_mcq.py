import requests

BASE_URL = 'http://127.0.0.1:8001'

# 1. Login as Examiner
login_res = requests.post(f'{BASE_URL}/api/auth/login', json={
    'identifier': 'examiner@examai.edu',
    'password': 'Examiner@123'
})
assert login_res.status_code == 200, f'Login failed: {login_res.text}'
token = login_res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print('1. Logged in successfully as Examiner (examiner@examai.edu).')

# 2. Test Question Extraction with various Key formats
sample_doc = '''DATA STRUCTURES – EXAM QUESTION BANK
Part A: Multiple Choice Questions

1. Which data structure follows the LIFO principle?
A) Queue
B) Stack
C) Linked List
D) Tree
Key Answer: B) Stack

2. Which data structure follows the FIFO principle?
A) Queue
B) Stack
C) Tree
D) Graph
Key: A) Queue

3. What is the worst-case time complexity of linear search in an array of size n?
A) O(1)
B) O(n)
C) O(log n)
D) O(n^2)
Correct Answer: B) O(n)

4. Which data structure is best suited for implementing recursion?
A) Queue
B) Stack
C) Heap
D) Hash Table
Ans: B) Stack

5. In a binary search tree, what is the time complexity to search in the average case?
A) O(n)
B) O(n log n)
C) O(log n)
D) O(1)
Correct Option: C) O(log n)
'''

extract_res = requests.post(f'{BASE_URL}/api/questions/extract-text', json={
    'raw_text': sample_doc,
    'default_subject': 'Data Structures & Algorithms',
    'default_difficulty': 'MEDIUM',
    'default_marks': 2.0
}, headers=headers)

assert extract_res.status_code == 200, f'Extract failed: {extract_res.text}'
data = extract_res.json()
assert data['success'] is True
assert len(data['questions']) == 5
print('2. Extracted 5 questions via API.')

for i, q in enumerate(data['questions'], 1):
    opts = q['options']
    correct_opts = [o for o in opts if o['is_correct']]
    assert len(correct_opts) == 1, f"Expected exactly 1 correct option for Q{i}, got {len(correct_opts)}"
    print(f"   Q{i} Key: {q['answer_key']} -> Selected Option: {correct_opts[0]['option_text']}")

# 3. Test Batch Database Persistence
batch_res = requests.post(f'{BASE_URL}/api/questions/batch-create', json={
    'questions': data['questions']
}, headers=headers)
assert batch_res.status_code in [200, 201], f'Batch save failed: {batch_res.text}'
created_qs = batch_res.json()['questions']
print(f'3. Successfully processed {len(created_qs)} questions into Question Bank DB.')

# 4. Verify each persisted question in DB retains the correct option
for q in created_qs:
    q_id = q['id']
    fetch_res = requests.get(f'{BASE_URL}/api/questions/{q_id}', headers=headers)
    assert fetch_res.status_code == 200
    fetched_q = fetch_res.json()
    correct_in_db = [o for o in fetched_q['options'] if o['is_correct']]
    assert len(correct_in_db) == 1, f"Question #{q_id} in DB has {len(correct_in_db)} correct options"
    print(f"   Fetched Q#{q_id} from DB: Option \"{correct_in_db[0]['option_text']}\" has is_correct=True")

print('\nALL VERIFICATIONS PASSED 100% SUCCESSFULLY!')
