import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/generate/generate_screen.dart';
import 'screens/detail/detail_screen.dart';
import 'screens/saved/saved_screen.dart';
import 'screens/home_screen.dart';
import 'models/palette.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'Kulrs',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          useMaterial3: true,
        ),
        home: const AuthWrapper(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/signup': (context) => const SignupScreen(),
          '/home': (context) => const HomeScreen(),
          '/generate': (context) => const GenerateScreen(),
          '/saved': (context) => const SavedScreen(),
        },
        onGenerateRoute: (settings) {
          if (settings.name == '/detail') {
            // Support both Palette object and Map with paletteId
            final args = settings.arguments;
            if (args is Palette) {
              return MaterialPageRoute(
                builder: (context) => DetailScreen(palette: args),
              );
            } else if (args is Map<String, dynamic>) {
              return MaterialPageRoute(
                builder: (context) => DetailScreen(
                  paletteId: args['paletteId'] as String?,
                ),
              );
            } else if (args is String) {
              return MaterialPageRoute(
                builder: (context) => DetailScreen(paletteId: args),
              );
            }
            return MaterialPageRoute(
              builder: (context) => const DetailScreen(),
            );
          }
          return null;
        },
      ),
    );
  }
}

/// Wrapper to determine which screen to show based on auth state
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    if (authProvider.isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (authProvider.isAuthenticated) {
      return const GenerateScreen();
    }

    return const LoginScreen();
  }
}
