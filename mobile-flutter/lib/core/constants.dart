import 'dart:io';

class AppConstants {
  static const String appName = 'GymTrack';

  /// Automatic local IP routing:
  /// - Android Emulator connects to PC host via 10.0.2.2
  /// - iOS Simulator / Desktop connects via 127.0.0.1
  /// - For physical devices, replace with your PC's local Wi-Fi IP (e.g. http://192.168.1.15:8000/api/v1)
  static String get apiBaseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8000/api/v1';
    } else {
      return 'http://127.0.0.1:8000/api/v1';
    }
  }
}
