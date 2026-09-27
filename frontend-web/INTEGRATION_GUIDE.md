# 🌐 GymTrack React Web SPA — Complete API Integration Blueprint

> **Target Audience**: Web Frontend Developer (Member 2)  
> **Backend Base URL (Local)**: `http://127.0.0.1:8000/api/v1`  
> **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`

---

## 📌 1. The Core Architectural Rules

1. **Authentication via JWT Bearer Token**:
   * After logging in or registering, the backend returns an `access_token` (JWT).
   * Save this token in browser storage: `localStorage.setItem("gymtrack_token", data.access_token)`.
   * **Every subsequent API request** must include the authorization header:
     ```http
     Authorization: Bearer <access_token>
     ```
2. **Automatic Multi-Tenancy**:
   * **Never send `gym_id`** in your API request bodies or query parameters!
   * The backend extracts the `gym_id` directly from the JWT Bearer token and automatically isolates all records for that specific gym.
3. **Dynamic White-Label Identity**:
   * A single React build serves all gym clients.
   * Upon login, query `GET /gyms/me` to load the gym's official name, logo, and primary color (`primary_color`).

---

## 🛠️ 2. Recommended API Client (`src/api/client.js`)

Create this Axios instance with automatic token injection and unauthenticated session redirection:

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
});

// Automatically inject JWT Bearer token into all outgoing requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("gymtrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle token expiration (401 Unauthorized)
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

## 🗺️ 3. Feature-by-Feature & Page-by-Page Integration

---

### 🌐 Global Layout: Header & App Navigation
*Visible across all protected routes (`/`, `/members`, `/fees`, `/qr-poster`).*

#### A. Fetch Gym Identity & Theme Branding
* **Endpoint**: `GET /gyms/me`
* **When to call**: Once upon initial page load after authentication.
* **Response `(200 OK)`**:
  ```json
  {
    "id": "c96e2a44-c09e-4b6f-a666-57fa1c4a5050",
    "name": "Be Strong Fitness Club",
    "slug": "be-strong",
    "logo_url": null,
    "primary_color": "#E11D48"
  }
  ```
* **UI Action**:
  * Set `--primary-color` in CSS or root style for buttons, badges, and accents.
  * Render `name` in the header bar and window title.

#### B. Overdue Notifications Bell (🔔) & Alert Dropdown
* **Endpoint**: `GET /fees/alerts`
* **When to call**: On page load and when opening the notification bell.
* **Response `(200 OK)`**:
  ```json
  {
    "due_today_count": 2,
    "overdue_count": 3,
    "total_alerts": 5,
    "alerts": [
      {
        "fee_record_id": "8d7a31b2-...",
        "member_id": "eb8fa9f0-...",
        "member_name": "Hamza Ali",
        "phone": "923129876543",
        "amount_due": 3000.0,
        "due_date": "2026-09-20",
        "days_overdue": 7,
        "status": "overdue",
        "whatsapp_url": "https://wa.me/923129876543?text=..."
      }
    ]
  }
  ```
* **UI Action**:
  * Display `total_alerts` count badge over the bell icon.
  * Inside dropdown, render each member with amount and a 1-tap `<a href={item.whatsapp_url} target="_blank">Send WhatsApp</a>` button.

---

### 📄 Page 1: Staff & Owner Login (`/login`)
*Handles authentication and stores the JWT session.*

* **Endpoint**: `POST /auth/login`
* **Trigger**: Owner/Staff submits the login form.
* **Request Body**:
  ```json
  {
    "email": "owner@bestrong.com",
    "password": "Password123!"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "gym_id": "c96e2a44-c09e-4b6f-a666-57fa1c4a5050",
    "role": "owner",
    "user_name": "Hamza Ali"
  }
  ```
* **UI Action**:
  * Save `access_token` to `localStorage`.
  * Redirect user to Dashboard (`/`).
  * On error (`401 Unauthorized`), show: *"Incorrect email or password"*.

---

### 📄 Page 2: Gym Onboarding & Registration (`/register`)
*Enables a new gym owner to register their gym and create an owner admin account.*

* **Endpoint**: `POST /auth/register-gym`
* **Trigger**: Submitting the registration form.
* **Request Body**:
  ```json
  {
    "gym_name": "Be Strong Fitness",
    "gym_slug": "be-strong",
    "primary_color": "#E11D48",
    "owner_name": "Hamza Ali",
    "owner_email": "owner@bestrong.com",
    "owner_phone": "03001234567",
    "owner_password": "Password123!"
  }
  ```
* **Response `(201 Created)`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "gym_id": "c96e2a44-c09e-4b6f-a666-57fa1c4a5050",
    "role": "owner",
    "user_name": "Hamza Ali"
  }
  ```
* **UI Action**:
  * Automatically store `access_token` and redirect to Dashboard (`/`).
  * On error (`400 Bad Request`), display: *"A gym with this slug or email already exists"*.

---

### 📄 Page 3: Owner Dashboard (`/` or `/dashboard`)
*The central command center showing financial KPIs, urgent overdue banners, and live attendance feeds.*

#### A. Overdue Action Banner
* **Endpoint**: `GET /fees/alerts`
* **UI Action**: If `total_alerts > 0`, display a prominent warning banner at the top of the dashboard:  
  `"⚠️ ${total_alerts} Members have overdue / pending fees today. [Review & Alert]"`

#### B. Financial KPI Cards Grid
* **Endpoint**: `GET /fees/overview`
* **When to call**: On dashboard load.
* **Response `(200 OK)`**:
  ```json
  {
    "total_expected_revenue": 150000.0,
    "total_collected_revenue": 115000.0,
    "total_pending_revenue": 35000.0,
    "collection_rate_percentage": 76.67,
    "paid_count": 23,
    "unpaid_count": 4,
    "overdue_count": 3
  }
  ```
* **UI Action**:
  * Card 1: **Expected Revenue**: `Rs. 150,000`
  * Card 2: **Collected Revenue**: `Rs. 115,000`
  * Card 3: **Pending / Overdue**: `Rs. 35,000`
  * Card 4: **Collection Rate**: `76.7%`

#### C. Attendance Analytics Cards
* **Endpoint**: `GET /attendance/stats`
* **When to call**: On dashboard load.
* **Response `(200 OK)`**:
  ```json
  {
    "total_today": 18,
    "weekly_count": 94,
    "unique_members_this_week": 42
  }
  ```
* **UI Action**:
  * Render **Check-ins Today** (`18`), **Weekly Volume** (`94`), and **Unique Active Members** (`42`).

#### D. Live Front Desk Check-in Feed
* **Endpoint**: `GET /attendance/today`
* **When to call**: On dashboard load (optionally polling every 30-60 seconds).
* **Response `(200 OK)`**:
  ```json
  [
    {
      "id": "att-uuid-1",
      "gym_id": "c96e2a44-...",
      "member_id": "mem-uuid-1",
      "check_in_time": "2026-09-27T14:35:10Z",
      "check_in_method": "qr_scan",
      "message": "Welcome to Be Strong, Bilal Ahmed!"
    }
  ]
  ```
* **UI Action**: Display a real-time table of today's check-ins with member ID, timestamp, and method.

---

### 📄 Page 4: Member Directory (`/members`)
*Allows staff to search, filter, register, edit members, and view member histories.*

#### A. List & Search Members
* **Endpoint**: `GET /members`
* **Query Parameters**:
  * `status`: (Optional) Filter by `"active"`, `"inactive"`, or `"suspended"`.
  * `search`: (Optional) Live text search by name or phone number.
* **Example**: `GET /members?status=active&search=Bilal`
* **Response `(200 OK)`**:
  ```json
  [
    {
      "id": "mem-uuid-1",
      "gym_id": "c96e2a44-...",
      "full_name": "Bilal Ahmed",
      "phone": "03123456789",
      "emergency_contact": "03009876543",
      "monthly_fee": 3000.0,
      "billing_cycle_day": 1,
      "join_date": "2026-09-01",
      "status": "active"
    }
  ]
  ```

#### B. Register New Member
* **Endpoint**: `POST /members`
* **Trigger**: Clicking "Save Member" in the Add Member Modal.
* **Request Body**:
  ```json
  {
    "full_name": "Usman Tariq",
    "phone": "03214567890",
    "emergency_contact": "03001122334",
    "monthly_fee": 3500.0,
    "billing_cycle_day": 5,
    "join_date": "2026-09-27"
  }
  ```
* **Response `(201 Created)`**: Returns the new member object.
* **UI Action**: Close modal, display success toast, and refresh member table.

#### C. Edit Member Profile
* **Endpoint**: `PUT /members/{member_id}`
* **Trigger**: Submitting the Edit Member Modal.
* **Request Body** *(all fields optional)*:
  ```json
  {
    "phone": "03219998877",
    "monthly_fee": 4000.0,
    "billing_cycle_day": 5,
    "status": "active"
  }
  ```
* **Response `(200 OK)`**: Updated member object.

#### D. Member Deep-Dive: Attendance History Modal
* **Endpoint**: `GET /attendance/members/{member_id}/history?limit=50`
* **Response `(200 OK)`**:
  ```json
  {
    "member_id": "mem-uuid-1",
    "member_name": "Bilal Ahmed",
    "total_check_ins": 14,
    "history": [
      {
        "id": "att-1",
        "gym_id": "c96e2a44-...",
        "member_id": "mem-uuid-1",
        "check_in_time": "2026-09-27T10:15:00Z",
        "check_in_method": "qr_scan",
        "message": "Welcome!"
      }
    ]
  }
  ```

#### E. Member Deep-Dive: Payment Receipts Ledger Modal
* **Endpoint**: `GET /fees/members/{member_id}/ledger`
* **Response `(200 OK)`**: Chronological list of all fee receipts, amounts paid, payment dates, and payment methods for this member.

---

### 📄 Page 5: Fee Ledger & Revenue Recovery (`/fees`)
*Tracks monthly billing, records payments, and triggers 1-tap WhatsApp reminders.*

#### A. Generate Monthly Dues (Automated Billing Generator)
* **Endpoint**: `POST /fees/generate-monthly-dues`
* **Trigger**: Clicking the top action button **"Generate Monthly Dues"** (used at start of month).
* **Response `(200 OK)`**:
  ```json
  {
    "message": "Successfully generated 45 monthly fee records for active members.",
    "created_count": 45
  }
  ```
* **UI Action**: Display success banner and refresh fee table.

#### B. List Fee Records
* **Endpoint**: `GET /fees/records`
* **Query Parameters**:
  * `status`: (Optional) `"unpaid"`, `"overdue"`, or `"paid"`.
  * `member_id`: (Optional) Filter by specific member.
* **Response `(200 OK)`**:
  ```json
  [
    {
      "id": "fee-record-uuid-1",
      "gym_id": "c96e2a44-...",
      "member_id": "mem-uuid-1",
      "amount_due": 3000.0,
      "amount_paid": 0.0,
      "due_date": "2026-09-01",
      "payment_status": "overdue",
      "payment_method": null,
      "payment_date": null
    }
  ]
  ```

#### C. Mark Fee as Paid (Payment Desk Modal)
* **Endpoint**: `POST /fees/records/{record_id}/mark-paid`
* **Trigger**: Submitting the "Mark as Paid" dialog.
* **Request Body**:
  ```json
  {
    "amount_paid": 3000.0,
    "payment_method": "cash" // or "easypaisa", "jazzcash", "bank_transfer"
  }
  ```
* **Response `(200 OK)`**: Returns updated fee record with `payment_status: "paid"`.

#### D. Dynamic 1-Tap WhatsApp Reminder
* **Endpoint**: `GET /fees/records/{record_id}/whatsapp-reminder`
* **Trigger**: Clicking the WhatsApp icon on any unpaid/overdue row.
* **Response `(200 OK)`**:
  ```json
  {
    "whatsapp_url": "https://wa.me/923123456789?text=Assalam-o-Alaikum%20Bilal...",
    "message_template": "Assalam-o-Alaikum Bilal Ahmed,\n\nThis is a gentle reminder regarding your monthly membership fee for Be Strong..."
  }
  ```
* **UI Action**: Immediately open `whatsapp_url` in a new browser tab (`window.open(data.whatsapp_url, "_blank")`).

---

### 📄 Page 6: Entrance QR Code Poster (`/qr-poster`)
*Generates the printable entrance poster for contactless mobile check-in.*

#### A. Fetch Gym Entrance QR Secret Token
* **Endpoint**: `GET /gyms/qr-token`
* **Response `(200 OK)`**:
  ```json
  {
    "gym_id": "c96e2a44-c09e-4b6f-a666-57fa1c4a5050",
    "gym_name": "Be Strong Fitness Club",
    "qr_secret_token": "gym_be-strong_8f4ba627d091e92c"
  }
  ```
* **UI Action**:
  * Render `qr_secret_token` inside a QR Canvas (e.g. using `qrcode.react`).
  * Display Gym Name and clear instructions.
  * Add a **"Print Poster"** button that invokes `window.print()`.

#### B. Front Desk Manual Member Check-in (Backup for forgotten phones)
* **Endpoint**: `POST /attendance/check-in`
* **Trigger**: Front desk staff manually checks in a member who doesn't have their phone.
* **Request Body**:
  ```json
  {
    "gym_qr_token": "gym_be-strong_8f4ba627d091e92c",
    "member_id": "mem-uuid-1"
  }
  ```
* **Response `(200 OK)`**:
  ```json
  {
    "id": "att-uuid-2",
    "gym_id": "c96e2a44-...",
    "member_id": "mem-uuid-1",
    "check_in_time": "2026-09-27T15:40:00Z",
    "check_in_method": "qr_scan",
    "message": "Welcome to Be Strong Fitness Club, Bilal Ahmed!"
  }
  ```
* **Anti-Duplicate Check (HTTP 429)**: If scanned twice within 5 minutes, backend returns:  
  `"You have already checked in recently. Please wait a few minutes before scanning again."`

---

## 🚦 4. Standard HTTP Response Codes

| Status Code | Meaning | Frontend Handling |
|---|---|---|
| `200 OK` | Request succeeded | Update UI / table data |
| `201 Created` | Record created | Show success toast, close modal, refresh list |
| `400 Bad Request` | Validation failure / duplicate slug/email | Display `error.response.data.detail` in form error banner |
| `401 Unauthorized` | Missing, invalid, or expired JWT | Clear token and redirect to `/login` |
| `403 Forbidden` | Inactive user account or suspended member | Show access denied message |
| `404 Not Found` | Tenant or record not found | Show "Record not found" state |
| `429 Too Many Requests` | Anti-duplicate scan threshold hit | Show warning banner: *"Already checked in recently"* |
