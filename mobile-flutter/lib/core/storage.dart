import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'gymtrack_jwt_token';
  static const _gymIdKey = 'gymtrack_gym_id';
  static const _userNameKey = 'gymtrack_user_name';
  static const _roleKey = 'gymtrack_role';

  static Future<void> saveSession({
    required String token,
    required String gymId,
    required String userName,
    required String role,
  }) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _gymIdKey, value: gymId);
    await _storage.write(key: _userNameKey, value: userName);
    await _storage.write(key: _roleKey, value: role);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  static Future<String?> getUserName() async {
    return await _storage.read(key: _userNameKey);
  }

  static Future<String?> getGymId() async {
    return await _storage.read(key: _gymIdKey);
  }

  static Future<void> clearSession() async {
    await _storage.deleteAll();
  }
}
