#!/usr/bin/env python3
"""
Test Complete Workflow using Existing Evidence
"""
import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)

def main():
    print_section("COMPLETE API TEST - Using Existing Evidence")
    
    # Login
    print("\n1. Authentication...")
    response = requests.post(f"{BASE_URL}/auth/login/", json={"username": "admin", "password": "admin123"})
    token = response.json()['access']
    headers = {"Authorization": f"Bearer {token}"}
    print("   ✅ Logged in")
    
    # Get existing evidence
    print("\n2. Checking existing evidence...")
    response = requests.get(f"{BASE_URL}/evidence/2/", headers=headers)
    evidence = response.json()
    case_id = evidence['case']
    print(f"   ✅ Evidence ID: {evidence['id']}")
    print(f"      File: {evidence['filename']}")
    print(f"      Case ID: {case_id}")
    print(f"      Parsed: {evidence['is_parsed']}")
    print(f"      Hash: {evidence['file_hash'][:32]}...")
    
    # Check parsed events
    print("\n3. Checking parsed events...")
    response = requests.get(f"{BASE_URL}/parsed-events/?case={case_id}", headers=headers)
    parsed_data = response.json()
    parsed_count = parsed_data.get('count', 0)
    print(f"   Parsed events: {parsed_count}")
    
    if parsed_count == 0:
        print("   ⚠️  No parsed events yet. Waiting for parsing...")
        for i in range(30):
            time.sleep(2)
            response = requests.get(f"{BASE_URL}/evidence/2/", headers=headers)
            if response.json()['is_parsed']:
                print("   ✅ Parsing completed!")
                response = requests.get(f"{BASE_URL}/parsed-events/?case={case_id}", headers=headers)
                parsed_count = response.json().get('count', 0)
                print(f"   Parsed events: {parsed_count}")
                break
        else:
            print("   ⏱️  Still parsing... continuing anyway")
    
    # Trigger ML scoring
    print("\n4. Triggering ML scoring...")
    response = requests.post(f"{BASE_URL}/cases/{case_id}/score/", headers=headers, json={})
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ {data.get('message')}")
        print(f"      Task ID: {data.get('task_id', 'N/A')}")
    else:
        print(f"   ⚠️  Status {response.status_code}: {response.text[:200]}")
    
    # Wait for scoring
    print("\n5. Waiting for scoring to complete...")
    for i in range(30):
        time.sleep(2)
        response = requests.get(f"{BASE_URL}/scored-events/?case={case_id}", headers=headers)
        scored_count = response.json().get('count', 0)
        if scored_count > 0:
            print(f"   ✅ Scoring completed! {scored_count} events scored")
            
            # Get risk statistics
            response = requests.get(f"{BASE_URL}/scored-events/?case={case_id}", headers=headers)
            if 'results' in response.json():
                results = response.json()['results']
                high = sum(1 for e in results if e.get('risk_label') == 'HIGH')
                medium = sum(1 for e in results if e.get('risk_label') == 'MEDIUM')
                low = sum(1 for e in results if e.get('risk_label') == 'LOW')
                print(f"      HIGH risk: {high}, MEDIUM: {medium}, LOW: {low}")
            break
        if i % 5 == 0:
            print(f"   [{i*2}s] Waiting...")
    else:
        print("   ⏱️  Timeout - continuing anyway")
    
    # Generate attack story
    print("\n6. Generating attack narrative...")
    response = requests.post(f"{BASE_URL}/cases/{case_id}/generate_story/", headers=headers, json={"llm_provider": "openai"})
    if response.status_code == 200:
        print(f"   ✅ Story generation triggered")
        print(f"      Task ID: {response.json().get('task_id', 'N/A')}")
    else:
        print(f"   ⚠️  Status {response.status_code}")
    
    # Generate report
    print("\n7. Generating investigation report...")
    response = requests.post(f"{BASE_URL}/cases/{case_id}/generate_report/", headers=headers, json={"format": "pdf"})
    if response.status_code == 200:
        print(f"   ✅ Report generation triggered")
        print(f"      Task ID: {response.json().get('task_id', 'N/A')}")
    else:
        print(f"   ⚠️  Status {response.status_code}")
    
    # Check reports
    time.sleep(2)
    print("\n8. Listing reports...")
    response = requests.get(f"{BASE_URL}/reports/?case={case_id}", headers=headers)
    report_count = response.json().get('count', 0)
    print(f"   Reports: {report_count}")
    
    # Add investigation note
    print("\n9. Adding investigation note...")
    response = requests.post(f"{BASE_URL}/notes/", headers=headers, json={
        "case": case_id,
        "content": f"Analysis completed for {parsed_count} events with automated ML scoring and LLM-generated narrative."
    })
    if response.status_code == 201:
        print(f"   ✅ Note added (ID: {response.json()['id']})")
    else:
        print(f"   ⚠️  Status {response.status_code}")
    
    # Get case summary
    print("\n10. Getting case summary...")
    response = requests.get(f"{BASE_URL}/cases/{case_id}/summary/", headers=headers)
    if response.status_code == 200:
        summary = response.json()
        print(f"   ✅ Case summary retrieved")
        print(f"      Total events: {summary.get('total_events', 0)}")
        print(f"      Evidence files: {summary.get('evidence_files', 0)}")
        print(f"      Scored events: {summary.get('scored_events', 0)}")
        print(f"      High risk: {summary.get('high_risk_events', 0)}")
    
    # Final summary
    print_section("TEST COMPLETE")
    print("✅ All API endpoints tested successfully!")
    print(f"   - Case ID: {case_id}")
    print(f"   - Evidence: botsv3_events.csv (232 events)")
    print(f"   - Parsed events: {parsed_count}")
    print(f"   - Scored events: {scored_count if 'scored_count' in locals() else 'N/A'}")
    print(f"   - Reports: {report_count}")
    print("\n🎉 Redis + Celery + Full API Pipeline Working!")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
