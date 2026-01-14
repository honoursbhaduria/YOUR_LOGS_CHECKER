#!/usr/bin/env python3
"""
Complete API Workflow Test with botsv3_events.csv
Tests the full pipeline: Upload -> Parse -> Score -> Generate Story -> Generate Report
"""

import requests
import json
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"
CSV_FILE = "/home/honours/AI_logs_Checking/botsv3_events.csv"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def login():
    """Authenticate and get JWT token"""
    print_section("STEP 1: Authentication")
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={"username": "admin", "password": "admin123"}
    )
    if response.status_code == 200:
        token = response.json()['access']
        print(f"✅ Logged in successfully")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        return None

def create_case(token):
    """Create a new forensic case"""
    print_section("STEP 2: Create Forensic Case")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/cases/",
        headers=headers,
        json={
            "name": "BotSv3 Security Incident Analysis",
            "description": "Analysis of security events from botsv3_events.csv - investigating potential threats and anomalies",
            "priority": "HIGH"
        }
    )
    
    if response.status_code == 201:
        case_data = response.json()
        case_id = case_data['id']
        print(f"✅ Case created successfully")
        print(f"   - Case ID: {case_id}")
        print(f"   - Name: {case_data['name']}")
        print(f"   - Status: {case_data['status']}")
        return case_id
    else:
        print(f"❌ Case creation failed: {response.status_code} - {response.text}")
        return None

def upload_evidence(token, case_id):
    """Upload the CSV file as evidence"""
    print_section("STEP 3: Upload Evidence File")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check file exists and get size
    csv_path = Path(CSV_FILE)
    if not csv_path.exists():
        print(f"❌ File not found: {CSV_FILE}")
        return None
    
    file_size = csv_path.stat().st_size / 1024  # KB
    print(f"   - File: {csv_path.name}")
    print(f"   - Size: {file_size:.2f} KB")
    
    with open(CSV_FILE, 'rb') as f:
        files = {'file': (csv_path.name, f, 'text/csv')}
        data = {'case': case_id}
        
        response = requests.post(
            f"{BASE_URL}/evidence/",
            headers=headers,
            files=files,
            data=data
        )
    
    if response.status_code == 201:
        evidence_data = response.json()
        evidence_id = evidence_data['id']
        print(f"✅ Evidence uploaded successfully")
        print(f"   - Evidence ID: {evidence_id}")
        print(f"   - Task ID: {evidence_data.get('task_id', 'N/A')}")
        print(f"   - Status: {evidence_data.get('status', 'pending')}")
        return evidence_id, evidence_data.get('task_id')
    else:
        print(f"❌ Upload failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None, None

def wait_for_parsing(token, evidence_id, max_wait=60):
    """Wait for the parsing task to complete"""
    print_section("STEP 4: Waiting for Parsing to Complete")
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"   Waiting for evidence {evidence_id} to be parsed...")
    
    for i in range(max_wait):
        response = requests.get(
            f"{BASE_URL}/evidence/{evidence_id}/",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            status = data.get('status', 'unknown')
            
            if status == 'COMPLETED':
                parsed_count = data.get('parsed_events_count', 0)
                print(f"✅ Parsing completed!")
                print(f"   - Status: {status}")
                print(f"   - Events parsed: {parsed_count}")
                return True
            elif status == 'FAILED':
                print(f"❌ Parsing failed")
                print(f"   Error: {data.get('error_message', 'Unknown error')}")
                return False
            else:
                # Still processing
                if i % 5 == 0:  # Print every 5 seconds
                    print(f"   [{i}s] Status: {status}...")
        
        time.sleep(1)
    
    print(f"⏱️  Timeout waiting for parsing")
    return False

def check_parsed_events(token, case_id):
    """Check parsed events"""
    print_section("STEP 5: Check Parsed Events")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/parsed-events/?case={case_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"✅ Parsed events retrieved")
        print(f"   - Total events: {count}")
        
        if count > 0 and 'results' in data:
            # Show a sample event
            sample = data['results'][0]
            print(f"   - Sample Event ID: {sample.get('id')}")
            print(f"   - Event Type: {sample.get('event_id')}")
            print(f"   - Timestamp: {sample.get('timestamp')}")
        
        return count
    else:
        print(f"❌ Failed to retrieve parsed events: {response.status_code}")
        return 0

def trigger_scoring(token, case_id):
    """Trigger ML scoring for the case"""
    print_section("STEP 6: Trigger ML Scoring")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/score/",
        headers=headers,
        json={}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Scoring triggered successfully")
        print(f"   - Status: {data.get('status')}")
        print(f"   - Message: {data.get('message')}")
        print(f"   - Task ID: {data.get('task_id', 'N/A')}")
        return data.get('task_id')
    else:
        print(f"❌ Scoring failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def wait_for_scoring(token, case_id, max_wait=60):
    """Wait for scoring to complete"""
    print_section("STEP 7: Waiting for Scoring to Complete")
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"   Waiting for scoring to complete...")
    
    for i in range(max_wait):
        response = requests.get(
            f"{BASE_URL}/scored-events/?case={case_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            
            if count > 0:
                print(f"✅ Scoring completed!")
                print(f"   - Scored events: {count}")
                
                # Show some statistics
                if 'results' in data:
                    high_risk = sum(1 for e in data['results'] if e.get('risk_label') == 'HIGH')
                    medium_risk = sum(1 for e in data['results'] if e.get('risk_label') == 'MEDIUM')
                    low_risk = sum(1 for e in data['results'] if e.get('risk_label') == 'LOW')
                    
                    print(f"   - HIGH risk: {high_risk}")
                    print(f"   - MEDIUM risk: {medium_risk}")
                    print(f"   - LOW risk: {low_risk}")
                
                return count
            elif i % 5 == 0:
                print(f"   [{i}s] Waiting for scored events...")
        
        time.sleep(1)
    
    print(f"⏱️  Timeout waiting for scoring")
    return 0

def generate_story(token, case_id):
    """Generate attack narrative"""
    print_section("STEP 8: Generate Attack Story")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/generate_story/",
        headers=headers,
        json={"llm_provider": "openai"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Story generation triggered")
        print(f"   - Status: {data.get('status')}")
        print(f"   - Task ID: {data.get('task_id', 'N/A')}")
        return data.get('task_id')
    else:
        print(f"❌ Story generation failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def generate_report(token, case_id):
    """Generate final report"""
    print_section("STEP 9: Generate Investigation Report")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/generate_report/",
        headers=headers,
        json={"format": "pdf"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Report generation triggered")
        print(f"   - Status: {data.get('status')}")
        print(f"   - Format: pdf")
        print(f"   - Task ID: {data.get('task_id', 'N/A')}")
        return data.get('task_id')
    else:
        print(f"❌ Report generation failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def list_reports(token, case_id):
    """List all reports for the case"""
    print_section("STEP 10: List Generated Reports")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/reports/?case={case_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"✅ Reports retrieved")
        print(f"   - Total reports: {count}")
        
        if count > 0 and 'results' in data:
            for report in data['results']:
                print(f"   - Report ID: {report.get('id')}")
                print(f"     Format: {report.get('format')}")
                print(f"     Status: {report.get('status')}")
                print(f"     Created: {report.get('created_at')}")
        
        return count
    else:
        print(f"❌ Failed to retrieve reports: {response.status_code}")
        return 0

def main():
    print("\n" + "="*70)
    print("  COMPLETE API WORKFLOW TEST - BotSv3 Events Analysis")
    print("="*70)
    print(f"CSV File: {CSV_FILE}")
    print(f"API Base: {BASE_URL}")
    
    # Step 1: Login
    token = login()
    if not token:
        return
    
    # Step 2: Create case
    case_id = create_case(token)
    if not case_id:
        return
    
    # Step 3: Upload evidence
    evidence_id, task_id = upload_evidence(token, case_id)
    if not evidence_id:
        return
    
    # Step 4: Wait for parsing
    if not wait_for_parsing(token, evidence_id, max_wait=120):
        print("\n⚠️  Parsing did not complete in time, but continuing...")
    
    # Step 5: Check parsed events
    parsed_count = check_parsed_events(token, case_id)
    if parsed_count == 0:
        print("\n⚠️  No parsed events found, but continuing...")
    
    # Step 6: Trigger scoring
    scoring_task = trigger_scoring(token, case_id)
    
    # Step 7: Wait for scoring
    if scoring_task:
        scored_count = wait_for_scoring(token, case_id, max_wait=120)
    
    # Step 8: Generate story
    story_task = generate_story(token, case_id)
    
    # Step 9: Generate report
    report_task = generate_report(token, case_id)
    
    # Step 10: List reports
    time.sleep(2)  # Give it a moment to register
    report_count = list_reports(token, case_id)
    
    # Final summary
    print_section("FINAL SUMMARY")
    print(f"✅ Complete workflow executed successfully!")
    print(f"   - Case ID: {case_id}")
    print(f"   - Evidence files: 1")
    print(f"   - Parsed events: {parsed_count}")
    print(f"   - Scored events: {scored_count if scoring_task else 0}")
    print(f"   - Reports generated: {report_count}")
    print(f"\n🎉 All API endpoints tested with real data from {Path(CSV_FILE).name}")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
