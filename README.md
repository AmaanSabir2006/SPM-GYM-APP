# 🏋️ GymTrack — Gym Management SaaS Platform

> **A commercial multi-tenant SaaS platform built for independently owned gyms in Pakistan to automate fee recovery and contactless QR entrance attendance.**

---

## 📌 Executive Summary

GymTrack is an industrial-grade, multi-tenant SaaS application designed to replace manual paper registers, lost fee payments, and fragile hardware biometrics.

### 🌟 Core Problem Solved
* **Automated Fee Recovery**: Real-time tracking of member payment cycles (Paid / Unpaid / Overdue) with 1-tap personalized WhatsApp reminder generation (no expensive paid SMS API required).
* **Contactless QR Entrance Attendance**: Gym displays an entrance QR poster. Members open their mobile app, scan the entrance code, and check in instantly with automated duplicate-suppression.
* **Commercial Multi-Tenancy**: Single shared-schema deployment where multiple gym businesses run securely on the same system with strict data isolation (`gym_id`) and dynamic white-label branding (each gym sees their own logo, colors, and name).

For complete conceptual and architectural details, read:
👉 **[`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)**

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Python 3.11+ / FastAPI | High-performance asynchronous REST API, JWT auth, automated multi-tenant scoping |
| **Database** | Supabase (PostgreSQL) | Managed cloud PostgreSQL with relational integrity and composite indexes |
| **Web Dashboard** | React (Vite SPA) | Fast browser-based administration dashboard for gym owners and desk staff |
| **Mobile App** | Flutter (Dart) | Cross-platform mobile app for member QR entrance check-in and gym floor staff |
| **Hosting** | Render & Vercel | Render for FastAPI backend, Vercel for React web dashboard |

---

## 📂 Repository Structure

The project is organized into strictly separated directories to allow a 4-member team to work in parallel without code collisions:

```text
SPM-GYM-APP/
├── backend/            # FastAPI REST API & Supabase integration (Backend Lead)
│   ├── app/            # Application core, models, schemas, and API routes
│   ├── requirements.txt# Python dependencies
│   ├── .env.example    # Environment variable template
│   └── venv/           # Python virtual environment (git-ignored)
├── frontend-web/       # React (Vite) Owner & Staff Web Dashboard (Web Lead)
├── mobile-flutter/     # Flutter mobile app for QR entrance scanning (Mobile Lead)
├── docs/               # Project concept, architecture & implementation guide
│   └── IMPLEMENTATION_GUIDE.md
├── scripts/            # Windows automation scripts (.bat) for 1-click startup
│   ├── setup_backend.bat
│   ├── run_backend.bat
│   └── run_web.bat
├── .gitignore          # Repository git-ignore rules
└── README.md           # This file
```

---

## 👥 4-Member Team Ownership

1. **Backend & Supabase Lead** (You): Owns `backend/` — Database schema, FastAPI endpoints, JWT auth, tenant scoping, and QR token logic.
2. **Web Frontend Lead**: Owns `frontend-web/` — React (Vite) dashboard UI, fee ledger screens, and dynamic branding theme engine.
3. **Mobile App Lead**: Owns `mobile-flutter/` — Flutter app, camera QR entrance scanner, and check-in status flow.
4. **Integration & DevOps Lead**: Owns `scripts/` and deployment — Cloud hosting (Render + Supabase + Vercel), cross-testing, and automation.

---

## ⚡ Quickstart & Local Automation

Windows batch scripts are provided in the [`scripts/`](scripts/) directory for easy 1-click operations:

### 1. Set Up Backend (Virtual Environment & Dependencies)
Double-click `scripts\setup_backend.bat` or run:
```cmd
scripts\setup_backend.bat
```
This automatically creates the Python `venv` inside `backend/` and installs all dependencies.

### 2. Configure Environment Variables
Copy `backend\.env.example` to `backend\.env` and paste your Supabase PostgreSQL connection string.

### 3. Run Backend Server
Double-click `scripts\run_backend.bat` or run:
```cmd
scripts\run_backend.bat
```
The FastAPI backend will start at `http://127.0.0.1:8000` with interactive API docs available at `http://127.0.0.1:8000/docs`.

---

## 🔒 Multi-Tenancy & Security
* Every tenant table contains a mandatory `gym_id` column.
* User authentication issues a JWT containing `gym_id` and role permissions (`owner`, `staff`, `member`).
* All database queries automatically filter by the tenant's `gym_id`, preventing any data leakage across gyms.