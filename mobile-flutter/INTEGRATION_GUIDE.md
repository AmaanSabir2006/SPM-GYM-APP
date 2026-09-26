# 📱 Flutter Mobile App — Backend Integration Guide

> **Target Audience**: Mobile Lead (Member 3)  
> **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`

---

## ⚠️ 1. Critical Mobile Network Rule (Emulator vs Device IP)

When testing from a mobile phone or emulator, **never use `localhost`**, because `localhost` refers to the mobile phone itself!

| Testing Environment | Base URL to Use in Flutter |
|---|---|
| **Android Emulator** | `http://10.0.2.2:8000/api/v1` *(Special alias to your PC)* |
| **iOS Simulator** | `http://127.0.0.1:8000/api/v1` |
| **Physical Android/iPhone** | `http://<YOUR_PC_WIFI_IP>:8000/api/v1` *(e.g. `http://192.168.1.15:8000/api/v1`)* |
| **Production / Staging** | `https://api.gymtrack.pk/api/v1` *(Render cloud URL)* |

---

## 📌 2. Core Mobile Workflow & User Authentication

1. **Member / Staff Login**:
   * Member logs into their account once.
   * Backend returns an `access_token` (JWT).
   * Store it securely using `flutter_secure_storage` or `shared_preferences`.
2. **Every API Request**:
   * Add the header:
     ```dart
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer $storedToken',
     }
     ```

---

## 📷 3. Contactless QR Entrance Check-in (The Main Mobile Feature)

### How It Works:
1. The gym has a printed poster at the entrance door encoding the gym token (e.g. `gym_olympia-fit-1_fd224ea46918a8c2`).
2. The member taps **"Scan Entrance QR"** in the app.
3. The camera scanner (e.g. using `mobile_scanner` package) detects the code.
4. The app sends the scanned string to the backend:

* **Endpoint**: `POST /attendance/check-in`
* **Headers**: `Authorization: Bearer <member_token>`
* **Request Body**:
  ```json
  {
    "gym_qr_token": "gym_olympia-fit-1_fd224ea46918a8c2"
  }
  ```

### Handling the Backend Response in Flutter:

```dart
if (response.statusCode == 200) {
  // 🟢 SUCCESS: Check-in verified!
  final data = jsonDecode(response.body);
  showSuccessDialog(
    title: "Check-in Successful!",
    message: data['message'], // e.g. "Welcome to Olympia Fitness, Hamza Ali!"
  );
} 
else if (response.statusCode == 429) {
  // 🟡 ANTI-DUPLICATE WARNING: Scanned within last 5 minutes
  showWarningDialog(
    title: "Already Checked In",
    message: "You have already checked in recently. Please wait a few minutes before scanning again.",
  );
} 
else if (response.statusCode == 403) {
  // 🔴 INACTIVE MEMBERSHIP:
  showErrorDialog(
    title: "Membership Inactive",
    message: "Your membership is inactive or suspended. Please see the front desk.",
  );
} 
else if (response.statusCode == 400) {
  // 🔴 INVALID CODE:
  showErrorDialog(
    title: "Invalid QR Code",
    message: "This QR code does not belong to your gym.",
  );
}
```

---

## 🛠️ 4. Copy-Pasteable Flutter Service Template (`lib/services/attendance_service.dart`)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AttendanceService {
  // Replace with 10.0.2.2 for Android Emulator, or your PC IP for physical phone
  static const String baseUrl = 'http://10.0.2.2:8000/api/v1';
  final _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> checkInWithGymQR(String scannedQrToken) async {
    final token = await _storage.read(key: 'access_token');
    
    if (token == null) {
      throw Exception('User is not logged in');
    }

    final url = Uri.parse('$baseUrl/attendance/check-in');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'gym_qr_token': scannedQrToken,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200) {
      return {'success': true, 'message': data['message']};
    } else if (response.statusCode == 429) {
      return {'success': false, 'type': 'duplicate', 'message': data['detail']};
    } else {
      return {'success': false, 'type': 'error', 'message': data['detail'] ?? 'Check-in failed'};
    }
  }
}
```

---

## 📊 5. Staff Floor Quick-View Endpoints (For Gym Staff on Mobile)
If a staff member or owner logs into the mobile app:
* **Today's Check-ins**: `GET /attendance/today` — returns list of who checked in today.
* **Weekly Attendance Stats**: `GET /attendance/stats` — returns total today, weekly count, and unique active members.
* **Gym Branding**: `GET /gyms/me` — returns gym name, logo, and primary color to style the mobile app header dynamically.
