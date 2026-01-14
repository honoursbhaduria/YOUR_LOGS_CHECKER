# Nested LaTeX Report Generation Guide

## Overview
The forensic log analysis system now supports advanced **nested LaTeX report generation** with accompanying CSV data export. Reports feature hierarchical structure with multiple levels of sections, subsections, and professionally formatted tables.

## Features

### 1. Nested Report Structure
- **Chapter-like Organization**: Uses `report` document class for better nesting support
- **Main Sections**:
  - Investigation Overview
    - Case Information (subsection)
    - Chain of Custody (subsection)
  - Executive Summary - Attack Stories
    - Individual Attack Patterns (subsections)
      - Details (nested subsection)
      - Narrative (nested subsection)
  - Event Analysis Details
    - Statistics (subsection)
    - High Confidence Events (subsection)
    - Medium Confidence Events (subsection)
  - Risk Assessment Summary
    - Risk Distribution (subsection)
    - Recommendations (subsection)

### 2. Report Formats Supported

| Format | Description | Use Case |
|--------|-------------|----------|
| `PDF_LATEX` | Nested LaTeX report compiled to PDF | Professional court-ready reports |
| `CSV` | Structured data export | Data analysis in Excel/Python |
| `PDF` | Standard ReportLab PDF | Quick simple reports |
| `JSON` | Raw JSON data | API integration |

### 3. Combined Report Download
New endpoint generates **ZIP package** containing:
- `report_case_X.pdf` - Nested LaTeX PDF report
- `report_case_X_data.csv` - Complete CSV data export
- `README.txt` - Metadata and summary

## API Usage

### Generate Individual Report
```bash
POST /api/report/generate/
{
  "case_id": 1,
  "format": "PDF_LATEX",  # or "CSV", "PDF", "JSON"
  "include_llm_explanations": true
}
```

### Download Report
```bash
GET /api/report/<id>/download/
# Returns file directly with proper Content-Type headers
```

### Generate Combined Report (PDF + CSV)
```bash
POST /api/report/generate_combined/
{
  "case_id": 1
}
# Returns ZIP file with PDF + CSV + metadata
```

## Frontend Integration

### Report Generation Page
```typescript
// Generate report with format selection
await apiClient.generateReport(caseId, 'PDF_LATEX');

// Download specific report
await apiClient.downloadReport(reportId);

// Download combined package
await apiClient.generateCombinedReport(caseId);
```

### Download Handling
The frontend now properly handles blob responses and creates downloadable links:
```typescript
const response = await apiClient.downloadReport(reportId);
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();
```

## LaTeX Features

### Packages Used
- `geometry` - Page margins (0.8in)
- `fancyhdr` - Headers and footers
- `longtable` - Multi-page tables
- `booktabs` - Professional table formatting
- `xcolor` - Table colors
- `hyperref` - Clickable table of contents

### Table Examples
```latex
% Nested case information table
\begin{tabular}{|l|p{10cm}|}
\hline
\textbf{Field} & \textbf{Value} \\
\hline
Case Name & Ransomware Investigation \\
Status & Active \\
\hline
\end{tabular}
```

## CSV Export Structure

### CSV Format
```csv
Forensic Log Analysis Report - Events Data
Case,Ransomware Investigation
Generated,2026-01-14 10:30:45 UTC

Timestamp,Event Type,User,Host,Risk Level,Confidence,Description,Raw Message
2024-01-10 14:23:45,login_failure,admin,server01,HIGH,0.8542,...
...

Attack Stories Summary
Title,Attack Phase,Confidence,Narrative
Brute Force Attack,Initial Access,0.78,...
```

## File Download Fix

### Problem
Previously, downloads returned URLs like `{"download_url": "/media/reports/..."}` which failed when:
- DEBUG=False (production mode)
- Media files not served properly
- CORS issues with frontend

### Solution
1. **Direct File Serving**: `/api/report/<id>/download/` now returns file content directly
2. **Proper Content-Type**: Sets correct MIME type (application/pdf, text/csv, etc.)
3. **Works in Production**: Uses Django's `serve()` view for media files
4. **Blob Response**: Frontend receives binary data and creates download link

### Configuration
```python
# backend/config/urls.py
if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, 
                {'document_root': settings.MEDIA_ROOT}),
    ]
```

## Testing

### Test Report Generation
```bash
# From project root
curl -X POST http://localhost:8000/api/report/generate/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_id": 1, "format": "PDF_LATEX"}'
```

### Test Download
```bash
# Download report directly
curl -X GET http://localhost:8000/api/report/1/download/ \
  -H "Authorization: Bearer $TOKEN" \
  --output report.pdf
```

### Test Combined Report
```bash
curl -X POST http://localhost:8000/api/report/generate_combined/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_id": 1}' \
  --output combined.zip
```

## Requirements

### LaTeX Installation
```bash
# Ubuntu/Debian
sudo apt-get install texlive-latex-base texlive-fonts-recommended

# Verify installation
pdflatex --version
```

### Python Packages
Already in `requirements.txt`:
- `pylatex` - LaTeX document generation
- `reportlab` - Standard PDF generation

## Troubleshooting

### LaTeX Compilation Errors
**Issue**: PDF generation fails with LaTeX errors

**Solution**:
```bash
# Check LaTeX installation
which pdflatex

# Install missing packages
sudo apt-get install texlive-latex-extra
```

### Download Shows "File not found"
**Issue**: Report file missing from media directory

**Solution**:
1. Check `MEDIA_ROOT` in settings.py
2. Verify file was saved: `ls -la backend/media/reports/`
3. Check file permissions: `chmod 644 backend/media/reports/*`

### Frontend CORS/Download Issues
**Issue**: Browser blocks download or shows CORS error

**Solution**:
1. Use blob response type: `responseType: 'blob'`
2. Ensure API returns file directly, not URL
3. Check CORS headers in Django settings

## Performance

### Report Generation Times
- **Simple CSV**: ~1-2 seconds (500 events)
- **Standard PDF**: ~3-5 seconds (ReportLab)
- **LaTeX PDF**: ~8-12 seconds (compilation time)
- **Combined ZIP**: ~10-15 seconds (PDF + CSV)

### Optimization Tips
1. Limit events in report (currently 500 max)
2. Use Celery for async generation (already implemented)
3. Cache report results
4. Compress large CSV files

## Future Enhancements
- [ ] PDF watermarking for draft reports
- [ ] Digital signatures for final reports
- [ ] Multi-language report support
- [ ] Custom LaTeX templates
- [ ] Report diff/comparison tool
- [ ] Automated report scheduling

## Related Documentation
- [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
- [QUICK_START.md](QUICK_START.md) - Getting started guide
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Project overview
