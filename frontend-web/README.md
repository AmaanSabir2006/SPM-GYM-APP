# GymTrack — Web Frontend (React + Vite)

> **Owner & Staff Administration Portal**  
> **Lead**: Web Frontend Lead (Member 2)

## 🎯 Scope of Work
- **Tech Stack**: React 18+, Vite, Vanilla CSS.
- **Audience**: Gym Owners and Front Desk Staff accessing from any browser.
- **Key Screens**:
  1. **Login & Gym Onboarding**: Authenticate and retrieve JWT token.
  2. **Owner Dashboard**: High-level financial KPIs (Expected vs. Collected, Pending/Overdue counts, Today's attendance).
  3. **Member Directory**: Table of registered members, filterable by active/inactive status, quick search by phone.
  4. **Fee Recovery & Ledger**: List of monthly fee dues, manual "Mark as Paid" modal, and 1-tap WhatsApp reminder trigger.
  5. **Entrance QR Code Screen**: View/print the Gym Entrance QR poster encoding the gym token.
  6. **Dynamic White-Label Branding**: On login, call `/api/v1/gyms/me` to retrieve gym logo, name, and accent color (`primary_color`), applying it across the UI dynamically.

## 🚀 Getting Started
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The app will connect to the FastAPI backend running at `http://127.0.0.1:8000`.
