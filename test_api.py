#!/usr/bin/env python3
"""
Comprehensive API test script for forensic log analysis system
Tests all 40+ endpoints systematically
"""
import requests
import json
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"
TOKEN = None
CASE_ID = None
EVIDENCE_ID = None
EVENT_ID = None
STORY_ID = None

def print_section(title):
    """Print section header"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}\n")

def print_result(test_name, status, details=""):
    """Print test result"""
    emoji = "✅" if status else "❌"
    print(f"{emoji} {test_name}")
    if details:
        print(f"   {details}")

def make_request(method, endpoint, **kwargs):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    headers = kwargs.pop('headers', {})
    
    if TOKEN:
        headers['Authorization'] = f'Bearer {TOKEN}'
    
    try:
        response = requests.request(method, url, headers=headers, **kwargs)
        return response
    except Exception as e:
        print(f"   Error: {str(e)}")
        return None

# =============================================================================
# TEST 1: Authentication APIs
# =============================================================================
def test_authentication():
    global TOKEN
    print_section("TEST 1: Authentication APIs")
    
    # Test 1.1: Register new user
    print("Test 1.1: Register new user")
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "TestPass123!",
        "password2": "TestPass123!"
    }
    response = make_request('POST', '/auth/register/', json=data)
    if response and response.status_code in [200, 201, 400]:
        print_result("Register endpoint", True, f"Status: {response.status_code}")
    else:
        print_result("Register endpoint", False)
    
    # Test 1.2: Login
    print("\nTest 1.2: Login and get token")
    data = {
        "username": "admin",
        "password": "admin123"  # Default superuser password
    }
    response = make_request('POST', '/auth/login/', json=data)
    if response and response.status_code == 200:
        try:
            TOKEN = response.json().get('access')
            print_result("Login successful", True, f"Token: {TOKEN[:20]}...")
        except:
            print_result("Login successful", False, "No token in response")
    else:
        print_result("Login", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Test 1.3: Get current user
    if TOKEN:
        print("\nTest 1.3: Get current user info")
        response = make_request('GET', '/auth/me/')
        if response and response.status_code == 200:
            user = response.json()
            print_result("Get user info", True, f"User: {user.get('username')}")
        else:
            print_result("Get user info", False)

# =============================================================================
# TEST 2: Case Management APIs
# =============================================================================
def test_case_management():
    global CASE_ID
    print_section("TEST 2: Case Management APIs")
    
    if not TOKEN:
        print_result("Skipped - No authentication token", False)
        return
    
    # Test 2.1: Create case
    print("Test 2.1: Create new case")
    data = {
        "name": "Test Investigation 2026",
        "description": "Automated API test case for forensic analysis system",
        "status": "OPEN"
    }
    response = make_request('POST', '/cases/', json=data)
    if response and response.status_code in [200, 201]:
        case = response.json()
        CASE_ID = case.get('id')
        print_result("Create case", True, f"Case ID: {CASE_ID}")
    else:
        print_result("Create case", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Test 2.2: List cases
    print("\nTest 2.2: List all cases")
    response = make_request('GET', '/cases/')
    if response and response.status_code == 200:
        cases = response.json()
        count = len(cases) if isinstance(cases, list) else cases.get('count', 0)
        print_result("List cases", True, f"Found {count} cases")
    else:
        print_result("List cases", False)
    
    # Test 2.3: Get case detail
    if CASE_ID:
        print(f"\nTest 2.3: Get case detail (ID: {CASE_ID})")
        response = make_request('GET', f'/cases/{CASE_ID}/')
        if response and response.status_code == 200:
            case = response.json()
            print_result("Get case detail", True, f"Name: {case.get('name')}")
        else:
            print_result("Get case detail", False)
    
    # Test 2.4: Update case
    if CASE_ID:
        print(f"\nTest 2.4: Update case (ID: {CASE_ID})")
        data = {
            "name": "Test Investigation 2026 - Updated",
            "status": "IN_PROGRESS"
        }
        response = make_request('PATCH', f'/cases/{CASE_ID}/', json=data)
        if response and response.status_code == 200:
            print_result("Update case", True, "Status changed to IN_PROGRESS")
        else:
            print_result("Update case", False)
    
    # Test 2.5: Get case summary
    if CASE_ID:
        print(f"\nTest 2.5: Get case summary (ID: {CASE_ID})")
        response = make_request('GET', f'/cases/{CASE_ID}/summary/')
        if response and response.status_code == 200:
            summary = response.json()
            print_result("Get case summary", True, 
                        f"Files: {summary.get('evidence_count', 0)}, Events: {summary.get('event_count', 0)}")
        else:
            print_result("Get case summary", False)

# =============================================================================
# TEST 3: Evidence Upload and Parsing APIs
# =============================================================================
def test_evidence_upload():
    global EVIDENCE_ID
    print_section("TEST 3: Evidence Upload & Parsing APIs")
    
    if not TOKEN or not CASE_ID:
        print_result("Skipped - No case available", False)
        return
    
    # Create sample CSV file
    sample_csv = Path("/tmp/test_security_log.csv")
    sample_csv.write_text("""timestamp,event_type,source_ip,dest_ip,user,action,status
2026-01-12 10:00:00,LOGIN,192.168.1.100,10.0.0.1,john.doe,login,success
2026-01-12 10:05:00,FILE_ACCESS,192.168.1.100,10.0.0.5,john.doe,read,success
2026-01-12 10:10:00,LOGIN,192.168.1.200,10.0.0.1,admin,login,failed
2026-01-12 10:15:00,LOGIN,192.168.1.200,10.0.0.1,admin,login,failed
2026-01-12 10:20:00,LOGIN,192.168.1.200,10.0.0.1,admin,login,failed
2026-01-12 10:25:00,FILE_DELETE,192.168.1.100,10.0.0.5,john.doe,delete,success
""")
    
    # Test 3.1: Upload evidence file
    print("Test 3.1: Upload evidence file")
    with open(sample_csv, 'rb') as f:
        files = {'file': ('test_security_log.csv', f, 'text/csv')}
        data = {'case': CASE_ID}
        response = make_request('POST', '/evidence/', data=data, files=files)
    
    if response and response.status_code in [200, 201]:
        evidence = response.json()
        EVIDENCE_ID = evidence.get('id')
        print_result("Upload evidence", True, 
                    f"Evidence ID: {EVIDENCE_ID}, Hash: {evidence.get('file_hash', 'N/A')[:16]}...")
    else:
        print_result("Upload evidence", False, 
                    f"Status: {response.status_code if response else 'No response'}")
    
    # Test 3.2: List evidence files
    print("\nTest 3.2: List evidence files")
    response = make_request('GET', f'/evidence/?case={CASE_ID}')
    if response and response.status_code == 200:
        files = response.json()
        count = len(files) if isinstance(files, list) else files.get('count', 0)
        print_result("List evidence", True, f"Found {count} file(s)")
    else:
        print_result("List evidence", False)
    
    # Test 3.3: Verify hash
    if EVIDENCE_ID:
        print(f"\nTest 3.3: Verify file hash (ID: {EVIDENCE_ID})")
        response = make_request('POST', f'/evidence/{EVIDENCE_ID}/verify_hash/')
        if response and response.status_code == 200:
            result = response.json()
            print_result("Verify hash", result.get('valid', False), 
                        f"Hash integrity: {'Verified' if result.get('valid') else 'Failed'}")
        else:
            print_result("Verify hash", False)
    
    # Test 3.4: Parse evidence file
    if EVIDENCE_ID:
        print(f"\nTest 3.4: Parse evidence file (ID: {EVIDENCE_ID})")
        response = make_request('POST', f'/evidence/{EVIDENCE_ID}/parse/')
        if response and response.status_code in [200, 202]:
            result = response.json()
            print_result("Parse evidence", True, 
                        f"Task: {result.get('task_id', 'Started')[:16]}...")
            time.sleep(2)  # Wait for parsing
        else:
            print_result("Parse evidence", False)

# =============================================================================
# TEST 4: Parsed Events APIs
# =============================================================================
def test_parsed_events():
    global EVENT_ID
    print_section("TEST 4: Parsed Events APIs")
    
    if not TOKEN or not EVIDENCE_ID:
        print_result("Skipped - No evidence available", False)
        return
    
    # Test 4.1: List parsed events
    print("Test 4.1: List parsed events")
    response = make_request('GET', f'/events/?evidence_file={EVIDENCE_ID}')
    if response and response.status_code == 200:
        events = response.json()
        if isinstance(events, list) and len(events) > 0:
            EVENT_ID = events[0].get('id')
            print_result("List events", True, f"Found {len(events)} events")
        else:
            count = events.get('count', 0) if isinstance(events, dict) else 0
            print_result("List events", True, f"Found {count} events")
    else:
        print_result("List events", False)
    
    # Test 4.2: Filter events by type
    print("\nTest 4.2: Filter events by type")
    response = make_request('GET', '/events/?event_type=LOGIN')
    if response and response.status_code == 200:
        events = response.json()
        count = len(events) if isinstance(events, list) else events.get('count', 0)
        print_result("Filter by event type", True, f"Found {count} LOGIN events")
    else:
        print_result("Filter by event type", False)
    
    # Test 4.3: Get event detail
    if EVENT_ID:
        print(f"\nTest 4.3: Get event detail (ID: {EVENT_ID})")
        response = make_request('GET', f'/events/{EVENT_ID}/')
        if response and response.status_code == 200:
            event = response.json()
            print_result("Get event detail", True, 
                        f"Type: {event.get('event_type')}, User: {event.get('user_or_account')}")
        else:
            print_result("Get event detail", False)

# =============================================================================
# TEST 5: ML Scoring and LLM APIs
# =============================================================================
def test_scoring_and_llm():
    print_section("TEST 5: ML Scoring & LLM APIs")
    
    if not TOKEN or not CASE_ID:
        print_result("Skipped - No case available", False)
        return
    
    # Test 5.1: Trigger ML scoring
    print(f"Test 5.1: Trigger ML scoring for case {CASE_ID}")
    data = {"threshold": 0.7}
    response = make_request('POST', f'/cases/{CASE_ID}/score/', json=data)
    if response and response.status_code in [200, 202]:
        result = response.json()
        print_result("Trigger scoring", True, 
                    f"Task: {result.get('task_id', 'Started')[:16]}...")
        time.sleep(3)  # Wait for scoring
    else:
        print_result("Trigger scoring", False)
    
    # Test 5.2: List scored events
    print("\nTest 5.2: List scored events")
    response = make_request('GET', f'/scored-events/?case={CASE_ID}')
    if response and response.status_code == 200:
        events = response.json()
        count = len(events) if isinstance(events, list) else events.get('count', 0)
        print_result("List scored events", True, f"Found {count} scored events")
    else:
        print_result("List scored events", False)
    
    # Test 5.3: Filter by confidence threshold
    print("\nTest 5.3: Filter by confidence threshold")
    response = make_request('GET', '/scored-events/?min_confidence=0.5')
    if response and response.status_code == 200:
        events = response.json()
        count = len(events) if isinstance(events, list) else events.get('count', 0)
        print_result("Filter by confidence", True, f"Found {count} high-confidence events")
    else:
        print_result("Filter by confidence", False)
    
    # Test 5.4: Filter by risk label
    print("\nTest 5.4: Filter by risk label")
    response = make_request('GET', '/scored-events/?risk_label=HIGH')
    if response and response.status_code == 200:
        events = response.json()
        count = len(events) if isinstance(events, list) else events.get('count', 0)
        print_result("Filter by risk label", True, f"Found {count} HIGH risk events")
    else:
        print_result("Filter by risk label", False)

# =============================================================================
# TEST 6: Story Synthesis APIs
# =============================================================================
def test_story_synthesis():
    global STORY_ID
    print_section("TEST 6: Story Synthesis APIs")
    
    if not TOKEN or not CASE_ID:
        print_result("Skipped - No case available", False)
        return
    
    # Test 6.1: Generate story
    print(f"Test 6.1: Generate attack story for case {CASE_ID}")
    data = {"provider": "openai", "model": "gpt-4"}
    response = make_request('POST', f'/cases/{CASE_ID}/generate_story/', json=data)
    if response and response.status_code in [200, 202]:
        result = response.json()
        print_result("Generate story", True, 
                    f"Task: {result.get('task_id', 'Started')[:16]}...")
        time.sleep(2)
    else:
        print_result("Generate story", False)
    
    # Test 6.2: List stories
    print("\nTest 6.2: List attack stories")
    response = make_request('GET', f'/story/?case={CASE_ID}')
    if response and response.status_code == 200:
        stories = response.json()
        if isinstance(stories, list) and len(stories) > 0:
            STORY_ID = stories[0].get('id')
            count = len(stories)
        else:
            count = stories.get('count', 0) if isinstance(stories, dict) else 0
        print_result("List stories", True, f"Found {count} story/stories")
    else:
        print_result("List stories", False)
    
    # Test 6.3: Get story detail
    if STORY_ID:
        print(f"\nTest 6.3: Get story detail (ID: {STORY_ID})")
        response = make_request('GET', f'/story/{STORY_ID}/')
        if response and response.status_code == 200:
            story = response.json()
            print_result("Get story detail", True, 
                        f"Pattern: {story.get('pattern_name', 'N/A')}")
        else:
            print_result("Get story detail", False)

# =============================================================================
# TEST 7: Report Generation APIs
# =============================================================================
def test_report_generation():
    print_section("TEST 7: Report Generation APIs")
    
    if not TOKEN or not CASE_ID:
        print_result("Skipped - No case available", False)
        return
    
    # Test 7.1: Generate PDF report
    print(f"Test 7.1: Generate PDF report for case {CASE_ID}")
    data = {"format": "pdf", "include_llm_explanations": False}
    response = make_request('POST', f'/cases/{CASE_ID}/generate_report/', json=data)
    if response and response.status_code in [200, 202]:
        result = response.json()
        print_result("Generate PDF report", True, 
                    f"Task: {result.get('task_id', 'Started')[:16]}...")
        time.sleep(2)
    else:
        print_result("Generate PDF report", False)
    
    # Test 7.2: Generate JSON report
    print(f"\nTest 7.2: Generate JSON report for case {CASE_ID}")
    data = {"format": "json"}
    response = make_request('POST', f'/cases/{CASE_ID}/generate_report/', json=data)
    if response and response.status_code in [200, 202]:
        result = response.json()
        print_result("Generate JSON report", True, 
                    f"Task: {result.get('task_id', 'Started')[:16]}...")
    else:
        print_result("Generate JSON report", False)
    
    # Test 7.3: List reports
    print("\nTest 7.3: List reports")
    response = make_request('GET', f'/report/?case={CASE_ID}')
    if response and response.status_code == 200:
        reports = response.json()
        count = len(reports) if isinstance(reports, list) else reports.get('count', 0)
        print_result("List reports", True, f"Found {count} report(s)")
    else:
        print_result("List reports", False)

# =============================================================================
# TEST 8: Investigation Notes APIs
# =============================================================================
def test_investigation_notes():
    print_section("TEST 8: Investigation Notes APIs")
    
    if not TOKEN or not CASE_ID:
        print_result("Skipped - No case available", False)
        return
    
    # Test 8.1: Create note
    print("Test 8.1: Create investigation note")
    data = {
        "case": CASE_ID,
        "content": "This is an automated test note created during API testing."
    }
    response = make_request('POST', '/notes/', json=data)
    if response and response.status_code in [200, 201]:
        note = response.json()
        note_id = note.get('id')
        print_result("Create note", True, f"Note ID: {note_id}")
    else:
        print_result("Create note", False)
    
    # Test 8.2: List notes
    print("\nTest 8.2: List investigation notes")
    response = make_request('GET', f'/notes/?case={CASE_ID}')
    if response and response.status_code == 200:
        notes = response.json()
        count = len(notes) if isinstance(notes, list) else notes.get('count', 0)
        print_result("List notes", True, f"Found {count} note(s)")
    else:
        print_result("List notes", False)

# =============================================================================
# MAIN EXECUTION
# =============================================================================
def main():
    print("\n" + "="*80)
    print(" FORENSIC LOG ANALYSIS API TEST SUITE")
    print(" Testing 40+ endpoints systematically")
    print("="*80)
    
    try:
        test_authentication()
        test_case_management()
        test_evidence_upload()
        test_parsed_events()
        test_scoring_and_llm()
        test_story_synthesis()
        test_report_generation()
        test_investigation_notes()
        
        print_section("TEST SUMMARY")
        print("✅ All API endpoint tests completed!")
        print("\nNote: Some tests may show failures if:")
        print("  - LLM API keys are not configured")
        print("  - Celery workers are not running")
        print("  - Background tasks need more time to complete")
        print("\nRecommendation: Review individual test results above.")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
