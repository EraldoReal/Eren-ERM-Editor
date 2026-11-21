import type { ErmDocument } from '../model/types.ts';
import { computeModelBounds } from './geometry.ts';
import { renderErmToSvgString } from './svgExport.ts';

/**
 * Renders an ERM document to a PNG Blob at the requested scale factor (1x, 2x, or 3x).
 * Requires a browser DOM environment (HTMLCanvasElement + Image).
 */
export async function renderErmToPngBlob(
  doc: ErmDocument,
  scale: 1 | 2 | 3 = 2,
  options?: { darkMode?: boolean },
): Promise<Blob> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('PNG export requires a browser DOM environment.');
  }

  const padding = 40;
  const bounds =
    doc.nodes.length > 0
      ? computeModelBounds(doc.nodes, padding)
      : { x: 0, y: 0, width: 400, height: 240 };

  const svgString = renderErmToSvgString(doc, {
    darkMode: options?.darkMode,
    padding,
  });

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load SVG into Image for PNG export.'));
      image.src = url;
    });

    const width = Math.max(1, Math.ceil(bounds.width));
    const height = Math.max(1, Math.ceil(bounds.height));

    // Browsers cap canvas size (about 16k px per side / ~100M pixels); reduce the
    // scale for large diagrams instead of failing with an empty blob.
    const MAX_SIDE = 16000;
    const MAX_PIXELS = 100_000_000;
    let effectiveScale: number = scale;
    effectiveScale = Math.min(effectiveScale, MAX_SIDE / width, MAX_SIDE / height);
    effectiveScale = Math.min(effectiveScale, Math.sqrt(MAX_PIXELS / (width * height)));
    effectiveScale = Math.max(effectiveScale, 0.1);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * effectiveScale));
    canvas.height = Math.max(1, Math.floor(height * effectiveScale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not acquire 2D canvas context.');
    }

    ctx.scale(effectiveScale, effectiveScale);
    ctx.drawImage(img, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });

    if (!pngBlob) {
      throw new Error('Canvas failed to export PNG blob.');
    }

    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Renders a 2x PNG screenshot of the ERM document and writes it to the system clipboard.
 */
export async function copyErmScreenshotToClipboard(
  doc: ErmDocument,
  darkMode = false,
): Promise<void> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== 'function' ||
    typeof ClipboardItem === 'undefined'
  ) {
    throw new Error('Clipboard image API is not available in this environment.');
  }

  const blob = await renderErmToPngBlob(doc, 2, { darkMode });
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}
