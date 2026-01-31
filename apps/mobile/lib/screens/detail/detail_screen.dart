import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../components/components.dart';
import '../../models/palette.dart';
import '../../services/api_service.dart';

/// Screen for displaying palette detail
class DetailScreen extends StatefulWidget {
  final Palette? palette;
  final String? paletteId;

  const DetailScreen({
    super.key,
    this.palette,
    this.paletteId,
  });

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  final ApiService _apiService = ApiService();
  Palette? _palette;
  bool _isLoading = false;
  bool _isSaving = false;
  bool _isLiking = false;
  bool _isRemixing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _palette = widget.palette;
    if (_palette == null && widget.paletteId != null) {
      _loadPalette();
    }
  }

  Future<void> _loadPalette() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final palette = await _apiService.getPalette(widget.paletteId!);
      if (mounted) {
        setState(() {
          _palette = palette;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load palette: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _savePalette() async {
    if (_palette == null) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final savedPalette = await _apiService.savePalette(_palette!);
      if (mounted) {
        setState(() {
          _palette = savedPalette;
          _isSaving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Palette saved!')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to save palette: ${e.toString()}';
          _isSaving = false;
        });
      }
    }
  }

  Future<void> _toggleLike() async {
    if (_palette?.id == null) return;

    setState(() {
      _isLiking = true;
      _errorMessage = null;
    });

    try {
      if (_palette!.isLiked == true) {
        await _apiService.unlikePalette(_palette!.id!);
        if (mounted) {
          setState(() {
            _palette = _palette!.copyWith(
              isLiked: false,
              likesCount: _palette!.likesCount - 1,
            );
            _isLiking = false;
          });
        }
      } else {
        await _apiService.likePalette(_palette!.id!);
        if (mounted) {
          setState(() {
            _palette = _palette!.copyWith(
              isLiked: true,
              likesCount: _palette!.likesCount + 1,
            );
            _isLiking = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to toggle like: ${e.toString()}';
          _isLiking = false;
        });
      }
    }
  }

  Future<void> _remixPalette() async {
    if (_palette?.id == null) return;

    setState(() {
      _isRemixing = true;
      _errorMessage = null;
    });

    try {
      final remixedPalette = await _apiService.remixPalette(_palette!.id!);
      if (mounted) {
        Navigator.of(context).pushReplacementNamed(
          '/detail',
          arguments: remixedPalette,
        );
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Palette remixed!')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to remix palette: ${e.toString()}';
          _isRemixing = false;
        });
      }
    }
  }

  void _copyToClipboard(String hex) {
    Clipboard.setData(ClipboardData(text: hex));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied $hex to clipboard'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '');
    return Color(int.parse('FF$hexCode', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        appBar: CustomAppBar(
          title: 'Palette Detail',
          showBackButton: true,
        ),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_palette == null) {
      return Scaffold(
        appBar: const CustomAppBar(
          title: 'Palette Detail',
          showBackButton: true,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('No palette data available'),
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                ErrorMessage(message: _errorMessage!),
              ],
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Palette Detail',
        showBackButton: true,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Palette name
              if (_palette!.name != null) ...[
                Text(
                  _palette!.name!,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
              ],
              
              // Like count
              Semantics(
                label: 'This palette has ${_palette!.likesCount} likes',
                excludeSemantics: true,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.favorite,
                      size: 16,
                      color: Colors.red.shade400,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${_palette!.likesCount} likes',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Error message
              if (_errorMessage != null) ...[
                ErrorMessage(message: _errorMessage!),
                const SizedBox(height: 16),
              ],
              
              // Color swatches
              CustomCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Colors',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...(_palette!.colors.asMap().entries.map((entry) {
                      final index = entry.key;
                      final color = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: _buildColorSwatch(
                          color,
                          'Color ${index + 1}',
                        ),
                      );
                    }).toList()),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Action buttons
              Row(
                children: [
                  if (_palette!.id == null) ...[
                    Expanded(
                      child: CustomButton(
                        text: 'Save',
                        icon: Icons.bookmark_add,
                        onPressed: _savePalette,
                        isLoading: _isSaving,
                      ),
                    ),
                  ] else ...[
                    Expanded(
                      child: CustomButton(
                        text: _palette!.isLiked == true ? 'Unlike' : 'Like',
                        icon: _palette!.isLiked == true
                            ? Icons.favorite
                            : Icons.favorite_border,
                        onPressed: _toggleLike,
                        isLoading: _isLiking,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomButton(
                        text: 'Remix',
                        icon: Icons.shuffle,
                        onPressed: _remixPalette,
                        isLoading: _isRemixing,
                        isOutlined: true,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildColorSwatch(PaletteColor color, String defaultName) {
    return InkWell(
      onTap: () => _copyToClipboard(color.hex),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            // Color preview
            Container(
              width: 80,
              height: 60,
              decoration: BoxDecoration(
                color: _hexToColor(color.hex),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(8),
                  bottomLeft: Radius.circular(8),
                ),
              ),
            ),
            // Color info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      color.name ?? defaultName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      color.hex.toUpperCase(),
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Copy icon
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Icon(
                Icons.copy,
                size: 20,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
