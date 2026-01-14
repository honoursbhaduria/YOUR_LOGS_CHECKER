# Frontend Architecture & Design Documentation
## AI-Assisted Digital Forensics Platform

**Last Updated:** January 14, 2026  
**Status:** ✅ Complete - Production Ready

---

## 🎯 Design Philosophy

### Core Principles
1. **Narrative-First UI** - Tell a story, not just show data
2. **Minimal Cognitive Load** - Zero cybersecurity jargon for basic users
3. **Progressive Disclosure** - Details only when needed
4. **Investigation-Focused** - Not alert-focused like traditional SIEM

### Target Audience
- Junior analysts who need guided investigation
- Non-expert personnel (police officers, HR)
- Senior analysts who want speed
- Managers who need executive summaries

---

## 📊 The Forensic Funnel (Implemented)

```
Raw Logs (Upload)
   ↓
Parsing & Normalization (Auto-detect CSV/JSON/Syslog)
   ↓
ML Confidence Scoring (Filter 90%+ noise)
   ↓
Correlation & Clustering (Group related events)
   ↓
LLM Narrative Generation (Attack story)
   ↓
Visual Timeline + PDF Report (Deliverable)
```

---

## 🏗️ Page Structure

### 1️⃣ Dashboard (Landing Page)
**File:** `src/pages/Dashboard.tsx`  
**Route:** `/`

**Purpose:** Primary entry point for all investigations

**Features:**
- ✅ Hero section with one-line mission statement
- ✅ **Primary CTA:** "Start New Investigation" button
- ✅ Quick case creation with inline form
- ✅ 4 metrics cards:
  - Total Events (blue)
  - High Risk Events (yellow)
  - Critical Alerts (red)
  - Normal Logs (green)
- ✅ Active investigations list (grid of cards)
- ✅ Status badges (OPEN/IN_PROGRESS/CLOSED)
- ✅ "How It Works" - The Forensic Funnel visualization

**UX Highlights:**
- Single primary action reduces decision fatigue
- Empty state with clear call-to-action
- Color-coded metrics for instant recognition
- Gradient backgrounds for visual hierarchy

---

### 2️⃣ Investigation Overview
**File:** `src/pages/InvestigationOverview.tsx`  
**Route:** `/cases/:caseId/overview`

**Purpose:** High-level understanding of investigation in 10 seconds

**Features:**
- ✅ 4 top metrics cards (same as dashboard but case-specific)
- ✅ **Events Over Time** - Line chart showing critical/high/normal events
- ✅ **Threat Severity Distribution** - Pie chart (Critical/High/Medium/Low)
- ✅ **Top Risky Users** - Bar chart showing users by risk score
- ✅ **Top Risky IPs** - Bar chart showing source IPs by risk score
- ✅ Quick action buttons (View Events, Generate Report)

**Technologies:**
- Recharts for all visualizations
- React Query for data fetching
- Real-time auto-refresh while processing

**Charts Explained:**
- Line chart: Shows attack progression over time
- Pie chart: Shows distribution of severity levels
- Bar charts: Identify threat actors (users) and sources (IPs)

---

### 3️⃣ Event Explorer
**File:** `src/pages/EventExplorer.tsx`  
**Route:** `/cases/:caseId/events`

**Purpose:** Transparency, trust, and expert validation

**Features:**
- ✅ **Confidence Score Slider** - Filter events by ML confidence (0-100%)
- ✅ **Search Box** - Search by user, event type, or description
- ✅ **Interactive Table:**
  - Timestamp
  - Event Type (with badge)
  - User
  - Source IP
  - Description (truncated)
  - **ML Confidence Score** (color-coded badge)
  - Expand button
- ✅ **Expandable Rows** - Show raw JSON when clicked
- ✅ **Legend** - Explains confidence score colors

**Confidence Score Colors:**
- 🔴 **CRITICAL** (≥80%) - Red
- 🟡 **HIGH** (60-79%) - Yellow
- 🔵 **MEDIUM** (40-59%) - Blue
- 🟢 **LOW** (0-39%) - Green

**UX Highlights:**
- Slider allows filtering noise without deleting data
- Search preserves investigator workflow
- Raw JSON builds trust (not a black box)
- Stats show "X of Y events" for context

---

### 4️⃣ Attack Story (KILLER FEATURE) 🎯
**File:** `src/pages/AttackStory.tsx`  
**Route:** `/cases/:caseId/story`

**Purpose:** Transform raw logs into human-readable attack narrative

**Features:**
- ✅ **Executive Summary** - One-paragraph overview
- ✅ **Horizontal Timeline** - 12 MITRE ATT&CK stages:
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

- ✅ **Stage Cards** for each active stage:
  - Severity badge (CRITICAL/HIGH/MEDIUM/INFO)
  - AI-generated explanation
  - Event count
  - Key evidence summary
  - Timestamp
  - Gradient background matching stage color

- ✅ **Detailed Findings** section below timeline
- ✅ Empty state with clear next steps

**Visual Design:**
- Circular stage icons with emoji
- Connector lines between stages
- Active stages glow with gradient + ring
- Inactive stages are grayed out
- Horizontal scroll for full timeline
- Each card is 320px wide for readability

**Why This Works:**
- Visual timeline > text logs
- MITRE ATT&CK familiarity
- Progressive disclosure (timeline → cards → details)
- Tells a story, not just lists events

---

### 5️⃣ Report Generation
**File:** `src/pages/ReportGeneration.tsx`  
**Route:** `/cases/:caseId/report`

**Purpose:** One-click professional report for stakeholders

**Features:**
- ✅ **Generate Report Button** - Large, obvious CTA
- ✅ **Report Contents Checklist:**
  - Executive Summary
  - Attack Timeline
  - Evidence Table
  - AI Analysis
  - Recommendations
- ✅ **Latest Report Preview** - Shows generated report content
- ✅ **Download Options:**
  - PDF (for presentation)
  - CSV (for data analysis)
- ✅ Empty state with explanation

**Report Contains:**
1. Executive summary (1 paragraph)
2. Attack timeline (chronological)
3. Evidence table (all high-confidence events)
4. AI analysis (patterns detected)
5. Recommendations (what to do next)

---

## 🎨 Design System

### Color Palette
```css
/* Background */
- Primary: #000000 (black)
- Secondary: #111827 (gray-900)
- Cards: #1F2937 (gray-800/50)
- Borders: #374151 (gray-700)

/* Severity Colors */
- Critical: #EF4444 (red-500)
- High: #F59E0B (yellow-500)
- Medium: #3B82F6 (blue-500)
- Low/Success: #10B981 (green-500)
- Info: #6366F1 (indigo-500)

/* Gradients */
- Primary CTA: blue-600 → indigo-600
- Metrics: color-900/50 → color-800/30
- Stages: Unique gradient per stage
```

### Typography
- Headings: Bold, 2xl-4xl
- Body: Regular, sm-base
- Monospace: For event IDs, hashes, IPs
- Color: White (#FFFFFF) for primary, Gray-400 for secondary

### Components
- **Cards:** Rounded-xl, gradient backgrounds, border glow on hover
- **Buttons:** Gradient backgrounds, shadow-lg, transform on hover
- **Badges:** Rounded, colored backgrounds matching severity
- **Charts:** Recharts with dark theme, colored lines/bars

---

## 🔄 Data Flow

### 1. Upload → Parse → Score
```
User uploads CSV
  ↓
Backend detects log type (CSV/JSON/Syslog)
  ↓
Parser extracts events (timestamp, user, host, event_type)
  ↓
ML model scores each event (0.0-1.0 confidence)
  ↓
Events stored in database
```

### 2. Correlation → Story
```
Scored events grouped by pattern
  ↓
LLM analyzes high-confidence events
  ↓
Generates narrative for each attack stage
  ↓
Story patterns stored with evidence summary
```

### 3. Visualization
```
Frontend fetches scored events
  ↓
Charts aggregate by time/user/IP
  ↓
Timeline maps to MITRE ATT&CK stages
  ↓
Report compiles everything into PDF/CSV
```

---

## 📱 Responsive Design
- Mobile: Single column, stacked cards
- Tablet: 2-column grid
- Desktop: 3-4 column grid, horizontal timeline

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS 3.3
- **State Management:** TanStack React Query 5.0
- **Routing:** React Router 6.20
- **Charts:** Recharts 2.10
- **File Upload:** react-dropzone 14.2
- **HTTP Client:** Axios 1.6

### Backend Integration
- REST API endpoints via `apiClient`
- Token-based authentication (localStorage)
- Auto-refresh for processing status
- Error handling with user-friendly messages

---

## 🎓 Judge Appeal Strategy

### What Makes This Stand Out

#### 1. NOT Just Another SIEM
| Traditional SIEM | This Platform |
|-----------------|---------------|
| Alert-focused | Investigation-focused |
| Regex & rules | ML + LLM |
| Query-heavy | Narrative-based |
| Expert-only | Junior-analyst friendly |

#### 2. The "Aha!" Moment
When judges see the **Attack Story page**, they instantly understand:
- "This is like ChatGPT for cyber forensics"
- Visual timeline beats raw logs every time
- Non-experts can understand attacks

#### 3. Real-World Impact
- **Before:** Hours manually correlating logs
- **After:** Minutes to get attack story
- **Benefit:** Faster MTTD/MTTR, less analyst fatigue

---

## 📊 Demo Flow (For Judges)

### 3-Minute Demo Script
1. **Landing Page (30s)**
   - "This is an AI-assisted forensics platform"
   - Show "Start New Investigation" button
   - Explain Forensic Funnel

2. **Upload & Process (30s)**
   - Upload botsv3_events.csv
   - Show auto-parsing status
   - Metrics update in real-time

3. **Investigation Overview (45s)**
   - "In 10 seconds, you know what happened"
   - Point out charts (events over time, severity, risky users/IPs)
   - "231 events, 20 failed logins, 1 log clear"

4. **Event Explorer (30s)**
   - Show confidence slider filtering noise
   - Expand a row to show raw JSON
   - "Transparency builds trust"

5. **Attack Story - THE KILLER SLIDE (45s)** 🎯
   - "Here's the magic"
   - Show horizontal timeline
   - Read AI-generated narrative
   - "Brute force → Log clearing → Investigation"
   - Point to MITRE ATT&CK stages

6. **Report (30s)**
   - One-click generate
   - Show PDF preview
   - "Ready for court or management"

---

## 🔧 Setup Instructions

### Prerequisites
```bash
Node.js 18+
npm or yarn
```

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm start
# Opens on http://localhost:3000
# Proxies API requests to http://localhost:8000
```

### Build for Production
```bash
npm run build
# Creates optimized bundle in build/
```

---

## 📄 File Structure
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx              ← Landing page
│   │   ├── InvestigationOverview.tsx  ← Analytics dashboard
│   │   ├── EventExplorer.tsx          ← Event table with filters
│   │   ├── AttackStory.tsx            ← KILLER FEATURE
│   │   ├── ReportGeneration.tsx       ← PDF/CSV export
│   │   ├── CaseList.tsx               ← All investigations
│   │   ├── CaseDetail.tsx             ← Case management
│   │   ├── Login.tsx                  ← Authentication
│   │   └── Register.tsx               ← User registration
│   ├── components/
│   │   └── Layout.tsx                 ← Navigation wrapper
│   ├── api/
│   │   └── client.ts                  ← API service layer
│   ├── types/
│   │   └── index.ts                   ← TypeScript definitions
│   ├── App.tsx                        ← Root component & routing
│   ├── index.tsx                      ← Entry point
│   └── index.css                      ← Tailwind imports
├── public/
│   └── index.html
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## ✅ Completed Features

### Core Pages
- [x] Dashboard (Landing Page)
- [x] Investigation Overview
- [x] Event Explorer
- [x] Attack Story Timeline (KILLER FEATURE)
- [x] Report Generation
- [x] Case Management
- [x] Authentication

### UI Components
- [x] Metric cards with gradients
- [x] Interactive charts (Line, Pie, Bar)
- [x] Horizontal timeline with stages
- [x] Confidence score slider
- [x] Searchable event table
- [x] Expandable rows for raw data
- [x] Status badges
- [x] Empty states
- [x] Loading states

### Functionality
- [x] File upload with drag-and-drop
- [x] Real-time status updates
- [x] Filtering and search
- [x] Report download (PDF/CSV)
- [x] Responsive design
- [x] Error handling
- [x] Authentication flow

---

## 🎯 Key Selling Points (For Judges)

1. **Novel Approach:** ML + LLM for forensics (not just SIEM)
2. **Visual Storytelling:** Timeline > raw logs
3. **Accessibility:** Junior analysts can investigate
4. **Speed:** Hours → Minutes
5. **Trust:** Raw data always visible (not a black box)
6. **MITRE ATT&CK:** Industry-standard framework
7. **Production-Ready:** Real parsing, real ML, real UI

---

## 📚 References

- MITRE ATT&CK: https://attack.mitre.org/
- React Best Practices: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- Recharts: https://recharts.org/

---

## 🎉 Success Metrics

**If judges remember ONE thing:**
> "It's like ChatGPT for cyber forensics - turns raw logs into attack stories"

**Visual Impact:**
The Attack Story page with its horizontal timeline is designed to make judges go:
- "Wow, this is actually useful"
- "I can understand what happened without being a security expert"
- "This solves a real problem"

---

**🏆 This frontend is production-ready and judge-friendly!**
