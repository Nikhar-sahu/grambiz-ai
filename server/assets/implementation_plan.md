# GraminUdyam AI — SIH 2026 (Problem ID: 26091)
## Implementation Plan

A production-grade, dual-platform solution for the Ministry of Social Justice and Empowerment (MoSJE) — AI-Driven Hyper-Local Business Advisory & Financial Structuring for rural entrepreneurs.

---

## Overview

| Layer | Technology | Purpose |
|---|---|---|
| Mobile & Beneficiary Web | Flutter 3.x (Riverpod) | Guided assessment, feasibility dashboard, DPR download |
| Admin Web Dashboard | Next.js 14 + Tailwind + Recharts | Ministry/SCA analytics, heatmaps, DPR oversight |
| Backend API | FastAPI (Python 3.11+) | Async REST, CORS, Pydantic v2 schemas |
| Database | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy | Persistent storage, Alembic migrations |
| ML Engine | XGBoost + Scikit-learn | Feasibility score, risk level, saturation index |
| Generative AI | OpenAI/Gemini via LiteLLM | SWOT advisory, pricing hints, audio text |
| PDF Engine | ReportLab | Bank-Ready Detailed Project Report |

---

## Proposed Repository Structure

```
graminduyam/
├── backend/
│   ├── main.py              # FastAPI app, CORS, route registration
│   ├── schemas.py           # Pydantic v2 request/response models
│   ├── finance_engine.py    # 100% deterministic EMI & scheme logic
│   ├── ml_engine.py         # XGBoost inference + mock training data
│   ├── llm_advisory.py      # LiteLLM prompt pipeline → JSON SWOT
│   ├── pdf_generator.py     # ReportLab DPR PDF builder
│   ├── database.py          # SQLAlchemy engine, models, session
│   ├── routers/
│   │   ├── assessment.py    # POST /assess — core advisory endpoint
│   │   ├── pdf.py           # GET /dpr/{id} — DPR download
│   │   └── admin.py         # GET /admin/* — aggregation endpoints
│   └── requirements.txt
├── flutter_app/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/
│   │   │   ├── assessment_model.dart
│   │   │   └── financial_model.dart
│   │   ├── screens/
│   │   │   ├── language_screen.dart     # Screen 1: Language + Login
│   │   │   ├── assessment_screen.dart   # Screen 2: Guided Form + GPS
│   │   │   ├── advisory_screen.dart     # Screen 3: Feasibility + SWOT
│   │   │   └── financial_screen.dart    # Screen 4: EMI + DPR Download
│   │   ├── services/
│   │   │   └── api_service.dart         # Dio HTTP client
│   │   ├── providers/
│   │   │   └── assessment_provider.dart # Riverpod state
│   │   └── widgets/
│   │       ├── feasibility_gauge.dart   # Circular gauge (CustomPainter)
│   │       ├── swot_card.dart
│   │       ├── emi_timeline.dart
│   │       └── scheme_badge.dart
│   └── pubspec.yaml
└── web_admin/
    ├── app/
    │   ├── page.tsx                # Dashboard root
    │   ├── analytics/page.tsx      # District heatmap + trends
    │   └── ventures/page.tsx       # Risk/potential filters
    ├── components/
    │   ├── DistrictHeatmap.tsx
    │   ├── SchemeDonut.tsx
    │   ├── VentureTable.tsx
    │   └── StatsCard.tsx
    ├── lib/api.ts
    └── package.json
```

---

## Proposed Changes

### Component 1: Backend (FastAPI)

#### [NEW] `backend/main.py`
FastAPI app with CORS, lifespan DB init, and router registration for `/assess`, `/dpr`, `/admin`.

#### [NEW] `backend/schemas.py`
Pydantic v2 models — `AssessmentRequest`, `FinancialResult`, `MLResult`, `AdvisoryResult`, `DPRResponse`.

#### [NEW] `backend/finance_engine.py`
**100% deterministic** financial engine:
- `total_project_cost = margin_capital / 0.10`
- `sanctioned_loan = total_project_cost * 0.90`
- Auto-selects scheme by cost threshold (≤1,40,000 → Micro Finance 6.5%/3yr; else Term Loan 8%/7yr)
- Quarterly EMI post-moratorium with full principal+interest amortization table

#### [NEW] `backend/ml_engine.py`
XGBoost model (trained on synthetic rural demographic features):
- Features: capital, population density, enterprise count in radius, purchasing power index, market distance
- Outputs: `feasibility_score (0-100)`, `risk_level (Low/Medium/High)`, `market_saturation_index (%)`

#### [NEW] `backend/llm_advisory.py`
LiteLLM pipeline with strict JSON-schema output:
```json
{
  "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
  "pricing_hint": "string",
  "seasonal_risks": [],
  "audio_summary_text": "string (Hindi)"
}
```

#### [NEW] `backend/pdf_generator.py`
ReportLab multi-page DPR PDF containing:
- Entrepreneur metadata + project summary
- Capital structure (10% self / 90% loan)
- 3-year cash flow projection
- Quarterly amortization table
- AI feasibility score & SWOT
- MoSJE scheme checklist

#### [NEW] `backend/database.py`
SQLAlchemy models: `Assessment`, `FinancialPlan`, `Advisory`. Alembic migrations ready.

---

### Component 2: Flutter App

#### [NEW] `flutter_app/lib/main.dart`
MaterialApp with Riverpod ProviderScope, multi-language support (Hindi/English via `AppLocalizations`), and routing.

#### [NEW] `flutter_app/lib/screens/language_screen.dart`
Language picker with animated flag cards + phone OTP stub login.

#### [NEW] `flutter_app/lib/screens/assessment_screen.dart`
- GPS auto-location via `geolocator`
- Interactive `RangeSlider` for capital amount
- Business category picker with emoji iconography
- Voice-to-text integration stub

#### [NEW] `flutter_app/lib/screens/advisory_screen.dart`
- `feasibility_gauge.dart` — `CustomPainter` circular gauge with color-coded arcs
- Expandable SWOT cards with slide animation
- Competitor density metric chip
- Audio player widget (audioplayers)

#### [NEW] `flutter_app/lib/screens/financial_screen.dart`
- Scheme Badge widget (Micro Finance / Term Loan)
- Capital breakdown cards (10% / 90% split)
- Scrollable quarterly EMI timeline
- "Export Bank-Ready DPR" button → triggers PDF download

---

### Component 3: Next.js Admin Dashboard

#### [NEW] `web_admin/app/page.tsx`
Root dashboard with sidebar navigation, stats cards (total assessments, DPRs, disbursement value).

#### [NEW] `web_admin/components/DistrictHeatmap.tsx`
Recharts `ComposedChart` + district aggregation data from `/admin/districts`.

#### [NEW] `web_admin/components/SchemeDonut.tsx`
Recharts `PieChart` showing Micro Finance vs Term Loan split.

#### [NEW] `web_admin/components/VentureTable.tsx`
Filterable data table: High-Risk / High-Potential venture classification with export.

---

## Financial Logic — Exact Specification

```
Given: margin_capital (INR, user's 10% contribution)

total_project_cost    = margin_capital / 0.10
sanctioned_loan       = total_project_cost * 0.90

IF total_project_cost <= 1,40,000:
  scheme              = "Micro Finance"
  annual_rate         = 6.5%
  tenure_months       = 36 (3 Years)
  moratorium_months   = 3

ELSE IF total_project_cost <= 50,00,000:
  scheme              = "Term Loan"
  annual_rate         = 8.0%
  tenure_months       = 84 (7 Years)
  moratorium_months   = 6

quarterly_rate        = annual_rate / 4
effective_periods     = (tenure_months - moratorium_months) / 3

quarterly_emi = sanctioned_loan * quarterly_rate * (1+quarterly_rate)^periods
                ─────────────────────────────────────────────────────────────
                        (1+quarterly_rate)^periods − 1

Full amortization table: principal_component + interest_component per quarter.
```

---

## Verification Plan

### Automated Tests
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload
# Test financial engine
pytest tests/test_finance.py -v
# Test full assess endpoint
pytest tests/test_api.py -v
```

### Manual Verification
- Confirm EMI math against standard amortization formula at boundary (₹1,40,000)
- Flutter app: run `flutter run -d chrome` for web preview
- Next.js admin: `npm run dev`
- PDF: download DPR, verify all sections populate correctly

---

## Open Questions

> [!IMPORTANT]
> **LLM API Key**: Which LLM provider should the advisory engine use — OpenAI (GPT-4o), Google Gemini, or run mock advisory for demo (no API key needed)? Defaulting to **mock/stub advisory** until confirmed.

> [!IMPORTANT]
> **Flutter Platform Priority**: Generate full Flutter code for **Android + Web** (iOS excluded by default as it requires a Mac build environment). Confirm if iOS is needed.

> [!NOTE]
> **ML Model**: The XGBoost model will be trained on **synthetic rural demographic data** (no real dataset available for a hackathon). The model structure is production-ready and can be retrained with real NSSO/Census data.

> [!NOTE]
> **Authentication**: Phone OTP login in Flutter will be a **UI stub** (no live Twilio/Firebase Auth integration) to avoid external service dependencies. The admin dashboard will use a simple hardcoded token for demo.

> [!NOTE]
> **Deployment**: The plan generates a fully runnable local dev stack. Docker Compose file will be included for one-command startup.
