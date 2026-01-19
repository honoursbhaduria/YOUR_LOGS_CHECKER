#!/usr/bin/env python3
"""
Test script for report generation with AI summary
"""
import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000/api"

def main():
    # 1. Login
    print("1. Logging in...")
    r = requests.post(f"{BASE_URL}/auth/login/", json={
        "username": "testlocal",
        "password": "TestPass123!"
    })
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return
    token = r.json()["access"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"   Token: {token[:50]}...")
    
    # 2. Create a case
    print("\n2. Creating test case...")
    r = requests.post(f"{BASE_URL}/cases/", headers=headers, json={
        "name": "AI Report Test Case",
        "description": "Testing AI-powered report generation"
    })
    if r.status_code not in [200, 201]:
        print(f"Case creation failed: {r.text}")
        return
    case = r.json()
    case_id = case["id"]
    print(f"   Case created: ID={case_id}, Name={case['name']}")
    
    # 3. Upload sample evidence file
    print("\n3. Uploading sample evidence...")
    sample_csv = os.path.join(os.path.dirname(__file__), "sample_data", "security_logs_sample.csv")
    if not os.path.exists(sample_csv):
        # Create minimal test data
        sample_csv = "/tmp/test_logs.csv"
        with open(sample_csv, "w") as f:
            f.write("timestamp,event_type,user,host,message\n")
            f.write("2026-01-19 10:00:00,LOGIN_SUCCESS,admin,server1,User admin logged in successfully\n")
            f.write("2026-01-19 10:05:00,FILE_ACCESS,admin,server1,Accessed sensitive file /etc/passwd\n")
            f.write("2026-01-19 10:10:00,PRIVILEGE_ESCALATION,admin,server1,Attempted sudo without password\n")
            f.write("2026-01-19 10:15:00,NETWORK_CONNECTION,admin,server1,Connected to external IP 192.168.1.100\n")
            f.write("2026-01-19 10:20:00,LOGIN_FAILED,root,server1,Failed login attempt for root\n")
    
    with open(sample_csv, "rb") as f:
        r = requests.post(f"{BASE_URL}/evidence/", headers=headers, 
            data={"case": case_id},
            files={"file": ("test_logs.csv", f, "text/csv")})
    if r.status_code not in [200, 201]:
        print(f"Upload failed: {r.text}")
        return
    evidence = r.json()
    evidence_id = evidence["id"]
    print(f"   Evidence uploaded: ID={evidence_id}")
    
    # 4. Parse the evidence
    print("\n4. Parsing evidence...")
    r = requests.post(f"{BASE_URL}/evidence/{evidence_id}/parse/", headers=headers)
    print(f"   Parse response: {r.status_code} - {r.text[:100]}")
    
    # 5. Score events
    print("\n5. Scoring events...")
    r = requests.post(f"{BASE_URL}/scoring/score_case/", headers=headers, json={"case_id": case_id})
    print(f"   Score response: {r.status_code} - {r.text[:100]}")
    
    # 6. Get scored events count
    print("\n6. Checking scored events...")
    r = requests.get(f"{BASE_URL}/scored-events/?case={case_id}", headers=headers)
    events = r.json()
    count = events.get("count", len(events.get("results", [])))
    print(f"   Found {count} scored events")
    
    # 7. Generate LaTeX preview with AI summary
    print("\n7. Generating LaTeX preview with AI summary...")
    r = requests.post(f"{BASE_URL}/report/preview_latex/", headers=headers, json={"case_id": case_id})
    if r.status_code == 200:
        data = r.json()
        latex = data.get("latex_source", "")
        print(f"   LaTeX source length: {len(latex)} characters")
        
        # Check for AI summary in LaTeX
        if "Executive Summary" in latex:
            print("   ✓ Executive Summary section found")
        if "Key Findings" in latex or "key findings" in latex.lower():
            print("   ✓ Key Findings section found")
        if "Recommendations" in latex or "recommendations" in latex.lower():
            print("   ✓ Recommendations section found")
            
        # Save LaTeX to file for inspection
        with open("/tmp/test_report.tex", "w") as f:
            f.write(latex)
        print(f"   LaTeX saved to /tmp/test_report.tex")
    else:
        print(f"   LaTeX preview failed: {r.text}")
    
    # 8. Test PDF compilation
    print("\n8. Testing PDF/TEX download...")
    r = requests.post(f"{BASE_URL}/report/compile_custom_latex/", headers=headers, json={
        "latex_source": latex if 'latex' in dir() else "\\documentclass{article}\\begin{document}Test\\end{document}",
        "filename": "test_report.pdf",
        "fallback_to_tex": True
    })
    content_type = r.headers.get("content-type", "")
    print(f"   Response: {r.status_code}, Content-Type: {content_type}")
    if "pdf" in content_type:
        print("   ✓ PDF generated successfully!")
        with open("/tmp/test_report.pdf", "wb") as f:
            f.write(r.content)
        print(f"   PDF saved to /tmp/test_report.pdf")
    elif "tex" in content_type:
        print("   ⚠ Got .tex file (pdflatex not available)")
        with open("/tmp/test_report_fallback.tex", "wb") as f:
            f.write(r.content)
        print(f"   TEX saved to /tmp/test_report_fallback.tex")
    else:
        print(f"   Error: {r.text[:200]}")
    
    print("\n" + "="*50)
    print("TEST COMPLETE!")
    print("="*50)

if __name__ == "__main__":
    main()
