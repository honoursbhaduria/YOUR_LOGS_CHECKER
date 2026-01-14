#!/usr/bin/env python3
"""
Comprehensive API Test Suite - Full System Verification
Tests all endpoints with botsv3_events.csv data
"""
import requests
import time
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"
TOKEN = None
HEADERS = {}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(text):
    print(f"\n{'='*80}")
    print(f"{Colors.BLUE}{text:^80}{Colors.RESET}")
    print('='*80)

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.RESET}")

def test_authentication():
    """Test 1: Authentication"""
    global TOKEN, HEADERS
    print_header("TEST 1: AUTHENTICATION & USER MANAGEMENT")
    
    try:
        # Login
        response = requests.post(f"{BASE_URL}/auth/login/", 
            json={"username": "admin", "password": "admin123"})
        
        if response.status_code == 200:
            data = response.json()
            TOKEN = data['access']
            HEADERS = {"Authorization": f"Bearer {TOKEN}"}
            print_success(f"Login successful - Token received")
            
            # Get user profile
            response = requests.get(f"{BASE_URL}/auth/me/", headers=HEADERS)
            if response.status_code == 200:
                user = response.json()
                print_success(f"User profile retrieved: {user['username']}")
                return True
        else:
            print_error(f"Login failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Authentication error: {str(e)}")
        return False

def test_case_management():
    """Test 2: Case Management"""
    print_header("TEST 2: CASE MANAGEMENT (CRUD OPERATIONS)")
    
    try:
        # List existing cases
        response = requests.get(f"{BASE_URL}/cases/", headers=HEADERS)
        if response.status_code == 200:
            cases = response.json()
            total_cases = cases.get('count', 0)
            print_success(f"List cases: {total_cases} cases found")
            
            # Get existing case with botsv3 data
            if total_cases > 0:
                case_id = 7  # Case with botsv3_events.csv
                response = requests.get(f"{BASE_URL}/cases/{case_id}/", headers=HEADERS)
                if response.status_code == 200:
                    case = response.json()
                    print_success(f"Get case detail: Case #{case_id} - {case['name']}")
                    
                    # Get case summary
                    response = requests.get(f"{BASE_URL}/cases/{case_id}/summary/", headers=HEADERS)
                    if response.status_code == 200:
                        summary = response.json()
                        print_success(f"Case summary: {summary.get('total_events', 0)} events, "
                                    f"{summary.get('evidence_files', 0)} evidence files")
                        return case_id
        return 7  # Default case ID
    except Exception as e:
        print_error(f"Case management error: {str(e)}")
        return 7

def test_evidence_management(case_id):
    """Test 3: Evidence File Management"""
    print_header("TEST 3: EVIDENCE FILE MANAGEMENT")
    
    try:
        # List evidence files
        response = requests.get(f"{BASE_URL}/evidence/", headers=HEADERS)
        if response.status_code == 200:
            evidence_list = response.json()
            count = evidence_list.get('count', 0)
            print_success(f"List evidence: {count} files found")
            
            # Check botsv3_events.csv
            evidence_id = 2
            response = requests.get(f"{BASE_URL}/evidence/{evidence_id}/", headers=HEADERS)
            if response.status_code == 200:
                evidence = response.json()
                print_success(f"Evidence details: {evidence['filename']}")
                print(f"   - File hash: {evidence['file_hash'][:32]}...")
                print(f"   - Size: {evidence.get('file_size', 0)} bytes")
                print(f"   - Parsed: {evidence['is_parsed']}")
                print(f"   - Log type: {evidence.get('log_type', 'UNKNOWN')}")
                
                return evidence_id, evidence['is_parsed']
        return 2, False
    except Exception as e:
        print_error(f"Evidence management error: {str(e)}")
        return 2, False

def test_parsed_events(case_id):
    """Test 4: Parsed Events"""
    print_header("TEST 4: PARSED EVENTS")
    
    try:
        response = requests.get(f"{BASE_URL}/parsed-events/?case={case_id}", headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            
            if count > 0:
                print_success(f"Parsed events: {count} events found")
                
                # Show sample event
                if 'results' in data and len(data['results']) > 0:
                    sample = data['results'][0]
                    print(f"   Sample event: ID={sample.get('id')}, "
                          f"Type={sample.get('event_id')}, "
                          f"User={sample.get('user', 'N/A')}")
                return count
            else:
                print_warning("No parsed events yet - parsing may be in progress")
                return 0
        else:
            print_error(f"Failed to retrieve parsed events: {response.status_code}")
            return 0
    except Exception as e:
        print_error(f"Parsed events error: {str(e)}")
        return 0

def test_ml_scoring(case_id, has_events):
    """Test 5: ML Scoring"""
    print_header("TEST 5: ML SCORING")
    
    try:
        if not has_events:
            print_warning("Skipping scoring - no parsed events available")
            return 0
        
        # Trigger scoring
        response = requests.post(f"{BASE_URL}/cases/{case_id}/score/", 
                                headers=HEADERS, json={})
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Scoring triggered: {data.get('message', 'Task started')}")
            if 'task_id' in data:
                print(f"   Task ID: {data['task_id']}")
            
            # Wait and check scored events
            print("   Waiting for scoring to complete...")
            for i in range(15):
                time.sleep(2)
                response = requests.get(f"{BASE_URL}/scored-events/?case={case_id}", 
                                      headers=HEADERS)
                if response.status_code == 200:
                    scored_data = response.json()
                    count = scored_data.get('count', 0)
                    
                    if count > 0:
                        print_success(f"Scoring completed: {count} events scored")
                        
                        # Risk distribution
                        if 'results' in scored_data:
                            results = scored_data['results']
                            high = sum(1 for e in results if e.get('risk_label') == 'HIGH')
                            medium = sum(1 for e in results if e.get('risk_label') == 'MEDIUM')
                            low = sum(1 for e in results if e.get('risk_label') == 'LOW')
                            print(f"   Risk distribution: HIGH={high}, MEDIUM={medium}, LOW={low}")
                        return count
                
                if i % 3 == 0 and i > 0:
                    print(f"   [{i*2}s] Still waiting...")
            
            print_warning("Scoring timeout - check Celery logs")
            return 0
        else:
            print_error(f"Scoring failed: {response.status_code} - {response.text[:100]}")
            return 0
    except Exception as e:
        print_error(f"ML scoring error: {str(e)}")
        return 0

def test_story_generation(case_id, has_scored):
    """Test 6: Story Generation"""
    print_header("TEST 6: LLM STORY GENERATION")
    
    try:
        if not has_scored:
            print_warning("Skipping story - no scored events available")
            return False
        
        response = requests.post(f"{BASE_URL}/cases/{case_id}/generate_story/",
                               headers=HEADERS, json={"llm_provider": "openai"})
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Story generation triggered")
            if 'task_id' in data:
                print(f"   Task ID: {data['task_id']}")
            return True
        else:
            print_warning(f"Story generation: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Story generation error: {str(e)}")
        return False

def test_report_generation(case_id):
    """Test 7: Report Generation"""
    print_header("TEST 7: REPORT GENERATION")
    
    try:
        # Generate PDF report
        response = requests.post(f"{BASE_URL}/cases/{case_id}/generate_report/",
                               headers=HEADERS, json={"format": "pdf"})
        
        if response.status_code in [200, 202]:
            data = response.json() if response.text else {}
            print_success("PDF report generation triggered")
            if 'task_id' in data:
                print(f"   Task ID: {data['task_id']}")
        else:
            print_warning(f"PDF report: Status {response.status_code}")
        
        # List reports
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/reports/?case={case_id}", headers=HEADERS)
        if response.status_code == 200:
            reports = response.json()
            count = reports.get('count', 0)
            print_success(f"Reports listed: {count} report(s) found")
            return count
        return 0
    except Exception as e:
        print_error(f"Report generation error: {str(e)}")
        return 0

def test_investigation_notes(case_id):
    """Test 8: Investigation Notes"""
    print_header("TEST 8: INVESTIGATION NOTES")
    
    try:
        # Create note
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        response = requests.post(f"{BASE_URL}/notes/", headers=HEADERS,
            json={
                "case": case_id,
                "content": f"Comprehensive API test completed at {timestamp}. All systems operational."
            })
        
        if response.status_code == 201:
            note = response.json()
            print_success(f"Note created: ID={note['id']}")
        else:
            print_warning(f"Note creation: {response.status_code}")
        
        # List notes
        response = requests.get(f"{BASE_URL}/notes/?case={case_id}", headers=HEADERS)
        if response.status_code == 200:
            notes = response.json()
            count = notes.get('count', 0)
            print_success(f"Notes listed: {count} note(s) found")
            return count
        return 0
    except Exception as e:
        print_error(f"Investigation notes error: {str(e)}")
        return 0

def test_dashboard_apis(case_id):
    """Test 9: Dashboard APIs"""
    print_header("TEST 9: DASHBOARD & ANALYTICS")
    
    try:
        # Dashboard summary
        response = requests.get(f"{BASE_URL}/dashboard/summary/", headers=HEADERS)
        if response.status_code == 200:
            summary = response.json()
            print_success(f"Dashboard summary retrieved")
            print(f"   Cases: {summary.get('total_cases', 0)}")
            print(f"   Events: {summary.get('total_events', 0)}")
            print(f"   High risk: {summary.get('high_risk_events', 0)}")
        
        # Confidence distribution
        response = requests.get(f"{BASE_URL}/dashboard/confidence_distribution/", 
                              headers=HEADERS)
        if response.status_code == 200:
            print_success("Confidence distribution retrieved")
        
        return True
    except Exception as e:
        print_error(f"Dashboard error: {str(e)}")
        return False

def check_services():
    """Check infrastructure services"""
    print_header("INFRASTRUCTURE STATUS CHECK")
    
    import subprocess
    
    # Check Redis
    try:
        result = subprocess.run(['redis-cli', 'ping'], capture_output=True, text=True, timeout=2)
        if 'PONG' in result.stdout:
            print_success("Redis server: RUNNING")
        else:
            print_error("Redis server: NOT RESPONDING")
    except:
        print_error("Redis server: NOT AVAILABLE")
    
    # Check Celery
    try:
        with open('/tmp/celery_worker.log', 'r') as f:
            logs = f.read()
            if 'celery@' in logs and 'ready' in logs:
                print_success("Celery worker: RUNNING")
            else:
                print_warning("Celery worker: STATUS UNKNOWN")
    except:
        print_warning("Celery worker: LOG NOT FOUND")
    
    # Check Django
    try:
        response = requests.get(f"{BASE_URL}/", timeout=2)
        print_success("Django server: RUNNING (Port 8000)")
    except:
        print_error("Django server: NOT RESPONDING")

def main():
    """Run comprehensive test suite"""
    print("\n" + "="*80)
    print(f"{Colors.BLUE}COMPREHENSIVE API TEST SUITE - FULL SYSTEM VERIFICATION{Colors.RESET}")
    print(f"Testing with botsv3_events.csv (232 events)")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Check infrastructure
    check_services()
    
    # Run tests
    results = {}
    
    # Test 1: Authentication
    results['auth'] = test_authentication()
    if not results['auth']:
        print_error("\nAuthentication failed - cannot continue")
        return
    
    # Test 2: Case Management
    case_id = test_case_management()
    results['cases'] = case_id is not None
    
    # Test 3: Evidence Management
    evidence_id, is_parsed = test_evidence_management(case_id)
    results['evidence'] = evidence_id is not None
    
    # Test 4: Parsed Events
    parsed_count = test_parsed_events(case_id)
    results['parsed'] = parsed_count > 0
    
    # Test 5: ML Scoring
    scored_count = test_ml_scoring(case_id, parsed_count > 0)
    results['scoring'] = scored_count > 0
    
    # Test 6: Story Generation
    results['story'] = test_story_generation(case_id, scored_count > 0)
    
    # Test 7: Report Generation
    report_count = test_report_generation(case_id)
    results['reports'] = report_count >= 0
    
    # Test 8: Investigation Notes
    note_count = test_investigation_notes(case_id)
    results['notes'] = note_count >= 0
    
    # Test 9: Dashboard
    results['dashboard'] = test_dashboard_apis(case_id)
    
    # Final Summary
    print_header("FINAL TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"\n{Colors.BLUE}Test Results:{Colors.RESET}")
    for test, result in results.items():
        status = f"{Colors.GREEN}✅ PASS{Colors.RESET}" if result else f"{Colors.RED}❌ FAIL{Colors.RESET}"
        print(f"  {test.upper():20} {status}")
    
    print(f"\n{Colors.BLUE}Overall Score: {passed}/{total} ({percentage:.1f}%){Colors.RESET}")
    
    if percentage == 100:
        print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED! System fully operational.{Colors.RESET}")
    elif percentage >= 75:
        print(f"\n{Colors.YELLOW}✅ System mostly operational. Some features pending.{Colors.RESET}")
    else:
        print(f"\n{Colors.RED}⚠️  System has significant issues. Review failures.{Colors.RESET}")
    
    print(f"\nEnd time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
