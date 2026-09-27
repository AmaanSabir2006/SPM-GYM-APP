import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/constants.dart';
import '../core/storage.dart';

class ApiClient {
  static Future<http.Response> get(String endpoint) async {
    final token = await StorageService.getToken();
    final url = Uri.parse('${AppConstants.apiBaseUrl}$endpoint');
    return await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final token = await StorageService.getToken();
    final url = Uri.parse('${AppConstants.apiBaseUrl}$endpoint');
    return await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
  }
}
