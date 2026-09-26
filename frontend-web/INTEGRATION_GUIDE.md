# 🌐 React Web Dashboard — Backend Integration Guide

> **Target Audience**: Web Frontend Lead (Member 2)  
> **Backend Base URL (Local)**: `http://127.0.0.1:8000/api/v1`  
> **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`

---

## 📌 1. The Core Golden Rules (Zero Confusion)

1. **Authentication via Bearer Token**:
   * After logging in, the backend returns an `access_token` (JWT).
   * Save this token in `localStorage.getItem("token")`.
   * **Every subsequent request** must include the header:
     ```http
     Authorization: Bearer <access_token>
     ```
2. **Automatic Multi-Tenancy**:
   * You **never** need to manually send `gym_id` in your API requests!
   * The backend automatically extracts `gym_id` from the JWT token and isolates all data for that gym.
3. **No Per-Gym Codebases**:
   * One single React build serves all gyms.
   * On login, fetch the gym's branding details (`/gyms/me`) and apply their logo, name, and primary accent color dynamically!

---

## 🛠️ 2. Recommended API Client Setup (`src/api/client.js`)

Create this Axios client instance with automatic JWT header injection so you never have to repeat headers:

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
});

// Automatically inject JWT Bearer token into all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("gymtrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens or unauthenticated errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("gymtrack_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;
```

---

## 🎯 3. Screen-by-Screen Integration Blueprint

### Screen A: Gym Owner / Staff Login
* **Endpoint**: `POST /auth/login`
* **Request Body**:
  ```json
  {
    "email": "owner@olympia.com",
    "password": "securepassword123"
  }
  ```
* **Response**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "gym_id": "fa84be06-...",
    "role": "owner",
    "user_name": "Captain Steve"
  }
  ```
* **Frontend Action**:
  1. Store `access_token` in `localStorage`.
  2. Redirect to Dashboard `/`.

---

### Screen B: Dynamic White-Label Branding (Header & Theme)
* **Endpoint**: `GET /gyms/me`
* **Response**:
  ```json
  {
    "id": "fa84be06-...",
    "name": "Olympia Fitness Club",
    "slug": "olympia-fit-1",
    "logo_url": null,
    "primary_color": "#3B82F6"
  }
  ```
* **Frontend Action**:
  * Apply `primary_color` dynamically using CSS variables:
    ```javascript
    document.documentElement.style.setProperty("--primary-color", data.primary_color);
    ```
  * Display `data.name` in the header bar instead of hardcoded text.

---

### Screen C: Notification Bell (🔔) & Dashboard Action Banner
* **Endpoint**: `GET /fees/alerts`
* **Response**:
  ```json
  {
    "due_today_count": 2,
    "overdue_count": 3,
    "total_alerts": 5,
    "alerts": [
      {
        "fee_record_id": "dbfdedb2-...",
        "member_id": "eb8fa9f0-...",
        "member_name": "Hamza Ali",
        "phone": "923129876543",
        "amount_due": 4500.0,
        "due_date": "2026-09-05",
        "days_overdue": 21,
        "status": "overdue",
        "whatsapp_url": "https://wa.me/923129876543?text=..."
      }
    ]
  }
  ```
* **Frontend Action**:
  * Show badge number on the bell: `total_alerts`.
  * If `total_alerts > 0`, render the top banner:  
    `"⚠️ 5 Members Have Pending / Overdue Fees Today. [Review]"`
  * In the dropdown, each item has a button: `<a href={item.whatsapp_url} target="_blank">Send WhatsApp</a>`.

---

### Screen D: Fee Ledger & Mark as Paid
1. **List Fee Records**:
   * **Endpoint**: `GET /fees/records?status=overdue` (or `paid`, `unpaid`, omit query for all).
2. **Mark Fee as Paid (Cash / EasyPaisa / JazzCash)**:
   * **Endpoint**: `POST /fees/records/{fee_record_id}/mark-paid`
   * **Request Body**:
     ```json
     {
       "amount_paid": 4500.0,
       "payment_method": "cash" // or "easypaisa", "jazzcash", "bank_transfer"
     }
     ```
   * **Response**: Updated fee record with `payment_status: "paid"`.
   * **Frontend Action**: Show green toast: *"Payment recorded successfully!"*

---

### Screen E: Member Directory & Profile
1. **List Members**:
   * **Endpoint**: `GET /members?status=active&search=Hamza`
2. **Add New Member**:
   * **Endpoint**: `POST /members`
   * **Request Body**:
     ```json
     {
       "full_name": "Hamza Ali",
       "phone": "03129876543",
       "emergency_contact": "03211112233",
       "monthly_fee": 4500.0,
       "billing_cycle_day": 5
     }
     ```
3. **View Member Attendance History**:
   * **Endpoint**: `GET /attendance/members/{member_id}/history`
   * Returns list of dates and times this member checked in.
4. **View Member Payment Ledger**:
   * **Endpoint**: `GET /fees/members/{member_id}/ledger`
   * Returns full receipt history for this specific member across all months.

---

### Screen F: Entrance QR Code Poster (Ready to Print)
* **Endpoint**: `GET /gyms/qr-token`
* **Response**:
  ```json
  {
    "gym_id": "fa84be06-...",
    "gym_name": "Olympia Fitness Club",
    "qr_secret_token": "gym_olympia-fit-1_fd224ea46918a8c2"
  }
  ```
* **Frontend Action**:
  * Render the `qr_secret_token` inside a QR code canvas (using `qrcode.react` package).
  * Render Gym Name and *"Scan with GymTrack to Check In"*.
  * Add a button: `<button onClick={() => window.print()}>Print Poster</button>`.

---

## 🚦 4. Standard HTTP Status Codes Returned
* `200 OK` / `201 Created`: Request succeeded.
* `400 Bad Request`: Validation error or duplicate record. Show `error.response.data.detail`.
* `401 Unauthorized`: Token missing or expired. Redirect to `/login`.
* `403 Forbidden`: Account is inactive or role does not have permission.
* `404 Not Found`: Record not found in this gym.
