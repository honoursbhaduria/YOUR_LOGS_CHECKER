# Frontend Page Flow & Navigation

## 🗺️ Complete Site Map

```
┌─────────────────────────────────────────────────────────────────┐
│                          LOGIN / REGISTER                        │
│                    (Authentication Required)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                         🏠 DASHBOARD                             │
│                        (Landing Page)                            │
│                                                                  │
│  • Hero: "AI-Assisted Digital Forensics Platform"               │
│  • CTA: "Start New Investigation"                               │
│  • Metrics: Total Events, High Risk, Critical, Normal           │
│  • Active Investigations Grid                                   │
│  • Forensic Funnel Visualization                                │
└───────┬──────────────────────────────────────────────────────┘
        │
        ├──────────────────┐
        │                  │
        ↓                  ↓
┌─────────────┐   ┌─────────────────────────────────────────────┐
│  CASE LIST  │   │         CASE DETAIL PAGE                    │
│             │   │  (Upload & Manage Evidence)                 │
│  All Cases  │→──│                                             │
└─────────────┘   │  • Upload Evidence Files                    │
                  │  • Processing Status                        │
                  │  • Evidence Files List                      │
                  │  • Case Summary                             │
                  └─────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬──────────────┐
        │               │               │              │
        ↓               ↓               ↓              ↓
┌───────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐
│ INVESTIGATION │ │   EVENT    │ │ ATTACK STORY │ │   REPORT   │
│   OVERVIEW    │ │  EXPLORER  │ │  🎯 KILLER   │ │ GENERATION │
│   📊          │ │     🔍     │ │   FEATURE    │ │     📄     │
└───────────────┘ └────────────┘ └──────────────┘ └────────────┘
```

---

## 📊 Page Details

### 🏠 Dashboard (/)
**Purpose:** Entry point, create new investigations  
**Key Elements:**
- Large CTA button
- Metrics summary
- Recent investigations
- How it works section

**User Flow:**
1. Land on dashboard
2. Click "Start New Investigation"
3. Enter case name
4. Redirected to Case Detail to upload evidence

---

### 📁 Case Detail (/cases/:id)
**Purpose:** Upload evidence and manage case  
**Key Elements:**
- Drag-and-drop upload zone
- Evidence file list with parsing status
- Auto-refresh while processing
- Quick stats

**User Flow:**
1. Upload log files (CSV/JSON/Syslog)
2. Watch parsing progress
3. Once parsed, navigate to overview

---

### 📊 Investigation Overview (/cases/:id/overview)
**Purpose:** 10-second understanding of what happened  
**Key Elements:**
- 4 metric cards
- Events over time (line chart)
- Severity distribution (pie chart)
- Top risky users (bar chart)
- Top risky IPs (bar chart)

**User Flow:**
1. See high-level metrics
2. Identify patterns in charts
3. Click "View Attack Story" for narrative

---

### 🔍 Event Explorer (/cases/:id/events)
**Purpose:** Raw event table with filtering  
**Key Elements:**
- Confidence score slider (0-100%)
- Search box
- Sortable table
- Expandable rows for raw JSON
- Color-coded badges

**User Flow:**
1. Adjust confidence slider to filter noise
2. Search for specific users/IPs
3. Expand rows to see raw data
4. Validate ML scoring accuracy

---

### 🎯 Attack Story (/cases/:id/story) ⭐ KILLER FEATURE
**Purpose:** Human-readable attack narrative  
**Key Elements:**
- Executive summary
- Horizontal timeline (12 MITRE ATT&CK stages)
- Stage cards with AI explanations
- Severity badges
- Key evidence summaries
- Detailed findings section

**User Flow:**
1. Read executive summary
2. Scroll through timeline
3. Click stages with activity
4. Read AI-generated narrative
5. Understand attack without raw logs

**MITRE ATT&CK Stages:**
1. 🔍 Reconnaissance
2. 🚪 Initial Access
3. ⚡ Execution
4. 📌 Persistence
5. ⬆️ Privilege Escalation
6. 🎭 Defense Evasion
7. 🔑 Credential Access
8. 🗺️ Discovery
9. ↔️ Lateral Movement
10. 📦 Collection
11. 📤 Exfiltration
12. 💥 Impact

---

### 📄 Report Generation (/cases/:id/report)
**Purpose:** Export investigation to PDF/CSV  
**Key Elements:**
- Generate report button
- Report contents preview
- Download options (PDF/CSV)
- Latest report display

**User Flow:**
1. Click "Generate Report"
2. Wait for generation
3. Preview report content
4. Download PDF or CSV

**Report Contains:**
- Executive summary
- Attack timeline
- Evidence table
- AI analysis
- Recommendations

---

## 🎨 Visual Hierarchy

### Primary CTAs (Blue Gradient)
- "Start New Investigation"
- "View Attack Story"
- "Generate Report"

### Secondary Actions (Gray)
- "View All Events"
- "Upload Evidence"
- "Back to ..."

### Metrics Color Coding
- 🔵 Blue: Total Events (informational)
- 🟡 Yellow: High Risk (warning)
- 🔴 Red: Critical (danger)
- 🟢 Green: Normal (success)

---

## 🔄 Typical Investigation Workflow

```
1. Dashboard
   ↓ Click "Start New Investigation"

2. Case Detail
   ↓ Upload botsv3_events.csv
   ↓ Wait for parsing

3. Investigation Overview
   ↓ See charts and metrics
   ↓ Identify: "20 failed logins from external IP"

4. Attack Story (THE MOMENT)
   ↓ See timeline: Initial Access → Credential Access → Defense Evasion
   ↓ Read: "Brute force attack detected, followed by log clearing"
   ↓ Evidence: "45.142.212.61 attempted 20 logins, then log cleared"

5. Event Explorer (if needed)
   ↓ Filter to 80%+ confidence
   ↓ Search for "45.142.212.61"
   ↓ Expand rows to validate

6. Report Generation
   ↓ Generate comprehensive report
   ↓ Download PDF for management
   ↓ Export CSV for further analysis
```

---

## 🎯 Judge Demo Path (3 minutes)

### Act 1: The Problem (30s)
- Show Dashboard
- "Cyber investigations take hours"
- "90% of logs are noise"
- "Analysts suffer from alert fatigue"

### Act 2: The Solution (30s)
- Click "Start New Investigation"
- Upload botsv3_events.csv
- "Our ML + LLM pipeline processes this automatically"

### Act 3: The Magic (90s)
- **Investigation Overview:** "In 10 seconds, you see what happened"
- Point to charts: "20 critical events, spike at 3pm"
- **Attack Story:** "Here's the killer feature"
  - Show horizontal timeline
  - Read AI narrative: "Brute force attack from 45.142.212.61..."
  - Point to stage cards: Initial Access → Defense Evasion
  - "MITRE ATT&CK framework, instantly understandable"

### Act 4: The Value (30s)
- **Report:** "One-click generates professional report"
- "Ready for court, management, or audit"
- "Hours → Minutes"

---

## 🏆 What Makes This Win

### 1. Visual Storytelling
Timeline > Table of logs every time

### 2. Progressive Disclosure
Overview → Timeline → Events → Report  
Each level reveals more detail

### 3. Trust Through Transparency
Raw JSON always accessible  
Confidence scores shown  
Not a black box

### 4. Accessibility
Junior analysts can investigate  
Non-experts can understand  
Managers get executive summaries

### 5. Real AI/ML Value
Not just buzzwords  
ML filters noise (90%+)  
LLM generates narratives  
Visible impact on workflow

---

## 📐 Design Patterns Used

### Empty States
Every page has helpful empty states with:
- Large emoji icon
- Clear message
- Obvious next step

### Loading States
- Spinners for async operations
- Auto-refresh during processing
- Progress indicators

### Error States
- User-friendly error messages
- Suggestions for resolution
- Fallback UI

### Color-Coded Severity
Consistent across all pages:
- Red = Critical
- Yellow = High
- Blue = Medium
- Green = Low/Normal

---

## 🚀 Ready for Production

All pages are:
- ✅ Fully functional
- ✅ Responsive (mobile/tablet/desktop)
- ✅ Error-handled
- ✅ TypeScript typed
- ✅ Styled consistently
- ✅ Documented

**The frontend is judge-ready!** 🎉
