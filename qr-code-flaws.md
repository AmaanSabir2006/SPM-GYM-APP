qr code issues in gym track
Viewed attendance.py:20-120
Viewed attendance.py:121-250
Viewed attendance.py:251-373
Viewed attendance.py:1-58
Viewed attendance.py:1-19
Searched for "check-in"
Viewed MemberScanView.jsx:1-80
Viewed MemberScanView.jsx:80-200
Viewed MemberScanView.jsx:300-380
Viewed MemberScanView.jsx:930-975
Searched for "MemberScanView"
Viewed App.jsx:25-45
Viewed MemberWelcomeModal.jsx:1-60
Searched for "welcome-card"
Viewed members.py:390-450
Searched for "def build_member_welcome_card"
Viewed members.py:20-75

Here is a senior engineer architectural and security audit of the GymTrack QR attendance system, covering backend services, frontend web applications, and mobile workflows.

---

# Architecture Overview: How It Works Today

```
[Gym Door Poster]                [Member's Phone Browser / App]               [FastAPI Backend]
 Static QR Code  <--- (Camera) --- Member opens /scan?mid=...       ---> POST /attendance/check-in
 (Facility Token)                  Fetches /public-pass-info/{id}   <--- (Validates Token & 5-min Window)
```

---

# Critical Vulnerabilities & Architectural Flaws

### 1. BOLA / IDOR in Attendance Check-In (High Security Risk)
* **Location**: [backend/app/api/v1/endpoints/attendance.py:L49-L67](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/backend/app/api/v1/endpoints/attendance.py#L49-L67)
* **The Code**:
  ```python
  member_id = check_in.member_id
  if not member_id:
      if token_payload.role == "member":
          member_id = token_payload.sub
      ...
  member_res = await db.execute(
      select(Member).where(Member.id == member_id, Member.gym_id == gym_id)
  )
  ```
* **The Flaw**: If `check_in.member_id` is supplied in the request body, the backend does **not** check whether the caller is an `admin` or `staff`. 
* **Impact**: Any authenticated member can pass any other member’s UUID and check them in ("buddy punching" or falsifying attendance logs for friends).
* **Senior Fix**:
  ```python
  if token_payload.role == "member":
      # Enforce: regular members can ONLY check in themselves
      member_id = token_payload.sub
  else:
      # Staff/admin front desk can check in arbitrary members
      member_id = check_in.member_id or token_payload.sub
  ```

---

### 2. Secret QR Token Leaked Directly to Clients
* **Location**: [backend/app/api/v1/endpoints/attendance.py:L279, L361](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/backend/app/api/v1/endpoints/attendance.py#L279)
* **The Code**:
  ```python
  return MemberPassInfoResponse(
      ...
      gym_qr_token=gym.qr_secret_token,   # <-- LEAK
  )
  ```
* **The Flaw**: When a member loads their pass info via `/attendance/member-pass-info` or `/attendance/public-pass-info/{member_id}`, the backend transmits the gym's master entrance secret (`gym_qr_token`) straight to their device.
* **Impact**: The physical poster is supposed to be the "proof of presence". Because the client already receives the token in the API response, anyone inspecting network traffic or dev tools can extract it.

---

### 3. The "Quick Test" Backdoor in Production UI
* **Location**: [frontend-web/src/views/MemberScanView.jsx:L364-L369 & L944-L960](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/frontend-web/src/views/MemberScanView.jsx#L364-L369)
* **The Code**:
  ```javascript
  const handleQuickTestEntrance = () => {
    if (passInfo?.gym_qr_token) {
      handleQrCodeScanned(passInfo.gym_qr_token);
    }
  };
  ```
* **The Flaw**: Originally built for desktop testing without a webcam, this button (`"Quick Test Entrance Check-In"`) is exposed to members on their mobile pass screen.
* **Impact**: Any member opening their WhatsApp pass link can bypass the camera entirely and check in from their couch by tapping this button.

---

### 4. Static Poster QR Code (No Anti-Replay / Spoof Protection)
* **Location**: [backend/app/models/gym.py:L19](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/backend/app/models/gym.py#L19) & [QRPosterModal.jsx:L147](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/frontend-web/src/components/QRPosterModal.jsx#L147)
* **The Flaw**: The QR code on the wall poster is 100% static (`gym.qr_secret_token`). It never rotates, expires, or changes.
* **Impact**: A member can take a photo of the entrance poster on day 1, save it to their gallery or share it in a WhatsApp group, and scan the photo from home every day to fake their attendance.

---

### 5. TOCTOU Race Condition in 5-Minute Cooldown Check
* **Location**: [backend/app/api/v1/endpoints/attendance.py:L73-L95](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/backend/app/api/v1/endpoints/attendance.py#L73-L95)
* **The Flaw**: Classic **Time-Of-Check to Time-Of-Use (TOCTOU)**:
  1. Thread A queries recent check-ins within last 5 minutes -> finds 0.
  2. Thread B queries recent check-ins within last 5 minutes -> finds 0.
  3. Both threads insert an `AttendanceRecord` and commit.
* **Senior Fix**: Add a Redis rate-limiting lock (`SET attendance:{gym_id}:{member_id} EX 300 NX`) or an atomic database constraint.

---

### 6. Public Pass Endpoint Exposes Sensitive PII & 365-Day Tokens
* **Location**: [backend/app/api/v1/endpoints/attendance.py:L289-L314](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/backend/app/api/v1/endpoints/attendance.py#L289-L314)
* **The Flaw**: `GET /attendance/public-pass-info/{member_id}` has no authentication. Anyone who has or guesses a member ID:
  - Receives their full name, phone number, fee amount, and renewal dates.
  - Automatically receives a freshly minted **365-day active JWT session token** (`role: member`).

---

### 7. Missing Check-Out & Dwell-Time Tracking
* **Location**: [backend/app/models/attendance.py:L8-L18](file:///d:/5thSem/SPM/GYM-Project/SPM-GYM-APP/backend/app/models/attendance.py#L8-L18)
* **The Flaw**: `AttendanceRecord` only stores `check_in_time`. There is no `check_out_time`.
* **Impact**: The gym has no way to know:
  - Real-time floor occupancy ("how many people are in the gym right now?").
  - Peak equipment usage hours.
  - Average member workout duration.

---

# Real-World UX & Mobile Pitfalls

1. **Browser Camera Permission Traps (HTTP vs HTTPS)**:
   - Modern mobile operating systems (iOS Safari & Android Chrome) **block camera access (`getUserMedia`)** unless served over `https://` (with an exception only for `localhost`).
   - If accessed via local LAN IP (e.g. `http://192.168.1.10:5173/scan`), the camera will fail on iOS with `NotAllowedError` or `SecurityError`.
2. **Inverted QR Architecture Comparison**:
   - **Current Pattern (Gym Poster)**: Members pull out phone -> open browser -> grant camera permission -> scan poster. *(High friction, lighting-dependent).*
   - **Industry Standard Pattern (Turnstile / Kiosk Scanner)**: Member displays their dynamic digital member pass on their phone -> Front-desk camera or turnstile scans the member. *(Zero camera permission friction for members, sub-second entry).*

---

# Recommended Action Plan (Senior Roadmap)

| Priority | Action | Effort |
| :--- | :--- | :--- |
| **Immediate (Security)** | Enforce that `role: member` can only check in `sub` (prevent BOLA). | 10 mins |
| **Immediate (Security)** | Remove `gym_qr_token` from `MemberPassInfoResponse` and remove the Quick Test button from production. | 15 mins |
| **Short-Term (Anti-Fraud)** | If using static posters, validate device geolocation (e.g., within 50m radius of gym lat/long). | 1–2 hours |
| **Medium-Term (Security)** | For reception tablets, use dynamic rotating TOTP (QR changes every 30s like WhatsApp Web). | 2–3 hours |
| **Feature (Analytics)** | Add `check_out_time` (toggle check-in / check-out on second scan) to enable a **"Live Gym Occupancy"** counter. | 1 hour |