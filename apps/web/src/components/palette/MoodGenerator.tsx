import { useState } from 'react';
import './Generators.css';

interface MoodGeneratorProps {
  onGenerate: (mood: string) => void;
  loading: boolean;
}

export function MoodGenerator({ onGenerate, loading }: MoodGeneratorProps) {
  const [mood, setMood] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mood.trim()) {
      onGenerate(mood.trim());
    }
  };

  const quickMoods = [
    'Calm ocean',
    'Energetic sunset',
    'Professional modern',
    'Peaceful forest',
    'Bold and vibrant',
    'Warm cozy',
  ];

  return (
    <div className="generator-form">
      <h3>Generate from Mood</h3>
      <p className="generator-description">
        Describe a mood, feeling, or theme to generate a matching color palette
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={mood}
          onChange={e => setMood(e.target.value)}
          placeholder="e.g., 'calm ocean sunset', 'energetic and bold'"
          className="mood-input"
          disabled={loading}
        />
        <button
          type="submit"
          className="generate-button"
          disabled={loading || !mood.trim()}
        >
          {loading ? 'Generating...' : 'Generate Palette'}
        </button>
      </form>

      <div className="quick-moods">
        <p>Quick moods:</p>
        <div className="mood-chips">
          {quickMoods.map(quickMood => (
            <button
              key={quickMood}
              type="button"
              className="mood-chip"
              onClick={() => setMood(quickMood)}
              disabled={loading}
            >
              {quickMood}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
