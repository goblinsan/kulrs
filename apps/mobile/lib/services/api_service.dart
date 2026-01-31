import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../config/env.dart';
import '../models/palette.dart';

/// Service for making API calls to the backend
class ApiService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Get authorization header with Firebase ID token
  Future<Map<String, String>> _getHeaders() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }

    final token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// Generate palette from base color
  Future<Palette> generateFromColor({
    required OKLCHColor color,
    int colorCount = 5,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/generate/color');

    final response = await http.post(
      url,
      headers: headers,
      body: jsonEncode({
        'color': color.toJson(),
        'colorCount': colorCount,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to generate palette: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return Palette.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Generate palette from mood text
  Future<Palette> generateFromMood({
    required String mood,
    String? seed,
    int colorCount = 5,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/generate/mood');

    final response = await http.post(
      url,
      headers: headers,
      body: jsonEncode({
        'mood': mood,
        if (seed != null) 'seed': seed,
        'colorCount': colorCount,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to generate palette: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return Palette.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Generate palette from image pixel data
  Future<Palette> generateFromImage({
    required List<List<int>> pixels,
    int colorCount = 5,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/generate/image');

    final response = await http.post(
      url,
      headers: headers,
      body: jsonEncode({
        'pixels': pixels,
        'colorCount': colorCount,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to generate palette: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return Palette.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Save a palette
  Future<Palette> savePalette(Palette palette) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/palettes');

    final response = await http.post(
      url,
      headers: headers,
      body: jsonEncode(palette.toJson()),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to save palette: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return Palette.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Like a palette
  Future<void> likePalette(String paletteId) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/palettes/$paletteId/like');

    final response = await http.post(url, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to like palette: ${response.body}');
    }
  }

  /// Unlike a palette
  Future<void> unlikePalette(String paletteId) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/palettes/$paletteId/like');

    final response = await http.delete(url, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to unlike palette: ${response.body}');
    }
  }

  /// Remix a palette
  Future<Palette> remixPalette(String paletteId) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/palettes/$paletteId/remix');

    final response = await http.post(url, headers: headers);

    if (response.statusCode != 201) {
      throw Exception('Failed to remix palette: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return Palette.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Get palette by ID
  Future<Palette> getPalette(String paletteId) async {
    final headers = await _getHeaders();
    final url = Uri.parse('${EnvConfig.apiUrl}/palettes/$paletteId');

    final response = await http.get(url, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to get palette: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return Palette.fromJson(data['data'] as Map<String, dynamic>);
  }

  /// Browse public palettes
  Future<List<Palette>> browsePalettes({
    String sort = 'recent',
    int limit = 20,
    int offset = 0,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse(
        '${EnvConfig.apiUrl}/palettes?sort=$sort&limit=$limit&offset=$offset');

    final response = await http.get(url, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to browse palettes: ${response.body}');
    }

    final data = jsonDecode(response.body);
    final palettes = (data['data'] as List<dynamic>)
        .map((p) => Palette.fromJson(p as Map<String, dynamic>))
        .toList();

    return palettes;
  }

  /// Get user's palettes
  Future<List<Palette>> getMyPalettes({
    int limit = 20,
    int offset = 0,
  }) async {
    final headers = await _getHeaders();
    final url =
        Uri.parse('${EnvConfig.apiUrl}/palettes/my?limit=$limit&offset=$offset');

    final response = await http.get(url, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to get user palettes: ${response.body}');
    }

    final data = jsonDecode(response.body);
    final palettes = (data['data'] as List<dynamic>)
        .map((p) => Palette.fromJson(p as Map<String, dynamic>))
        .toList();

    return palettes;
  }
}
