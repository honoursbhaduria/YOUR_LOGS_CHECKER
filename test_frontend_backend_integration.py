#!/usr/bin/env python3
"""
Frontend-Backend Integration Test
Simulates actual frontend workflows to verify complete integration
"""
import requests
import json
import time
import os

BASE_URL = "http://127.0.0.1:8000/api"

class FrontendBackendTest:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.case_id = None
        self.evidence_id = None
        self.results = {'passed': 0, 'failed': 0, 'warnings': 0}
    
    def log(self, status, message):
        symbols = {'OK': '  OK', 'FAIL': 'FAIL', 'WARN': 'WARN'}
        print(f"{symbols.get(status, status)} {message}")
    
    def test(self, name, func):
        """Run a test function and track results"""
        try:
            result = func()
            if result:
                self.results['passed'] += 1
                self.log('OK', name)
                return True
            else:
                self.results['failed'] += 1
                self.log('FAIL', name)
                return False
        except Exception as e:
            self.results['failed'] += 1
            self.log('FAIL', f"{name} - {str(e)}")
            return False
    
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    # Test: Login Flow
    def test_login(self):
        response = requests.post(f"{BASE_URL}/auth/login/", json={
            "username": "testlocal",
            "password": "TestPass123!"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access')
            return self.token is not None
        return False
    
    def test_get_current_user(self):
        response = requests.get(f"{BASE_URL}/auth/me/", headers=self.headers())
        if response.status_code == 200:
            data = response.json()
            self.user_id = data.get('id')
            return True
        return False
    
    # Test: Case Management Flow
    def test_get_cases_list(self):
        response = requests.get(f"{BASE_URL}/cases/", headers=self.headers())
        return response.status_code == 200
    
    def test_create_case(self):
        response = requests.post(f"{BASE_URL}/cases/", 
            headers=self.headers(),
            json={
                "name": "Frontend Integration Test",
                "description": "Testing frontend-backend integration",
                "status": "OPEN"
            })
        if response.status_code == 201:
            self.case_id = response.json().get('id')
            return self.case_id is not None
        return False
    
    def test_get_case_detail(self):
        if not self.case_id:
            return False
        response = requests.get(f"{BASE_URL}/cases/{self.case_id}/", headers=self.headers())
        return response.status_code == 200
    
    def test_get_case_summary(self):
        if not self.case_id:
            return False
        response = requests.get(f"{BASE_URL}/cases/{self.case_id}/summary/", headers=self.headers())
        return response.status_code == 200
    
    def test_update_case(self):
        if not self.case_id:
            return False
        response = requests.patch(f"{BASE_URL}/cases/{self.case_id}/",
            headers=self.headers(),
            json={"description": "Updated via integration test"})
        return response.status_code == 200
    
    # Test: Evidence Upload Flow
    def test_upload_evidence(self):
        if not self.case_id:
            return False
        
        sample_file = "/home/honours/YOUR_LOGS_CHECKER/sample_data/security_logs_sample.csv"
        if not os.path.exists(sample_file):
            return False
        
        with open(sample_file, 'rb') as f:
            files = {'file': ('security_logs.csv', f, 'text/csv')}
            data = {'case': self.case_id}
            response = requests.post(f"{BASE_URL}/evidence/",
                headers=self.headers(),
                data=data,
                files=files)
        
        if response.status_code == 201:
            self.evidence_id = response.json().get('id')
            return self.evidence_id is not None
        return False
    
    def test_get_evidence_list(self):
        response = requests.get(f"{BASE_URL}/evidence/",
            headers=self.headers(),
            params={'case': self.case_id})
        return response.status_code == 200
    
    def test_get_evidence_hash(self):
        if not self.evidence_id:
            return False
        response = requests.get(f"{BASE_URL}/evidence/{self.evidence_id}/hash/", headers=self.headers())
        return response.status_code == 200
    
    # Test: Event Analysis Flow
    def test_get_parsed_events(self):
        time.sleep(2)  # Wait for parsing
        response = requests.get(f"{BASE_URL}/parsed-events/",
            headers=self.headers(),
            params={'case': self.case_id})
        data = response.json()
        count = data.get('count', len(data) if isinstance(data, list) else 0)
        if count > 0:
            return True
        else:
            self.results['warnings'] += 1
            self.log('WARN', f"No parsed events found (expected >0)")
            return False
    
    def test_get_scored_events(self):
        response = requests.get(f"{BASE_URL}/scored-events/", headers=self.headers())
        data = response.json()
        count = data.get('count', len(data) if isinstance(data, list) else 0)
        if count > 0:
            return True
        else:
            self.results['warnings'] += 1
            self.log('WARN', f"No scored events found (expected >0 after auto-scoring)")
            return False
    
    # Test: Scoring Flow
    def test_run_scoring(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/scoring/run/",
            headers=self.headers(),
            json={'case_id': self.case_id})
        return response.status_code == 200
    
    def test_recalculate_scoring(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/scoring/recalculate/",
            headers=self.headers(),
            json={'case_id': self.case_id})
        return response.status_code == 200
    
    # Test: Filter Flow
    def test_apply_filter(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/filter/apply/",
            headers=self.headers(),
            json={'case_id': self.case_id, 'threshold': 0.5})
        return response.status_code == 200
    
    def test_get_filter_state(self):
        if not self.case_id:
            return False
        response = requests.get(f"{BASE_URL}/filter/state/",
            headers=self.headers(),
            params={'case_id': self.case_id})
        return response.status_code == 200
    
    def test_reset_filter(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/filter/reset/",
            headers=self.headers(),
            json={'case_id': self.case_id})
        return response.status_code == 200
    
    # Test: Story Generation Flow
    def test_get_stories(self):
        response = requests.get(f"{BASE_URL}/story/",
            headers=self.headers(),
            params={'case': self.case_id})
        return response.status_code == 200
    
    def test_generate_story(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/story/generate/",
            headers=self.headers(),
            json={'case_id': self.case_id})
        return response.status_code == 200
    
    # Test: Report Generation Flow
    def test_get_reports(self):
        response = requests.get(f"{BASE_URL}/report/",
            headers=self.headers(),
            params={'case': self.case_id})
        return response.status_code == 200
    
    def test_report_capabilities(self):
        response = requests.get(f"{BASE_URL}/report/capabilities/", headers=self.headers())
        if response.status_code == 200:
            data = response.json()
            has_pdflatex = data.get('has_pdflatex', False)
            has_online_api = data.get('has_online_compilation', False)
            if not has_pdflatex and not has_online_api:
                self.log('WARN', "No LaTeX compilation available (neither local nor online)")
            return True
        return False
    
    def test_preview_latex(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/report/preview_latex/",
            headers=self.headers(),
            json={'case_id': self.case_id})
        if response.status_code == 200:
            latex = response.json().get('latex_source', '')
            if len(latex) > 1000:
                return True
            else:
                self.log('WARN', f"LaTeX source too short ({len(latex)} chars)")
                return False
        return False
    
    def test_ai_analysis(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/report/ai_analysis/",
            headers=self.headers(),
            json={'case_id': self.case_id})
        return response.status_code == 200
    
    # Test: Dashboard Flow
    def test_dashboard_summary(self):
        response = requests.get(f"{BASE_URL}/dashboard/summary/", headers=self.headers())
        if response.status_code == 200:
            data = response.json()
            has_data = (
                'total_cases' in data and
                'total_events' in data and
                'recent_cases' in data
            )
            return has_data
        return False
    
    def test_dashboard_timeline(self):
        if not self.case_id:
            return False
        response = requests.get(f"{BASE_URL}/dashboard/timeline/",
            headers=self.headers(),
            params={'case_id': self.case_id})
        return response.status_code == 200
    
    def test_dashboard_confidence_distribution(self):
        if not self.case_id:
            return False
        response = requests.get(f"{BASE_URL}/dashboard/confidence_distribution/",
            headers=self.headers(),
            params={'case_id': self.case_id})
        return response.status_code == 200
    
    # Test: Notes Flow
    def test_get_notes(self):
        response = requests.get(f"{BASE_URL}/notes/",
            headers=self.headers(),
            params={'case': self.case_id})
        return response.status_code == 200
    
    def test_create_note(self):
        if not self.case_id:
            return False
        response = requests.post(f"{BASE_URL}/notes/",
            headers=self.headers(),
            json={
                'case': self.case_id,
                'title': 'Test Note',
                'content': 'Integration test note'
            })
        return response.status_code == 201
    
    def run_all_tests(self):
        print("="*60)
        print("FRONTEND-BACKEND INTEGRATION TEST")
        print("="*60)
        
        print("\n[1. AUTHENTICATION FLOW]")
        self.test("Login with credentials", self.test_login)
        self.test("Get current user info", self.test_get_current_user)
        
        print("\n[2. CASE MANAGEMENT FLOW]")
        self.test("List all cases", self.test_get_cases_list)
        self.test("Create new case", self.test_create_case)
        self.test("Get case details", self.test_get_case_detail)
        self.test("Get case summary", self.test_get_case_summary)
        self.test("Update case", self.test_update_case)
        
        print("\n[3. EVIDENCE UPLOAD FLOW]")
        self.test("Upload evidence file", self.test_upload_evidence)
        self.test("List evidence files", self.test_get_evidence_list)
        self.test("Get evidence hash", self.test_get_evidence_hash)
        
        print("\n[4. EVENT ANALYSIS FLOW]")
        self.test("Get parsed events", self.test_get_parsed_events)
        self.test("Get scored events (auto-scored)", self.test_get_scored_events)
        
        print("\n[5. SCORING OPERATIONS FLOW]")
        self.test("Run ML scoring", self.test_run_scoring)
        self.test("Recalculate scores", self.test_recalculate_scoring)
        
        print("\n[6. FILTER OPERATIONS FLOW]")
        self.test("Apply confidence threshold filter", self.test_apply_filter)
        self.test("Get filter state", self.test_get_filter_state)
        self.test("Reset filters", self.test_reset_filter)
        
        print("\n[7. STORY GENERATION FLOW]")
        self.test("List attack stories", self.test_get_stories)
        self.test("Generate attack story", self.test_generate_story)
        
        print("\n[8. REPORT GENERATION FLOW]")
        self.test("List reports", self.test_get_reports)
        self.test("Check report capabilities", self.test_report_capabilities)
        self.test("Preview LaTeX report", self.test_preview_latex)
        self.test("Get AI analysis", self.test_ai_analysis)
        
        print("\n[9. DASHBOARD ANALYTICS FLOW]")
        self.test("Get dashboard summary", self.test_dashboard_summary)
        self.test("Get timeline data", self.test_dashboard_timeline)
        self.test("Get confidence distribution", self.test_dashboard_confidence_distribution)
        
        print("\n[10. NOTES MANAGEMENT FLOW]")
        self.test("List notes", self.test_get_notes)
        self.test("Create note", self.test_create_note)
        
        print("\n" + "="*60)
        print("INTEGRATION TEST RESULTS")
        print("="*60)
        print(f"Passed:   {self.results['passed']}")
        print(f"Failed:   {self.results['failed']}")
        print(f"Warnings: {self.results['warnings']}")
        print("="*60)
        
        if self.results['failed'] == 0:
            print("\nSUCCESS: All frontend workflows are working with backend!")
        else:
            print(f"\nFAILURE: {self.results['failed']} workflows failed")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = FrontendBackendTest()
    success = tester.run_all_tests()
    exit(0 if success else 1)
