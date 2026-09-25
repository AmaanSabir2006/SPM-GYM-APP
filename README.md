# Gym Management & Ledger System

A lightweight, mobile-first web application designed to help local gym owners manage member attendance and track financial ledgers. This system replaces manual paper registers and fragile hardware with smartphone-based QR scanning and automated fee recovery workflows.

## 🚀 Core Features

*   **Mobile-Optimized Dashboard:** A high-contrast interface built specifically for quick, one-handed operation by gym owners at the front desk.
*   **QR Code Attendance:** Generate unique digital QR codes for members. Scan them directly via a smartphone camera to log daily check-ins and instantly verify fee status.
*   **Automated Fee Alerts:** Track pending and overdue memberships, and recover lost revenue using 1-tap dynamic WhatsApp reminder links (no paid API required).
*   **Financial Ledger:** Monitor active rosters, expected revenue, and operational expenses to calculate real-time net profit.

## 🛠️ Tech Stack

**Frontend**
*   Next.js (React)
*   Tailwind CSS (Utility-first styling)
*   Lucide React (UI Icons)
*   HTML5-QRCode (Camera scanner integration)

**Backend & Database**
*   Python 
*   FastAPI (High-performance backend routing)
*   SQLite & SQLAlchemy ORM (Lightweight local database)

## 📂 Project Structure

```text
├── frontend/             # Next.js frontend application
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable UI components
│   └── package.json      # Frontend dependencies
└── backend/              # FastAPI Python server
    ├── main.py           # API endpoints and application logic
    ├── models.py         # SQLAlchemy database models
    ├── schemas.py        # Pydantic validation schemas
    ├── database.py       # SQLite connection setup
    └── requirements.txt  # Python dependencies