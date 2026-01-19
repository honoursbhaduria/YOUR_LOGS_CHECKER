#!/usr/bin/env python3
"""
Test all API endpoints to verify they exist and respond correctly
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def get_token():
    """Login and get token"""
    response = requests.post(f"{BASE_URL}/auth/login/", json={
        "username": "testlocal",
        "password": "TestPass123!"
    })
    if response.status_code == 200:
        return response.json()['access']
    return None

def test_endpoint(method, endpoint, headers, data=None, files=None, params=None, expected_status=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params)
        elif method == 'POST':
            if files:
                response = requests.post(url, headers=headers, data=data, files=files)
            else:
                response = requests.post(url, headers=headers, json=data)
        elif method == 'PATCH':
            response = requests.patch(url, headers=headers, json=data)
        elif method == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        
        status = response.status_code
        if expected_status and status != expected_status:
            print(f"  FAIL {method} {endpoint} - Expected {expected_status}, got {status}")
            return False
        elif status >= 400:
            print(f"  ERROR {method} {endpoint} - {status}: {response.text[:100]}")
            return False
        else:
            print(f"  OK {method} {endpoint} - {status}")
            return True
    except Exception as e:
        print(f"  EXCEPTION {method} {endpoint} - {str(e)}")
        return False

def main():
    print("="*60)
    print("API ENDPOINT TEST")
    print("="*60)
    
    token = get_token()
    if not token:
        print("Failed to login!")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    results = {
        'passed': 0,
        'failed': 0
    }
    
    # Auth endpoints
    print("\n[AUTH ENDPOINTS]")
    if test_endpoint('POST', '/auth/login/', {}, {'username': 'testlocal', 'password': 'TestPass123!'}):
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    if test_endpoint('GET', '/auth/me/', headers):
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # Case endpoints
    print("\n[CASE ENDPOINTS]")
    endpoints = [
        ('GET', '/cases/'),
        ('POST', '/cases/', {'name': 'Test Case', 'description': 'Test'}),
    ]
    
    for method, endpoint, *data in endpoints:
        if test_endpoint(method, endpoint, headers, data[0] if data else None):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # Get a case ID
    response = requests.get(f"{BASE_URL}/cases/", headers=headers)
    case_id = None
    if response.status_code == 200:
        cases = response.json()
        if isinstance(cases, list) and len(cases) > 0:
            case_id = cases[0]['id']
        elif isinstance(cases, dict) and 'results' in cases and len(cases['results']) > 0:
            case_id = cases['results'][0]['id']
    
    if case_id:
        print(f"\n[CASE {case_id} ENDPOINTS]")
        case_endpoints = [
            ('GET', f'/cases/{case_id}/'),
            ('GET', f'/cases/{case_id}/summary/'),
            ('PATCH', f'/cases/{case_id}/', {'description': 'Updated'}),
        ]
        
        for method, endpoint, *data in case_endpoints:
            if test_endpoint(method, endpoint, headers, data[0] if data else None):
                results['passed'] += 1
            else:
                results['failed'] += 1
    
    # Evidence endpoints
    print("\n[EVIDENCE ENDPOINTS]")
    if test_endpoint('GET', '/evidence/', headers):
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # Parsed events
    print("\n[PARSED EVENTS ENDPOINTS]")
    if test_endpoint('GET', '/parsed-events/', headers):
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # Scored events
    print("\n[SCORED EVENTS ENDPOINTS]")
    if test_endpoint('GET', '/scored-events/', headers):
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    # Scoring endpoints
    print("\n[SCORING ENDPOINTS]")
    scoring_endpoints = [
        ('POST', '/scoring/run/', {'case_id': case_id if case_id else 1}),
        ('POST', '/scoring/recalculate/', {'case_id': case_id if case_id else 1}),
    ]
    
    for method, endpoint, data in scoring_endpoints:
        if test_endpoint(method, endpoint, headers, data):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # Filter endpoints
    print("\n[FILTER ENDPOINTS]")
    filter_endpoints = [
        ('POST', '/filter/apply/', {'case_id': case_id if case_id else 1, 'threshold': 0.5}, None),
        ('GET', '/filter/state/', None, {'case_id': case_id if case_id else 1}),
        ('POST', '/filter/reset/', {'case_id': case_id if case_id else 1}, None),
    ]
    
    for method, endpoint, data, params in filter_endpoints:
        if test_endpoint(method, endpoint, headers, data, params=params):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # Story endpoints
    print("\n[STORY ENDPOINTS]")
    story_endpoints = [
        ('GET', '/story/', None),
        ('POST', '/story/generate/', {'case_id': case_id if case_id else 1}),
    ]
    
    for method, endpoint, data in story_endpoints:
        if test_endpoint(method, endpoint, headers, data):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # Report endpoints
    print("\n[REPORT ENDPOINTS]")
    report_endpoints = [
        ('GET', '/report/', None),
        ('GET', '/report/capabilities/', None),
        ('POST', '/report/preview_latex/', {'case_id': case_id if case_id else 1}),
        ('POST', '/report/ai_analysis/', {'case_id': case_id if case_id else 1}),
    ]
    
    for method, endpoint, data in report_endpoints:
        if test_endpoint(method, endpoint, headers, data):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # Dashboard endpoints
    print("\n[DASHBOARD ENDPOINTS]")
    dashboard_endpoints = [
        ('GET', '/dashboard/summary/', None, None),
        ('GET', '/dashboard/timeline/', None, {'case_id': case_id if case_id else 1}),
        ('GET', '/dashboard/confidence_distribution/', None, {'case_id': case_id if case_id else 1}),
    ]
    
    for method, endpoint, data, params in dashboard_endpoints:
        if test_endpoint(method, endpoint, headers, data, params=params):
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    # Notes endpoints
    print("\n[NOTES ENDPOINTS]")
    if test_endpoint('GET', '/notes/', headers):
        results['passed'] += 1
    else:
        results['failed'] += 1
    
    print("\n" + "="*60)
    print(f"RESULTS: {results['passed']} passed, {results['failed']} failed")
    print("="*60)

if __name__ == "__main__":
    main()
