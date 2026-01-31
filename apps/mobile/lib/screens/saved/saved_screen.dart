import 'package:flutter/material.dart';
import '../../components/components.dart';
import '../../services/api_service.dart';
import '../../models/palette.dart';

/// Screen for displaying saved palettes
class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  List<Palette> _savedPalettes = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSavedPalettes();
  }

  Future<void> _loadSavedPalettes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final palettes = await _apiService.getMyPalettes();
      if (mounted) {
        setState(() {
          _savedPalettes = palettes;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load palettes: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  void _navigateToDetail(Palette palette) {
    Navigator.of(context).pushNamed(
      '/detail',
      arguments: palette,
    );
  }

  void _navigateToGenerate() {
    Navigator.of(context).pushNamed('/generate');
  }

  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '');
    return Color(int.parse('FF$hexCode', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Saved Palettes',
        showBackButton: true,
      ),
      body: _isLoading
          ? const LoadingIndicator(message: 'Loading saved palettes...')
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ErrorMessage(message: _errorMessage!),
                        const SizedBox(height: 24),
                        CustomButton(
                          text: 'Retry',
                          icon: Icons.refresh,
                          onPressed: _loadSavedPalettes,
                        ),
                      ],
                    ),
                  ),
                )
              : _savedPalettes.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.bookmark_border,
                              size: 80,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            const SizedBox(height: 32),
                            const Text(
                              'No Saved Palettes',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Start generating palettes and save your favorites',
                              style: TextStyle(fontSize: 16),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 48),
                            CustomButton(
                              text: 'Generate Palette',
                              icon: Icons.add,
                              onPressed: _navigateToGenerate,
                            ),
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadSavedPalettes,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _savedPalettes.length,
                        itemBuilder: (context, index) {
                          final palette = _savedPalettes[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: CustomCard(
                              onTap: () => _navigateToDetail(palette),
                              child: Row(
                                children: [
                                  // Color preview
                                  Semantics(
                                    label: 'Palette preview with ${palette.colors.length} colors',
                                    child: SizedBox(
                                      width: 60,
                                      height: 60,
                                      child: Row(
                                        children: palette.colors
                                            .take(5)
                                            .map((color) => Expanded(
                                                  child: Container(
                                                    color: _hexToColor(color.hex),
                                                  ),
                                                ))
                                            .toList(),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          palette.name ?? 'Palette ${index + 1}',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${palette.colors.length} colors${palette.likesCount > 0 ? ' • ${palette.likesCount} likes' : ''}',
                                          style: const TextStyle(fontSize: 14),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
      floatingActionButton: _savedPalettes.isNotEmpty
          ? FloatingActionButton(
              onPressed: _navigateToGenerate,
              tooltip: 'Generate New Palette',
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}
