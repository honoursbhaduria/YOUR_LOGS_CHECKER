# API Reference

Complete API documentation for the Forensic Log Analysis System.

## Base URL
```
http://localhost:8000/api
```

## Authentication

All API endpoints (except `/auth/login/`) require JWT authentication via Bearer token.

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "investigator",
  "password": "password"
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Refresh Token
```http
POST /auth/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Using Tokens
Include the access token in the Authorization header:
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

---

## Cases

### List Cases
```http
GET /cases/
```

### Create Case
```http
POST /cases/
Content-Type: application/json

{
  "name": "Incident 2024-001",
  "description": "Suspected data exfiltration",
  "status": "OPEN"
}
```

### Get Case Details
```http
GET /cases/{id}/
```

### Update Case
```http
PATCH /cases/{id}/
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

### Close Case
```http
POST /cases/{id}/close/
```

### Get Case Summary
```http
GET /cases/{id}/summary/

Response:
{
  "case": {...},
  "evidence_count": 5,
  "total_events": 1234,
  "high_risk_events": 45,
  "critical_events": 12,
  "avg_confidence": 0.68,
  "story_count": 2
}
```

---

## Evidence Files

### Upload Evidence
```http
POST /evidence/
Content-Type: multipart/form-data

case: 1
file: [binary file data]
filename: security_logs.csv
```

### List Evidence Files
```http
GET /evidence/?case={case_id}
```

### Get File Hash
```http
GET /evidence/{id}/hash/

Response:
{
  "filename": "security_logs.csv",
  "hash": "a3d4f5...",
  "algorithm": "SHA-256"
}
```

### Re-parse Evidence
```http
POST /evidence/{id}/reparse/
```

---

## Parsed Events

### List Parsed Events
```http
GET /parsed-events/?evidence_file={id}
```

### Get Event Details
```http
GET /parsed-events/{id}/
```

---

## ML Scoring

### Run Scoring
```http
POST /scoring/run/
Content-Type: application/json

{
  "case_id": 1
}

Response:
{
  "status": "scoring initiated",
  "events_count": 1234
}
```

### Recalculate Scores
```http
POST /scoring/recalculate/
Content-Type: application/json

{
  "case_id": 1
}
```

---

## Threshold Filtering

### Apply Threshold
```http
POST /filter/apply/
Content-Type: application/json

{
  "case_id": 1,
  "threshold": 0.7
}

Response:
{
  "status": "filter applied",
  "threshold": 0.7,
  "archived_count": 456
}
```

### Get Filter State
```http
GET /filter/state/?case_id={id}

Response:
{
  "total_events": 1234,
  "archived_events": 456,
  "active_events": 778
}
```

### Reset Filters
```http
POST /filter/reset/
Content-Type: application/json

{
  "case_id": 1
}
```

---

## Scored Events

### List Scored Events
```http
GET /scored-events/?parsed_event__evidence_file__case={id}
GET /scored-events/?risk_label=HIGH
GET /scored-events/?is_archived=false
```

### Get Event Details
```http
GET /scored-events/{id}/
```

### Archive Event
```http
POST /scored-events/{id}/archive/
```

### Restore Event
```http
POST /scored-events/{id}/restore/
```

### Mark False Positive
```http
POST /scored-events/{id}/mark_false_positive/
```

### Generate LLM Explanation
```http
POST /scored-events/{id}/generate_explanation/

Response:
{
  "status": "explanation generation initiated"
}
```

---

## Story Synthesis

### Generate Story
```http
POST /story/generate/
Content-Type: application/json

{
  "case_id": 1
}

Response:
{
  "status": "story generation initiated"
}
```

### List Stories
```http
GET /story/?case={id}
```

### Get Story Details
```http
GET /story/{id}/
```

### Regenerate Story
```http
POST /story/{id}/regenerate/

Response:
{
  "status": "story regeneration initiated"
}
```

---

## Reports

### Generate Report
```http
POST /report/generate/
Content-Type: application/json

{
  "case_id": 1,
  "format": "PDF"  // or "JSON"
}

Response:
{
  "status": "report generation initiated"
}
```

### List Reports
```http
GET /report/?case={id}
```

### Download Report
```http
GET /report/{id}/download/

Response:
{
  "download_url": "/media/reports/2024/01/12/report_case_1.pdf",
  "filename": "report_case_1_v1.pdf",
  "hash": "b4c5d6..."
}
```

---

## Dashboard

### Get Summary
```http
GET /dashboard/summary/

Response:
{
  "total_cases": 10,
  "total_evidence_files": 50,
  "total_events": 12345,
  "high_risk_events": 234,
  "critical_events": 56,
  "recent_cases": [...],
  "risk_distribution": {
    "LOW": 8000,
    "MEDIUM": 3000,
    "HIGH": 1200,
    "CRITICAL": 145
  },
  "confidence_distribution": {
    "0.0-0.3": 5000,
    "0.3-0.6": 4000,
    "0.6-0.8": 2500,
    "0.8-1.0": 845
  }
}
```

### Get Timeline
```http
GET /dashboard/timeline/?case_id={id}

Response:
[
  {
    "timestamp": "2024-01-12T15:30:00Z",
    "event_type": "PowerShell_Exec",
    "confidence": 0.85,
    "risk_label": "HIGH"
  },
  ...
]
```

### Get Confidence Distribution
```http
GET /dashboard/confidence-distribution/?case_id={id}

Response:
[
  {"bin": "0.0-0.1", "count": 100},
  {"bin": "0.1-0.2", "count": 150},
  ...
]
```

---

## Investigation Notes

### Create Note
```http
POST /notes/
Content-Type: application/json

{
  "case": 1,
  "scored_event": 123,  // optional
  "content": "Suspicious activity confirmed by network team"
}
```

### List Notes
```http
GET /notes/?case={id}
GET /notes/?scored_event={id}
```

### Update Note
```http
PATCH /notes/{id}/
Content-Type: application/json

{
  "content": "Updated note content"
}
```

### Delete Note
```http
DELETE /notes/{id}/
```

---

## Error Responses

All endpoints may return these error codes:

### 400 Bad Request
```json
{
  "error": "case_id required"
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Pagination

List endpoints support pagination:

```http
GET /cases/?page=2&page_size=50

Response:
{
  "count": 150,
  "next": "http://localhost:8000/api/cases/?page=3",
  "previous": "http://localhost:8000/api/cases/?page=1",
  "results": [...]
}
```

---

## Filtering & Searching

Many endpoints support filtering:

```http
GET /scored-events/?risk_label=HIGH&is_archived=false
GET /cases/?status=OPEN&search=incident
GET /parsed-events/?event_type=PowerShell_Exec&ordering=-timestamp
```

Common query parameters:
- `search` - Full-text search
- `ordering` - Sort results (prefix with `-` for descending)
- `page` - Page number
- `page_size` - Items per page

---

## Rate Limiting

API requests are rate-limited to:
- 1000 requests per hour per user
- 100 file uploads per hour per case

---

## Webhooks (Coming Soon)

Subscribe to events:
- `case.created`
- `evidence.uploaded`
- `scoring.completed`
- `story.generated`
- `report.ready`
