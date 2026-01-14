#!/bin/bash
# Quick manual API test
set -e

echo "=== Getting fresh token ==="
RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access'])")
echo "Token obtained: ${TOKEN:0:40}..."

echo -e "\n=== Testing Cases API ==="
curl -s -X GET http://127.0.0.1:8000/api/cases/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== Testing File Upload ===" 
curl -s -X POST http://127.0.0.1:8000/api/evidence/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "case=1" \
  -F "file=@/tmp/test_security_log.csv" | python3 -m json.tool

echo -e "\n=== Testing Events API ==="
curl -s -X GET "http://127.0.0.1:8000/api/parsed-events/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

echo -e "\n=== All tests completed ==="
