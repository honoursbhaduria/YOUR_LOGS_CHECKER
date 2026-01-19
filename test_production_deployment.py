#!/usr/bin/env python3
"""
Test Production Deployment - Frontend and Backend
Tests the deployed Vercel frontend and Render backend
"""

import requests
import json

# Production URLs
FRONTEND_URL = "https://logscanner-ver.vercel.app"
BACKEND_URL = "https://your-logs-checker.onrender.com/api"

def test_frontend_reachable():
    """Test if frontend is deployed and reachable"""
    print("\n[1] Testing Frontend Deployment...")
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            print(f"✓ Frontend is live at {FRONTEND_URL}")
            # Check if it's a React app
            if "react" in response.text.lower() or "root" in response.text:
                print("✓ Frontend appears to be a React application")
            return True
        else:
            print(f"✗ Frontend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Frontend not reachable: {e}")
        return False

def test_backend_reachable():
    """Test if backend is deployed and reachable"""
    print("\n[2] Testing Backend Deployment...")
    try:
        # Try the login endpoint (should reject GET but prove it's alive)
        response = requests.get(f"{BACKEND_URL}/auth/login/", timeout=10)
        if response.status_code == 405:  # Method not allowed
            print(f"✓ Backend is live at {BACKEND_URL}")
            data = response.json()
            if "detail" in data and "not allowed" in data["detail"].lower():
                print("✓ Backend is responding to API requests")
                return True
        elif response.status_code == 200:
            print(f"✓ Backend is live and responding")
            return True
        else:
            print(f"✗ Backend returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Backend not reachable: {e}")
        return False

def test_backend_endpoints():
    """Test key backend endpoints"""
    print("\n[3] Testing Backend Endpoints...")
    
    endpoints = [
        ("/auth/login/", "POST", "Login endpoint"),
        ("/auth/register/", "POST", "Register endpoint"),
        ("/cases/", "GET", "Cases list"),
    ]
    
    working = 0
    for path, method, description in endpoints:
        try:
            url = f"{BACKEND_URL}{path}"
            if method == "GET":
                response = requests.get(url, timeout=10)
            else:
                # POST without data will fail but proves endpoint exists
                response = requests.post(url, json={}, timeout=10)
            
            # 401 (unauthorized), 400 (bad request), or 405 (method not allowed) 
            # all indicate the endpoint exists
            if response.status_code in [200, 400, 401, 405]:
                print(f"✓ {description}: {response.status_code}")
                working += 1
            else:
                print(f"✗ {description}: {response.status_code}")
        except Exception as e:
            print(f"✗ {description}: {e}")
    
    print(f"\nBackend Endpoints: {working}/{len(endpoints)} responding")
    return working == len(endpoints)

def test_cors_configuration():
    """Test if CORS is configured correctly"""
    print("\n[4] Testing CORS Configuration...")
    try:
        headers = {
            "Origin": FRONTEND_URL,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        response = requests.options(
            f"{BACKEND_URL}/auth/login/",
            headers=headers,
            timeout=10
        )
        
        cors_headers = response.headers
        if "Access-Control-Allow-Origin" in cors_headers:
            print(f"✓ CORS configured: {cors_headers.get('Access-Control-Allow-Origin')}")
            return True
        else:
            print("⚠ CORS headers not found (may need configuration)")
            return False
    except Exception as e:
        print(f"✗ CORS test failed: {e}")
        return False

def test_frontend_api_url():
    """Test if frontend is configured with correct backend URL"""
    print("\n[5] Testing Frontend API Configuration...")
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        content = response.text
        
        # Check if the backend URL is in the frontend bundle
        if "your-logs-checker.onrender.com" in content:
            print(f"✓ Frontend configured with backend URL")
            print(f"  Backend URL: https://your-logs-checker.onrender.com")
            return True
        elif "localhost" in content:
            print("⚠ Frontend may be configured for localhost")
            return False
        else:
            print("? Unable to determine frontend API configuration")
            return False
    except Exception as e:
        print(f"✗ Frontend config test failed: {e}")
        return False

def main():
    print("=" * 70)
    print("PRODUCTION DEPLOYMENT TEST")
    print("Testing Frontend (Vercel) and Backend (Render)")
    print("=" * 70)
    
    results = {
        "Frontend Reachable": test_frontend_reachable(),
        "Backend Reachable": test_backend_reachable(),
        "Backend Endpoints": test_backend_endpoints(),
        "CORS Configuration": test_cors_configuration(),
        "Frontend API URL": test_frontend_api_url(),
    }
    
    print("\n" + "=" * 70)
    print("DEPLOYMENT TEST RESULTS")
    print("=" * 70)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status:8} | {test_name}")
    
    passed = sum(results.values())
    total = len(results)
    
    print("=" * 70)
    print(f"TOTAL: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 SUCCESS: Production deployment is fully functional!")
        print(f"\n📱 Frontend: {FRONTEND_URL}")
        print(f"🔧 Backend:  {BACKEND_URL}")
    elif passed >= 3:
        print("\n⚠ WARNING: Most tests passed but some issues detected")
        print("Check the failed tests above for details")
    else:
        print("\n❌ CRITICAL: Multiple deployment issues detected")
        print("Review the test results and fix configuration")
    
    print("=" * 70)

if __name__ == "__main__":
    main()
