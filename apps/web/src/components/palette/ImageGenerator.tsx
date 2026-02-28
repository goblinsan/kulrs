import { useState, useRef, useCallback, useEffect } from 'react';
import './Generators.css';

interface ImageGeneratorProps {
  onGenerate: (pixels: { r: number; g: number; b: number }[]) => void;
  loading: boolean;
}

export function ImageGenerator({ onGenerate, loading }: ImageGeneratorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  /* ── Load an image from a blob / file ─────────────────────────────── */
  const loadFromFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = event => {
      setPreviewUrl(event.target?.result as string);
      setUrlError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFromFile(file);
  };

  /* ── Paste from clipboard (Ctrl/Cmd-V anywhere on the component) ── */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) loadFromFile(file);
          return;
        }
      }
      // Also try pasting a URL string
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && /^https?:\/\/.+/i.test(text)) {
        e.preventDefault();
        setImageUrl(text);
        loadFromUrl(text);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadFromFile]
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  /* ── Drag-and-drop ────────────────────────────────────────────────── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) loadFromFile(file);
  };

  /* ── Load from URL ────────────────────────────────────────────────── */
  const loadFromUrl = useCallback(async (url: string) => {
    setUrlError(null);
    setLoadingUrl(true);
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('URL did not return an image');
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setPreviewUrl(dataUrl);
    } catch {
      setUrlError(
        'Could not load image from that URL. Try downloading and uploading it instead.'
      );
    } finally {
      setLoadingUrl(false);
    }
  }, []);

  const handleUrlSubmit = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    loadFromUrl(trimmed);
  };

  /* ── Paste button (for mobile where cmd-V is awkward) ─────────────── */
  const handlePasteButton = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          loadFromFile(new File([blob], 'clipboard.png', { type: imageType }));
          return;
        }
        // Fallback: try text (URL)
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (/^https?:\/\/.+/i.test(text.trim())) {
            setImageUrl(text.trim());
            loadFromUrl(text.trim());
            return;
          }
        }
      }
      alert('No image found on your clipboard.');
    } catch {
      alert('Could not access clipboard. Try Ctrl/Cmd+V instead.');
    }
  };

  /* ── Extract pixels from an image URL ─────────────────────────────── */
  const extractPixels = async (
    imgUrl: string
  ): Promise<{ r: number; g: number; b: number }[]> => {
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

        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels: { r: number; g: number; b: number }[] = [];

        for (let i = 0; i < imageData.data.length; i += 16) {
          pixels.push({
            r: imageData.data[i],
            g: imageData.data[i + 1],
            b: imageData.data[i + 2],
          });
        }

        resolve(pixels);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imgUrl;
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
        Upload, paste, or link an image to extract a color palette from its
        dominant colors
      </p>

      <div
        className="image-upload"
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Source buttons row */}
        <div className="image-source-row">
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
            <i className="fa-solid fa-upload" /> Upload
          </button>
          <button
            type="button"
            onClick={handlePasteButton}
            className="upload-button"
            disabled={loading}
          >
            <i className="fa-solid fa-paste" /> Paste
          </button>
        </div>

        {/* URL input */}
        <div className="image-url-row">
          <input
            type="text"
            className="image-url-input"
            placeholder="Or paste an image URL..."
            value={imageUrl}
            onChange={e => {
              setImageUrl(e.target.value);
              setUrlError(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleUrlSubmit();
            }}
            disabled={loading || loadingUrl}
          />
          <button
            type="button"
            className="upload-button"
            onClick={handleUrlSubmit}
            disabled={loading || loadingUrl || !imageUrl.trim()}
          >
            {loadingUrl ? 'Loading...' : 'Load'}
          </button>
        </div>
        {urlError && <p className="image-url-error">{urlError}</p>}

        <p className="image-hint">
          You can also drag &amp; drop an image here, or press Ctrl/Cmd+V to
          paste
        </p>

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
