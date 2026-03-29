import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'dart:typed_data';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

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

  // Default fallback pixel color (red) used when image decoding fails
  static const List<int> _defaultFallbackPixel = [255, 0, 0];

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

      // Extract pixels from the image using the image package
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
  /// Decodes the image and samples pixels across the image
  List<List<int>> _extractPixelsSample(Uint8List bytes) {
    try {
      // Decode the image
      final image = img.decodeImage(bytes);
      if (image == null) {
        // Fallback to a default color if decoding fails
        return [_defaultFallbackPixel];
      }

      final List<List<int>> pixels = [];
      final width = image.width;
      final height = image.height;

      // Sample pixels in a grid pattern (e.g., every 10th pixel in each dimension)
      final step = 10;
      for (int y = 0; y < height; y += step) {
        for (int x = 0; x < width; x += step) {
          final pixel = image.getPixel(x, y);
          // Extract RGB values from the pixel
          final r = pixel.r.toInt();
          final g = pixel.g.toInt();
          final b = pixel.b.toInt();
          pixels.add([r, g, b]);
          
          // Limit sample size for performance
          if (pixels.length >= 1000) {
            return pixels;
          }
        }
      }
      
      return pixels.isEmpty ? [_defaultFallbackPixel] : pixels;
    } catch (e) {
      // If there's any error, return a default color
      return [_defaultFallbackPixel];
    }
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
