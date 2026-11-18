# FoodSync AI 🍲
### AI-Powered Smart Restaurant Inventory Management & Food Redistribution Platform
*Compliant with FSSAI (Recovery and Distribution of Surplus Food) Regulations, 2019*

---

## 🌟 Executive Summary

**FoodSync AI** is a commercial-grade, full-stack SaaS platform designed to eliminate food wastage and stockout crises across commercial restaurants. By integrating three-tier AI demand forecasting, atomic First-Expired-First-Out (FEFO) inventory tracking, peer-to-peer (B2B) ingredient rebalancing, and an FSSAI-compliant surplus meal donation gateway with secure 6-digit OTP verification, FoodSync AI turns commercial kitchen waste into culinary profit and community nutrition.

---

## 🏛️ Master Architecture & Tech Stack

```
                          ┌─────────────────────────────┐
                          │   FoodSync AI Web Client    │
                          │   React 18 + Vite + Tailwind│
                          └──────────────┬──────────────┘
                                         │ REST API / JWT
                                         ▼
                          ┌─────────────────────────────┐
                          │     FastAPI Core Engine     │
                          │  Python 3.15 + Uvicorn Async │
                          └──────────────┬──────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌────────────────┐             ┌────────────────────┐            ┌─────────────────┐
│ AI Engine      │             │ SQLAlchemy ORM     │            │ FSSAI & Security │
│ Ridge / NumPy  │             │ PostgreSQL 15+     │            │ SHA-256 HMAC OTP│
│ 3-Tier Cascade │             │ 15 Relational DDL  │            │ Bcrypt + RBAC   │
└────────────────┘             └────────────────────┘            └─────────────────┘
```

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend:** FastAPI, Python 3.15, Pydantic v2, SQLAlchemy 2.0.
- **Database:** PostgreSQL 15+ (Production) / SQLite in-memory (Test runner), Alembic schema migrations.
- **AI/ML Engine:** Closed-form Ridge Regression ($X^T X + \lambda I)^{-1} X^T y$ in pure NumPy, chronological 80/20 train/test split, producing Tier 1 footfall forecasts, Tier 2 dish orders, and Tier 3 raw ingredient prep requirements.
- **Regulatory Compliance:** Mandatory human inspection gate strictly aligned with Indian FSSAI (2019) regulations.

---

## 🛡️ Six Mandatory Architectural Safeguards

1. **FSSAI Food Safety Human Verification Gate:** AI never certifies food safety. Surplus prepared meals remain in `DRAFT` status and cannot be viewed or claimed by NGOs until authorized restaurant personnel log temperature (cold-chain $\le 5^\circ\text{C}$ or hot-holding $\ge 65^\circ\text{C}$), packaging integrity, sensory inspection, and allergen disclosures.
2. **Cryptographically Secure Collection OTP:** NGO pickups issue an HMAC-SHA256 salted 6-digit OTP with a 30-minute expiration window and a strict 3-attempt lockout to prevent brute-force attacks.
3. **Pessimistic Row-Level Locking:** High-concurrency operations (B2B transfers and NGO claims) execute inside database transactions with row-level locks (`SELECT ... FOR UPDATE`) to prevent double-claiming.
4. **Atomic POS Ingredient Checkout Rollback:** POS orders deduct raw ingredient batches in strict FEFO order across Recipe Bills of Materials (BOM). If any ingredient is deficient, the transaction rolls back completely—guaranteeing zero partial deductions or inconsistent inventory states.
5. **Batch Lot & Traceability Preservation:** B2B transfers preserve the original batch lot number, received date, expiry date, and unit cost from the donor restaurant into the recipient's inventory.
6. **Isolated Demo Persona Switcher:** The one-click demo role switcher operates exclusively when `DEMO_MODE=True`. In production (`ENVIRONMENT=production`), role escalation endpoints return `HTTP 403 Forbidden`.

---

## 👥 Five Seed Restaurants & Two NGOs (Bangalore Cluster)

| Entity Name | Role | Email | FSSAI / Darpan ID | Specialty / Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **Bella Italia Trattoria** | Restaurant | `bella@foodsync.ai` | `11223344556677` | Italian cuisine; **Scenario A** Surplus Mozzarella (12 kg expiring in 48h) |
| **The Daily Grind Bistro** | Restaurant | `dailygrind@foodsync.ai` | `11223344556679` | Continental bistro; **Scenario A** Cheese Shortage (8.5 kg needed, 2.4 km away) |
| **Green Garden Cafe** | Restaurant | `greengarden@foodsync.ai` | `11223344556680` | Organic health cafe; **Scenario B** 25 prepared Quinoa Salad Bowls |
| **Royal Biryani House** | Restaurant | `royalbiryani@foodsync.ai` | `11223344556681` | Mughlai & Dum Biryani; **Scenario C** POS orders with atomic FEFO deduction |
| **Kyoto Ramen & Wok** | Restaurant | `kyoto@foodsync.ai` | `11223344556678` | Pan-Asian ramen & wok kitchen |
| **City Hope Food Rescue** | NGO | `cityhope@foodsync.ai` | `DARPAN-KA-2024-001` | Central Bangalore food rescue NGO; **Scenario B** Claiming Quinoa Bowls with OTP |
| **Metropolitan Community Kitchen** | NGO | `metrokitchen@foodsync.ai` | `DARPAN-KA-2024-002` | East Bangalore community relief kitchen |
| **Platform Administrator** | Admin | `admin@foodsync.ai` | `STATUTORY-OFFICIAL` | Super-admin command center, GMV telemetry, and immutable audit logs |

*All demo accounts share the password:* `DemoPass123!`

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- Python 3.10+ (or included `.\python_runtime\python.exe`)
- Node.js 18+ and npm
- PostgreSQL 15+ (configured in `.env`)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/foodsync_db
TEST_DATABASE_URL=sqlite:///./data/foodsync_test.db
SECRET_KEY=replace_with_your_own_random_secret
ENVIRONMENT=development
DEMO_MODE=True
PORT=8000
```

### 3. Database Migrations & Seeding
```powershell
# Run Alembic migrations to head
.\python_runtime\python.exe -m alembic upgrade head

# Seed full master dataset (5 Restaurants, 2 NGOs, Menus, Batches, Scenarios A, B, C)
.\python_runtime\python.exe -m backend.seed --test-db
```

### 4. Run Automated Test Suite (25 Tests)
```powershell
.\python_runtime\python.exe -m pytest backend\tests -v
```
*Expected Result: 25 passed in ~2.15s (100% green).*

### 5. Start Backend Server
```powershell
.\python_runtime\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at: `http://localhost:8000/docs`

### 6. Build & Run Frontend Application
```powershell
cd frontend
npm install
npm run build
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🎬 Hackathon Demonstration Script

### Walkthrough 1: Scenario A — B2B Inter-Restaurant Ingredient Exchange
1. Log in or switch to **Bella Italia Trattoria** via Settings.
2. Navigate to **B2B Exchange** (`/b2b-exchange`).
3. View the listing: **Fresh Mozzarella Cheese (12.0 kg)** expiring in 48 hours.
4. Switch persona to **The Daily Grind Bistro** (2.4 km away in HSR Layout).
5. Open **B2B Exchange** and locate Bella Italia's mozzarella listing.
6. Click **Request Transfer** for 8.5 kg.
7. Switch back to **Bella Italia**, click **Accept Request**, and dispatch with handover code.
8. Daily Grind enters handover code. **Traceability confirmed:** The 8.5 kg batch is added to Daily Grind's inventory with the exact original lot number and expiry date!

### Walkthrough 2: Scenario B — FSSAI-Inspected NGO Food Rescue
1. Switch persona to **Green Garden Cafe**.
2. Navigate to **NGO Donations & Safety Gateway** (`/donations`).
3. Notice 25 portions of **Organic Quinoa Salad Bowl** in `DRAFT` status (locked from NGOs).
4. Click **Complete FSSAI Safety Inspection Checklist**:
   - Holding temperature logged at $4.0^\circ\text{C}$ (compliant with cold-chain $\le 5^\circ\text{C}$).
   - Packaging sealed and intact.
   - Sensory check passed (odor, appearance, texture normal).
   - Allergen declaration verified.
5. Click **Certify & Publish Listing**. Status unlocks to `VERIFIED_AVAILABLE`.
6. Switch persona to **City Hope Food Rescue** (`/ngo/dashboard`).
7. The verified meal immediately appears in the feed. Click **Claim Surplus Meal for Rescue**.
8. A **6-digit collection OTP pass** (e.g., `482910`) is generated with a 30-minute validity timer.
9. Switch back to **Green Garden Cafe** and enter the OTP at the Handover Verification Desk.
10. Handover confirms, inventory updates atomically, and impact metrics update (25 meals rescued, 10 kg diverted, 25 kg CO₂e avoided).

### Walkthrough 3: Scenario C — Smart POS Billing & Atomic FEFO Rollback
1. Switch persona to **Royal Biryani House**.
2. Navigate to **Smart POS Billing** (`/billing`).
3. Add **Royal Chicken Biryani (Qty: 2)** to cart.
4. Click **Checkout & Deduct Stock**.
5. Observe the receipt breakdown: Basmati Rice and Fresh Chicken are sequentially deducted from the earliest-expiring batch first.
6. Test Safeguard 4: Try ordering 500 biryanis. The transaction immediately rolls back with an atomic stock deficit alert without touching inventory.

### Walkthrough 4: AI Demand Forecast Cascade
1. Navigate to **AI Demand Forecast** (`/predictions`).
2. Review the **Model Provenance Card**: Closed-form Ridge Regression trained on chronological data with holdout MAE of 5.77 covers and $R^2 = 0.862$.
3. View **Tier 1 (Customer Footfall)**, **Tier 2 (Menu Dish Demand)**, and **Tier 3 (Ingredient Prep BOM Requirements)**.
4. Inspect the **Surplus / Deficit Gap Analysis** showing exact quantities to prep vs current stock.
5. Click **Trigger Live Model Retraining** to demonstrate real-time adaptation from recent POS bills.

### Walkthrough 5: Platform Super-Admin Observatory
1. Switch persona to **Super Administrator** (`/admin`).
2. Review the platform-wide GMV, restaurants, NGOs, completed transfers, and active compliance status.
3. Inspect the live **Immutable Stock Audit Log** recording all stock mutations across the ecosystem.

---

## 📄 License & Regulatory Notice
FoodSync AI is designed to uphold the statutory requirements of the Food Safety and Standards Authority of India (FSSAI) and the Food Safety and Standards (Recovery and Distribution of Surplus Food) Regulations, 2019.
