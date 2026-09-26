# GymTrack — Mobile Application (Flutter)

> **Member QR Entrance Check-in & Floor Staff Application**  
> **Lead**: Mobile Lead (Member 3)

## 🎯 Scope of Work
- **Tech Stack**: Flutter 3.x (Dart).
- **Audience**:
  1. **Gym Members**: Camera QR scanner to scan the gym's entrance poster for instant contactless check-in.
  2. **Gym Floor Staff**: View real-time today's check-ins and member fee validity on a phone.
- **Key Flows**:
  1. **Member Login**: Store JWT token securely via `flutter_secure_storage`.
  2. **Entrance QR Scanner**: Camera scanner widget (e.g. `mobile_scanner` or `qr_code_scanner`) scanning the poster displayed at gym entrance.
  3. **Check-In Feedback**: Instant green/red confirmation dialog displaying check-in timestamp and greeting.
  4. **Duplicate Warning**: Shows alert if scanned within the 5-minute anti-duplicate window.
  5. **Dynamic Branding**: Fetches gym accent color and logo from `/api/v1/gyms/me` upon login.

## 🚀 Getting Started
```bash
# Get Flutter packages
flutter pub get

# Run on emulator or physical phone
flutter run
```
Connects to the FastAPI backend API base URL (e.g. `http://10.0.2.2:8000` on Android emulator or local network IP).
