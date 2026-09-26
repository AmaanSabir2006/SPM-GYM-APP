# GymTrack — Project Concept, Solution Architecture & Implementation Guide

## 1. Project Overview & Business Opportunity

**GymTrack** is a commercial, multi-tenant Software-as-a-Service (SaaS) platform tailored specifically for independently owned gyms in Pakistan.

### 1.1 The Real-World Problem
Most local gym owners manage their daily operations using paper registers, WhatsApp groups, or memory. This manual approach creates two critical pain points:
1. **Missed Revenue & Fee Recovery Delays**:
   - Members forget or delay paying their monthly gym fees.
   - Gym owners have no automated system to track who is paid, unpaid, or overdue.
   - Following up manually via individual WhatsApp messages is tedious, embarrassing, or forgotten.
2. **Attendance Tracking Inefficiency**:
   - Paper attendance registers are either forged, skipped, or forgotten.
   - Hardware biometric fingerprint scanners frequently fail due to sweaty or calloused hands in gym environments, and turnstiles are prohibitively expensive for local gym owners.
   - Gym owners have zero visibility into member churn, inactive members, or peak training hours.

### 1.2 Target Audience & Business Model
- **Target Customers**: Independent local gyms across Pakistan that currently rely on paper registers or Excel sheets.
- **SaaS Commercial Model**: Sold as a recurring subscription per gym. Because it is a commercial product aimed for sale, reliability, data isolation, and professional user experience are vital.

---

## 2. The Conceptual Solution

GymTrack solves these problems with a single, elegant cloud platform combining fee ledger automation and contactless entrance QR attendance.

```
+-------------------------------------------------------------------------------+
|                                GymTrack SaaS                                  |
|                                                                               |
|   [ Gym A: Iron Gym ]         [ Gym B: Power Fitness ]        [ Gym C ... ]   |
|   - Custom Logo & Colors      - Custom Logo & Colors                          |
|   - Isolated Members & Fees   - Isolated Members & Fees                       |
|          \                           /                              /         |
|           \                         /                              /          |
|            +-----------------------+------------------------------+           |
|                                    |                                          |
|                                    v                                          |
|                   +--------------------------------+                          |
|                   |   FastAPI Central Cloud API    |                          |
|                   |  - JWT Auth + Role Checks      |                          |
|                   |  - Automated Tenant Isolation  |                          |
|                   +----------------+---------------+                          |
|                                    |                                          |
|                                    v                                          |
|                   +--------------------------------+                          |
|                   |   Supabase Postgres Database   |                          |
|                   |  - Shared Schema               |                          |
|                   |  - Every table scoped by gym_id|                          |
|                   +--------------------------------+                          |
+-------------------------------------------------------------------------------+
```

### 2.1 Multi-Tenancy Architecture (Shared-Schema)
- **One System, Many Gyms**: We do not deploy a new server or create a new database for every new gym. One backend deployment and one database serve all gyms.
- **Data Isolation via `gym_id`**: Every table (members, fee records, attendance logs, staff) has a mandatory `gym_id` column.
- **Automatic Scoping**: When a user logs in, their JWT token contains their `gym_id`. The backend automatically scopes all database queries to that `gym_id`. Gym A can never see or access Gym B's data under any circumstance.
- **Instant Onboarding**: Onboarding a new gym requires inserting one row into the `gyms` table and creating an owner account. The gym is live within minutes without DevOps intervention.

### 2.2 Dynamic White-Label Branding
- The frontend (both Web and Mobile) is built and deployed **once**.
- When a gym owner or staff member logs in, the application fetches that specific gym's branding details:
  - Display Name
  - Gym Logo
  - Primary Accent Color
- The interface automatically adapts its colors, logo, and title to match the logged-in gym, giving gym owners the feel of their own customized software.

### 2.3 QR Attendance Mechanism
Unlike systems that require members to display a screen for desk staff to scan, GymTrack uses **Gym Entrance Scanning**:
1. The gym prints or displays a static QR code at the entrance turnstile or front desk. This QR code encodes a secure token identifying that specific gym.
2. The gym member opens their **GymTrack Mobile App** (already logged in with their account).
3. The member points their camera at the gym's entrance QR code.
4. The mobile app sends the scanned token along with the member's authenticated session to the backend.
5. The backend validates:
   - Does this member belong to this gym?
   - Is the gym token valid?
   - Has the member already checked in within the last 5 minutes? (Prevents double check-ins).
6. Check-in is logged with a precise timestamp. No front desk staff involvement is needed.

### 2.4 Automated Fee Recovery & 1-Tap WhatsApp Alerts
- **Fee States**: Members are automatically categorized into `Paid`, `Unpaid`, or `Overdue` based on their monthly billing cycle day.
- **1-Tap Dynamic WhatsApp Reminders**: In Pakistan, WhatsApp is the dominant communication channel. The platform generates dynamic WhatsApp reminder links with pre-filled professional Urdu/English templates:
  - *"Assalam-o-Alaikum [Member Name], your gym fee of Rs. [Amount] for [Gym Name] was due on [Due Date]. Kindly submit your fee or transfer via EasyPaisa/JazzCash to [Account Number]. Thank you!"*
- The gym owner or staff clicks one button to launch WhatsApp with the personalized reminder already typed out. No expensive paid SMS/WhatsApp API required for MVP!
- **Manual "Mark as Paid"**: When cash or bank transfer is received, staff marks the fee as paid in one click, recording the payment method, date, and staff ID.

---

## 3. Technology Stack & Role Division

### 3.1 Technology Choices
- **Backend**: **FastAPI (Python)** — High-performance, asynchronous REST API with automatic OpenAPI docs and Pydantic data validation.
- **Database**: **Supabase (PostgreSQL)** — Hosted cloud PostgreSQL database with relational integrity, foreign keys, and connection pooling.
- **Web Frontend**: **React (Vite SPA)** — High-speed, responsive dashboard for gym owners and desk staff accessed via any desktop or laptop browser.
- **Mobile App**: **Flutter (Dart)** — Cross-platform mobile app used by members for camera QR entrance scanning and by staff on the gym floor.
- **DevOps & Automation**: Windows `.bat` scripts for 1-click local startup, Dockerfile for Render deployment, Vercel for web hosting.

### 3.2 4-Member Team Ownership (Zero Collisions)
To allow all 4 teammates to work independently without merge conflicts:

| Member | Focus Area | Directory Owned | Primary Deliverables |
|---|---|---|---|
| **Member 1 (You)** | **Backend & Supabase Lead** | `backend/` | Supabase schema, FastAPI REST API, JWT auth, `gym_id` scoping middleware, QR check-in & fee services |
| **Member 2** | **Web Frontend Lead** | `frontend-web/` | Owner/Staff dashboard UI in React (Vite), member roster tables, fee ledger views, dynamic branding theme |
| **Member 3** | **Mobile App Lead** | `mobile-flutter/` | Flutter app, camera QR scanner screen, member check-in flow, local token persistence |
| **Member 4** | **Integration & DevOps Lead** | `scripts/` & Infra | Automation scripts, Render/Vercel configuration, WhatsApp message template engine, end-to-end testing |

---

## 4. Supabase & Backend Integration Blueprint

### How Supabase Connects to FastAPI:
1. **Cloud Database**: A Supabase project is created in the cloud. It provides a standard PostgreSQL connection URI (e.g. `postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`).
2. **Environment Variable**: The database connection string is placed in `backend/.env` (which is git-ignored for security).
3. **Async Connection Pool**: FastAPI uses SQLAlchemy 2.0 with the `asyncpg` driver to maintain an asynchronous connection pool directly to Supabase Postgres.
4. **Team Synchronization**: Any teammate working on the backend or frontend simply puts the shared Supabase connection string in their local `.env`. Everyone connects to the exact same cloud database without needing to run a local Postgres instance.

---

## 5. Phased Implementation Roadmap

### Phase 1: Environment & Repository Standardization
- Clean repository layout with isolated folders for `backend/`, `frontend-web/`, and `mobile-flutter/`.
- Python virtual environment (`venv`) inside `backend/` with all dependencies.
- Windows automation scripts (`setup_backend.bat`, `run_backend.bat`, etc.).

### Phase 2: Backend Core & Multi-Tenant Engine (Backend Lead)
- Set up Supabase PostgreSQL tables with `gym_id` foreign keys and composite indexes.
- Implement JWT authentication and automated tenant injection (`get_current_tenant`).
- Build CRUD endpoints for Members, Fees, and QR Entrance validation.

### Phase 3: Web Dashboard & Mobile Scanner (Parallel Execution)
- Web Lead builds React (Vite) dashboard consuming the backend API.
- Mobile Lead builds Flutter QR camera scanner and check-in confirmation view.

### Phase 4: Integration, WhatsApp Reminders & Cloud Deployment
- Connect Web and Mobile clients to the live backend.
- Test multi-tenant isolation (verifying Gym A cannot access Gym B's data).
- Deploy backend to Render and web frontend to Vercel.

---

## 6. Guide for Future AI Models & Collaborators (Context Preservation)

If you are an AI assistant (such as Google Gemini, Claude, or GPT) continuing work on this repository:
1. **Respect Architecture**: GymTrack is a **shared-schema multi-tenant SaaS**. Every database query and business logic operation must be strictly scoped to `gym_id`.
2. **Folder Boundaries**: Backend code lives exclusively in `backend/`, web frontend in `frontend-web/`, mobile code in `mobile-flutter/`. Do not cross-mix frameworks.
3. **Database Strategy**: Backend connects to Supabase PostgreSQL using SQLAlchemy async (`asyncpg`). Credentials belong exclusively in `backend/.env`.
4. **Simplicity Over Bloat**: Keep solutions clean, modular, and maintainable. Do not add unrequested third-party packages or unnecessary complex abstractions.
