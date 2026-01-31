import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';

/// Screen for generating color palettes
class GenerateScreen extends StatefulWidget {
  const GenerateScreen({super.key});

  @override
  State<GenerateScreen> createState() => _GenerateScreenState();
}

class _GenerateScreenState extends State<GenerateScreen> {
  bool _isGenerating = false;

  Future<void> _generatePalette() async {
    setState(() {
      _isGenerating = true;
    });

    // TODO: Implement palette generation logic
    await Future.delayed(const Duration(seconds: 1));

    if (mounted) {
      setState(() {
        _isGenerating = false;
      });
    }
  }

  void _navigateToSaved() {
    Navigator.of(context).pushNamed('/saved');
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Generate',
        actions: [
          IconButton(
            icon: const Icon(Icons.bookmark_border),
            onPressed: _navigateToSaved,
            tooltip: 'Saved Palettes',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await authProvider.signOut();
            },
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.palette,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 32),
              const Text(
                'Generate Color Palettes',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                'Create beautiful color palettes with AI',
                style: TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              CustomButton(
                text: 'Generate Palette',
                icon: Icons.auto_awesome,
                onPressed: _generatePalette,
                isLoading: _isGenerating,
              ),
              const SizedBox(height: 16),
              CustomButton(
                text: 'Browse Saved',
                icon: Icons.bookmark,
                onPressed: _navigateToSaved,
                isOutlined: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
