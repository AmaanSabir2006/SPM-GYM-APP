# 🏋️ GymTrack — Web Administration Portal (React SPA)

> **Owner & Front Desk Administration Dashboard**  
> **Target Role**: Web Frontend Developer (Member 2)  
> **API Base URL (Local)**: `http://127.0.0.1:8000/api/v1`  
> **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`

---

## 🎯 1. Overview & Architecture

GymTrack Web is a Single Page Application (SPA) designed for **Gym Owners** and **Front Desk Staff**. It acts as the operational hub of the gym for:
1. **Onboarding & Multi-Tenant Setup**: Registering gym businesses with isolated data.
2. **Real-time Financial Intelligence**: Tracking expected revenue, collections, and overdue dues.
3. **Automated WhatsApp Fee Recovery**: 1-tap reminders with pre-calculated amounts and payment options.
4. **Member Management**: Roster maintenance, billing cycle tracking, and attendance logs.
5. **Contactless Entrance Posters**: Generating printable QR code posters for mobile check-in.

### Key Architectural Concepts:
* **Multi-Tenant Isolation**: You never need to supply `gym_id` in your API bodies or query parameters. The backend automatically extracts `gym_id` from the owner's JWT Bearer token.
* **White-Label Personalization**: After login, the app queries `GET /gyms/me` to retrieve the gym's official name, logo, and primary accent color.

---

## 🗺️ 2. Route & Page Sitemap

| Route Path | Page Name | Primary User Purpose | Key Visible UI Components |
|---|---|---|---|
| `/login` | **Login Page** | Staff & Owner authentication | Sign-in card, Email/Password inputs, Error banner, Link to `/register` |
| `/register` | **Gym Onboarding** | New gym tenant & admin creation | Business details form, Color picker, Submit button, Link to `/login` |
| `/` | **Dashboard** | Daily command center & live analytics | Revenue KPI cards, Overdue alert banner, Attendance stats, Live check-in feed |
| `/members` | **Member Directory** | Member roster & profile management | Search bar, Status filters, Members table, "Add Member" modal, "Member History" deep-dive modal |
| `/fees` | **Fee Ledger** | Monthly billing & WhatsApp recovery | "Generate Dues" button, Status tabs, Fee records table, "Mark Paid" modal, WhatsApp action button |
| `/qr-poster` | **Entrance QR** | Printable front-door check-in poster | Printable A4 card, Dynamic QR code, Gym branding, "Print" action button |

---

## 🚀 3. Quickstart & Local Setup

```bash
# Navigate to web frontend folder
cd frontend-web

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The web app connects to the FastAPI backend running at `http://127.0.0.1:8000`.

---

## 📚 4. Detailed Integration Guide

For the exact API endpoints, request bodies, query parameters, and JSON response structures mapped to each page and UI component, refer to:
👉 **[`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)**
