import 'package:flutter/material.dart';
import '../../components/components.dart';

/// Screen for displaying palette detail
class DetailScreen extends StatelessWidget {
  final String? paletteId;

  const DetailScreen({
    super.key,
    this.paletteId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Palette Detail',
        showBackButton: true,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.color_lens,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 32),
              const Text(
                'Palette Details',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                paletteId != null
                    ? 'Viewing palette: $paletteId'
                    : 'No palette selected',
                style: const TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              CustomCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Palette Information',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildInfoRow('ID', paletteId ?? 'N/A'),
                    const SizedBox(height: 8),
                    _buildInfoRow('Colors', '5 colors'),
                    const SizedBox(height: 8),
                    _buildInfoRow('Created', 'Just now'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'Save',
                      icon: Icons.bookmark_add,
                      onPressed: () {
                        // TODO: Implement save logic
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Palette saved!'),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CustomButton(
                      text: 'Share',
                      icon: Icons.share,
                      onPressed: () {
                        // TODO: Implement share logic
                      },
                      isOutlined: true,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 80,
          child: Text(
            '$label:',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: Text(value),
        ),
      ],
    );
  }
}
