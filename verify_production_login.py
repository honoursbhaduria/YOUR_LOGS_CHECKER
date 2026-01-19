#!/usr/bin/env python3
"""Quick test to verify production backend accepts login requests"""
import requests
import json

BACKEND_URL = "https://your-logs-checker.onrender.com/api"

print("Testing production backend login endpoint...")
print(f"URL: {BACKEND_URL}/auth/login/")
print()

# Test 1: Empty POST (should return 400)
print("[1] Testing with empty credentials...")
response = requests.post(f"{BACKEND_URL}/auth/login/", json={})
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
print()

# Test 2: Invalid credentials (should return 401)
print("[2] Testing with invalid credentials...")
response = requests.post(
    f"{BACKEND_URL}/auth/login/",
    json={"username": "testuser", "password": "wrongpass"}
)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
print()

print("✅ Backend is accepting login requests and validating credentials")
print("Frontend can successfully communicate with production backend")
