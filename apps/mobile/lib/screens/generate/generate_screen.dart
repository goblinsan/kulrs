import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/palette.dart';

/// Screen for generating color palettes
class GenerateScreen extends StatefulWidget {
  const GenerateScreen({super.key});

  @override
  State<GenerateScreen> createState() => _GenerateScreenState();
}

class _GenerateScreenState extends State<GenerateScreen> {
  final TextEditingController _moodController = TextEditingController();
  final ApiService _apiService = ApiService();
  final ImagePicker _imagePicker = ImagePicker();
  bool _isGenerating = false;
  String? _errorMessage;

  @override
  void dispose() {
    _moodController.dispose();
    super.dispose();
  }

  Future<void> _generateFromMood() async {
    final mood = _moodController.text.trim();
    if (mood.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter a mood or description';
      });
      return;
    }

    setState(() {
      _isGenerating = true;
      _errorMessage = null;
    });

    try {
      final palette = await _apiService.generateFromMood(mood: mood);
      if (mounted) {
        Navigator.of(context).pushNamed(
          '/detail',
          arguments: palette,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to generate palette: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isGenerating = false;
        });
      }
    }
  }

  Future<void> _generateFromImage(ImageSource source) async {
    setState(() {
      _isGenerating = true;
      _errorMessage = null;
    });

    try {
      final XFile? image = await _imagePicker.pickImage(source: source);
      if (image == null) {
        if (mounted) {
          setState(() {
            _isGenerating = false;
          });
        }
        return;
      }

      // Read image bytes
      final Uint8List bytes = await image.readAsBytes();

      // Convert to pixel array (simplified - in production you'd use an image library)
      // For now, we'll sample some pixels from the image
      final List<List<int>> pixels = _extractPixelsSample(bytes);

      final palette = await _apiService.generateFromImage(pixels: pixels);
      if (mounted) {
        Navigator.of(context).pushNamed(
          '/detail',
          arguments: palette,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to generate from image: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isGenerating = false;
        });
      }
    }
  }

  /// Extract a sample of pixels from image bytes
  /// Note: This is a simplified version. In production, use a proper image decoding library
  List<List<int>> _extractPixelsSample(Uint8List bytes) {
    // Sample every 100th byte as RGB values
    final List<List<int>> pixels = [];
    for (int i = 0; i < bytes.length - 2; i += 100) {
      pixels.add([bytes[i], bytes[i + 1], bytes[i + 2]]);
      if (pixels.length >= 1000) break; // Limit sample size
    }
    return pixels.isEmpty ? [[255, 0, 0]] : pixels;
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(context);
                _generateFromImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _generateFromImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
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
        child: SingleChildScrollView(
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
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                ErrorMessage(message: _errorMessage!),
              ],
              const SizedBox(height: 48),
              TextField(
                controller: _moodController,
                decoration: const InputDecoration(
                  labelText: 'Mood or Description',
                  hintText: 'e.g., sunset, ocean breeze, vintage',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lightbulb_outline),
                ),
                enabled: !_isGenerating,
                onSubmitted: (_) => _generateFromMood(),
              ),
              const SizedBox(height: 24),
              CustomButton(
                text: 'Generate from Mood',
                icon: Icons.auto_awesome,
                onPressed: _generateFromMood,
                isLoading: _isGenerating,
              ),
              const SizedBox(height: 16),
              CustomButton(
                text: 'Generate from Image',
                icon: Icons.image,
                onPressed: _showImageSourceDialog,
                isOutlined: true,
                isEnabled: !_isGenerating,
              ),
              const SizedBox(height: 16),
              CustomButton(
                text: 'Browse Saved',
                icon: Icons.bookmark,
                onPressed: _navigateToSaved,
                isOutlined: true,
                isEnabled: !_isGenerating,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
