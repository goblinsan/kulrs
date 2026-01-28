import { useState, useRef } from 'react';
import './Generators.css';

interface ImageGeneratorProps {
  onGenerate: (pixels: { r: number; g: number; b: number }[]) => void;
  loading: boolean;
}

export function ImageGenerator({ onGenerate, loading }: ImageGeneratorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setPreviewUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const extractPixels = async (imageUrl: string): Promise<{ r: number; g: number; b: number }[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          reject(new Error('Canvas not found'));
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Resize image to reasonable size for processing
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels: { r: number; g: number; b: number }[] = [];

        // Sample every 10th pixel to reduce data size
        for (let i = 0; i < imageData.data.length; i += 40) {
          pixels.push({
            r: imageData.data[i],
            g: imageData.data[i + 1],
            b: imageData.data[i + 2],
          });
        }

        resolve(pixels);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const handleGenerate = async () => {
    if (!previewUrl) return;

    try {
      const pixels = await extractPixels(previewUrl);
      onGenerate(pixels);
    } catch (error) {
      console.error('Error extracting pixels:', error);
      alert('Failed to process image. Please try again.');
    }
  };

  return (
    <div className="generator-form">
      <h3>Generate from Image</h3>
      <p className="generator-description">
        Upload an image to extract a color palette from its dominant colors
      </p>
      
      <div className="image-upload">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="upload-button"
          disabled={loading}
        >
          Choose Image
        </button>
        
        {previewUrl && (
          <div className="image-preview">
            <img src={previewUrl} alt="Preview" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <button
        type="button"
        onClick={handleGenerate}
        className="generate-button"
        disabled={loading || !previewUrl}
      >
        {loading ? 'Generating...' : 'Generate Palette'}
      </button>
    </div>
  );
}
