import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/auth_service.dart';

/// Provider for managing authentication state
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _user;
  bool _isLoading = true;
  String? _error;

  AuthProvider() {
    _init();
  }

  /// Get the current user
  User? get user => _user;

  /// Check if user is authenticated
  bool get isAuthenticated => _user != null;

  /// Check if auth state is loading
  bool get isLoading => _isLoading;

  /// Get the current error message
  String? get error => _error;

  /// Initialize auth state and listen to changes
  void _init() {
    _authService.authStateChanges.listen((User? user) {
      _user = user;
      _isLoading = false;
      notifyListeners();
    });
  }

  /// Sign up with email and password
  Future<void> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      _error = null;
      _isLoading = true;
      notifyListeners();

      await _authService.signUpWithEmail(
        email: email,
        password: password,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign in with email and password
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      _error = null;
      _isLoading = true;
      notifyListeners();

      await _authService.signInWithEmail(
        email: email,
        password: password,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign in with Google
  Future<void> signInWithGoogle() async {
    try {
      _error = null;
      _isLoading = true;
      notifyListeners();

      await _authService.signInWithGoogle();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign in with Apple
  Future<void> signInWithApple() async {
    try {
      _error = null;
      _isLoading = true;
      notifyListeners();

      await _authService.signInWithApple();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      _error = null;
      await _authService.signOut();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Clear error message
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
