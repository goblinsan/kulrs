import 'package:flutter/material.dart';
import '../../components/components.dart';

/// Screen for displaying saved palettes
class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  bool _isLoading = false;
  final List<String> _savedPalettes = [];

  @override
  void initState() {
    super.initState();
    _loadSavedPalettes();
  }

  Future<void> _loadSavedPalettes() async {
    setState(() {
      _isLoading = true;
    });

    // TODO: Implement actual loading logic from backend
    await Future.delayed(const Duration(seconds: 1));

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _navigateToDetail(String paletteId) {
    Navigator.of(context).pushNamed(
      '/detail',
      arguments: {'paletteId': paletteId},
    );
  }

  void _navigateToGenerate() {
    Navigator.of(context).pushNamed('/generate');
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
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _savedPalettes.length,
                  itemBuilder: (context, index) {
                    final paletteId = _savedPalettes[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: CustomCard(
                        onTap: () => _navigateToDetail(paletteId),
                        child: Row(
                          children: [
                            const Icon(Icons.palette, size: 40),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Palette $paletteId',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    '5 colors • Saved today',
                                    style: TextStyle(fontSize: 14),
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
