import 'dart:convert';
import 'api_client.dart';

class AttendanceService {
  /// Scans gym entrance QR code token and checks in
  static Future<Map<String, dynamic>> checkIn(String gymQrToken) async {
    try {
      final response = await ApiClient.post('/attendance/check-in', {
        'gym_qr_token': gymQrToken,
      });

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Check-in successful!',
        };
      } else if (response.statusCode == 429) {
        return {
          'success': false,
          'type': 'duplicate',
          'message': data['detail'] ?? 'Already checked in recently. Please wait a few minutes.',
        };
      } else {
        return {
          'success': false,
          'type': 'error',
          'message': data['detail'] ?? 'Check-in failed.',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'type': 'network',
        'message': 'Unable to connect to gym server. Please check your internet or Wi-Fi.',
      };
    }
  }

  /// Fetch today's check-ins for staff view
  static Future<List<dynamic>> getTodayAttendance() async {
    final response = await ApiClient.get('/attendance/today');
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    }
    return [];
  }
}
