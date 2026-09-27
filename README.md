# GymTrack — Gym Management SaaS Platform

> A commercial multi-tenant SaaS platform engineered for independently owned gyms in Pakistan to automate fee recovery and contactless QR entrance attendance.

---

## Executive Summary

GymTrack is an enterprise-grade, multi-tenant SaaS application designed to replace manual paper registers, lost fee payments, and fragile hardware biometrics.

### Core Problem Solved
* **Automated Fee Recovery**: Real-time tracking of member payment cycles (Paid / Unpaid / Overdue) with 1-tap personalized WhatsApp reminder generation (eliminates the need for costly third-party SMS gateways).
* **Contactless QR Entrance Attendance**: Fixed gym entrance QR poster. Authenticated members open the mobile application, scan the entrance code, and check in instantly with automated duplicate-suppression.
* **Commercial Multi-Tenancy**: Single shared-schema deployment where multiple gym businesses operate securely on the same system with strict data isolation (`gym_id`) and dynamic white-label branding (each tenant loads their custom logo, colors, and display name).

For complete conceptual and architectural details, refer to:
[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)

---

## Core System Functionalities

### 1. Automated Fee Recovery & Financial Ledger
* **Automated Monthly Billing Cycles**: System tracks member joining dates and custom billing cycle days (e.g., 1st to 28th of every month), calculating active dues on a per-member basis.
* **Dynamic Payment Status Engine**: Real-time status evaluation classifying records into `Paid`, `Due Today`, or `Overdue` (with calculated days overdue).
* **1-Tap Personalized WhatsApp Reminders**: Direct dynamic deep-link generation (`wa.me`) pre-populated with member name, specific due amount, overdue duration, and gym account details. Requires zero third-party paid SMS API subscriptions.
* **Manual Payment Recording**: Front desk staff can record incoming fee payments with timestamp, amount, and payment channel (`cash`, `easypaisa`, `jazzcash`, `bank_transfer`).
* **Financial Ledger & Analytics**: High-level financial reporting calculating total expected revenue, actual collections, outstanding receivables, and collection rates.

### 2. Contactless QR Entrance Attendance System
* **Facility-Level Entrance QR Poster**: Each gym displays a static or rotational QR poster at the entrance turnstile or door encoding a unique gym token that identifies the gym facility, not any individual member.
* **Frictionless Member Self-Check-in**: Authenticated members scan the entrance poster using their smartphone camera with zero front desk staff involvement required.
* **Server-Side Identity Verification**: Backend cross-checks the scanned facility token against the member's authenticated JWT session, verifying gym affiliation and ensuring membership status is active.
* **Anti-Duplicate Check-in Suppression**: Built-in 5-minute cooldown window preventing members from logging multiple check-ins consecutively.
* **Attendance History & Roster Auditing**: Live daily check-in roster for front desk monitoring, weekly attendance trends, and member-specific visit logs.

### 3. Shared-Schema Multi-Tenancy & Dynamic White-Labeling
* **Strict Tenant Data Isolation**: Every operational entity (`members`, `fee_records`, `attendance_records`, `users`) is permanently scoped to an indexed `gym_id`. Queries are automatically filtered by FastAPI dependency injection.
* **Dynamic White-Label UI Theming**: A single unified deployment across Web and Mobile that automatically applies the logged-in gym's brand identity (custom display name, logo URL, and primary accent color) dynamically.
* **Rapid Tenant Onboarding**: New gym businesses are onboarded through a simple data operation without spinning up separate infrastructure or databases.

### 4. Administrative Alerting & Role-Based Access Control
* **Dashboard Action Banners & Notification Bell**: Highlights urgent financial obligations immediately upon admin login, listing members with dues expiring today or past due.
* **Role-Based Permissions (RBAC)**: Segregated permissions between Gym Owners (full operational, financial, and branding control) and Front Desk Staff (attendance verification and payment recording).

---

## Technology Stack

| Layer | Technology | Specification / Purpose |
|---|---|---|
| **Backend** | Python 3.11+ / FastAPI | High-performance asynchronous REST API, JWT authentication, automated tenant scoping |
| **Database** | Supabase (PostgreSQL) | Managed cloud PostgreSQL with relational integrity and composite indexes |
| **Web Dashboard** | React (Vite SPA) | High-speed administration dashboard for gym owners and front desk staff |
| **Mobile App** | Flutter (Dart) | Cross-platform mobile app for member QR entrance check-in and gym floor staff |
| **Hosting** | Render & Vercel | Render for FastAPI backend service, Vercel for React web dashboard |

---

## Repository Structure

The project is organized into strictly segregated directories to allow a 4-member team to work concurrently without merge conflicts:

```text
SPM-GYM-APP/
├── backend/            # FastAPI REST API & Supabase integration (Backend Lead)
│   ├── app/            # Core application, models, schemas, and API routes
│   ├── requirements.txt# Pinned Python dependencies
│   ├── .env.example    # Environment variable template
│   └── venv/           # Python virtual environment (git-ignored)
├── frontend-web/       # React (Vite) Owner & Staff Web Dashboard (Web Lead)
│   └── INTEGRATION_GUIDE.md # React integration guide with Axios & endpoints
├── mobile-flutter/     # Flutter mobile app for QR entrance scanning (Mobile Lead)
│   └── INTEGRATION_GUIDE.md # Flutter integration guide with camera scanner
├── docs/               # Project architecture, concept & implementation documentation
│   └── IMPLEMENTATION_GUIDE.md
├── scripts/            # Windows automation scripts (.bat) for 1-click startup
│   ├── setup_backend.bat
│   ├── run_backend.bat
│   └── run_web.bat
├── .gitignore          # Repository git-ignore rules
└── README.md           # Project documentation root
```

---

## Team Division of Responsibilities

1. **Backend & Supabase Lead**: Owns `backend/` — Database schema, FastAPI endpoints, JWT auth, tenant scoping, and QR token logic.
2. **Web Frontend Lead**: Owns `frontend-web/` — React (Vite) dashboard UI, fee ledger views, and dynamic branding theme engine.
3. **Mobile App Lead**: Owns `mobile-flutter/` — Flutter app, camera QR entrance scanner, and check-in confirmation flow.
4. **Integration & DevOps Lead**: Owns `scripts/` and infrastructure — Cloud deployment (Render + Supabase + Vercel), cross-testing, and automation.

---

## Quickstart & Local Development

Windows batch scripts are provided in the [`scripts/`](scripts/) directory for automated operations:

### 1. Set Up Backend Environment
Execute `scripts\setup_backend.bat` or run:
```cmd
scripts\setup_backend.bat
```
This automatically verifies Python, creates the virtual environment in `backend/venv`, and installs all dependencies.

### 2. Configure Environment Variables
Copy `backend\.env.example` to `backend\.env` and supply your Supabase PostgreSQL connection string.

### 3. Start Backend Server
Execute `scripts\run_backend.bat` or run:
```cmd
scripts\run_backend.bat
```
The FastAPI backend will start at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

---

## Multi-Tenancy & Data Isolation Architecture

* Every tenant table contains a mandatory `gym_id` column.
* User authentication issues a JWT encoding `gym_id` and role permissions (`owner`, `staff`, `member`).
* All database queries automatically filter by the tenant's `gym_id`, preventing any cross-tenant data leakage.