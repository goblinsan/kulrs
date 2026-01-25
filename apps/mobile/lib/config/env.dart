/// Environment configuration for the mobile application
/// This demonstrates how to access build-time environment variables via --dart-define

class EnvConfig {
  /// Valid application environments
  static const List<String> validEnvironments = [
    'development',
    'staging',
    'production',
  ];

  /// API base URL (required)
  /// Set via: --dart-define=API_URL=https://api.kulrs.com
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.kulrs.com',
  );

  /// Application environment (development, staging, production)
  /// Set via: --dart-define=APP_ENV=development
  static const String appEnv = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'production',
  );

  /// Enable analytics tracking
  /// Set via: --dart-define=ENABLE_ANALYTICS=true
  static const bool enableAnalytics = bool.fromEnvironment(
    'ENABLE_ANALYTICS',
    defaultValue: true,
  );

  /// Check if running in development mode
  static bool get isDevelopment => appEnv == 'development';

  /// Check if running in staging mode
  static bool get isStaging => appEnv == 'staging';

  /// Check if running in production mode
  static bool get isProduction => appEnv == 'production';

  /// Validate environment configuration
  /// Call this early in your application bootstrap
  static void validate() {
    if (apiUrl.isEmpty) {
      throw Exception('API_URL environment variable is required');
    }

    if (!validEnvironments.contains(appEnv)) {
      print(
        'Warning: Invalid APP_ENV: $appEnv. '
        'Should be one of: ${validEnvironments.join(', ')}',
      );
    }
  }

  /// Print configuration (for debugging)
  /// Only use in development mode
  static void printConfig() {
    if (isDevelopment) {
      print('=== Environment Configuration ===');
      print('API URL: $apiUrl');
      print('Environment: $appEnv');
      print('Analytics: $enableAnalytics');
      print('================================');
    }
  }
}
