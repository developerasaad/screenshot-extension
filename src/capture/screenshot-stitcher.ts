import type { CapturedTile, PageMetrics } from '../shared/types.js';

export async function stitchTiles(
  metrics: PageMetrics,
  tiles: CapturedTile[],
  xPositions: number[],
  yPositions: number[]
): Promise<Blob> {
  if (tiles.length === 0) {
    throw new Error('No screenshot tiles were captured.');
  }

  const firstTile = tiles[0];
  if (!firstTile) {
    throw new Error('No screenshot tiles were captured.');
  }

  const scaleX = firstTile.imageWidth / firstTile.viewportWidth;
  const scaleY = firstTile.imageHeight / firstTile.viewportHeight;
  const canvasWidth = Math.max(1, Math.round(metrics.pageWidth * scaleX));
  const canvasHeight = Math.max(1, Math.round(metrics.pageHeight * scaleY));

  console.log('[ScreenShot:Stitcher] Canvas dimensions:', {
    canvasWidth,
    canvasHeight,
    scaleX,
    scaleY,
    pageCSSWidth: metrics.pageWidth,
    pageCSSHeight: metrics.pageHeight,
    tileCount: tiles.length,
  });

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create a 2D canvas for stitching.');
  }

  // Pre-fill white background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  let tileIdx = 0;
  for (const tile of tiles) {
    tileIdx++;
    const bitmap = await loadTileBitmap(tile.dataUrl);
    try {
      const isLastRow = tile.rowIndex >= yPositions.length - 1;
      const isLastCol = tile.colIndex >= xPositions.length - 1;

      const currentDestX = Math.round(tile.targetScrollX * scaleX);
      const nextDestX = isLastCol
        ? canvasWidth
        : Math.round((xPositions[tile.colIndex + 1] ?? tile.targetScrollX + tile.viewportWidth) * scaleX);
      const destWidth = Math.max(0, Math.min(bitmap.width, nextDestX - currentDestX));

      const currentDestY = Math.round(tile.targetScrollY * scaleY);
      const nextDestY = isLastRow
        ? canvasHeight
        : Math.round((yPositions[tile.rowIndex + 1] ?? tile.targetScrollY + tile.viewportHeight) * scaleY);
      const destHeight = Math.max(0, Math.min(bitmap.height, nextDestY - currentDestY));

      if (destWidth <= 0 || destHeight <= 0) {
        console.warn(`[ScreenShot:Stitcher] Skipping tile ${tileIdx} due to zero dimensions: ${destWidth}x${destHeight}`);
        continue;
      }

      console.log(`[ScreenShot:Stitcher] Drawing tile ${tileIdx} at destination (${currentDestX}, ${currentDestY}, ${destWidth}x${destHeight}) from source (${destWidth}x${destHeight})`);

      context.drawImage(
        bitmap,
        0,
        0,
        destWidth,
        destHeight,
        currentDestX,
        currentDestY,
        destWidth,
        destHeight
      );
    } finally {
      bitmap.close();
    }
  }

  console.log('[ScreenShot:Stitcher] Converting OffscreenCanvas to PNG blob...');
  return canvas.convertToBlob({ type: 'image/png' });
}

async function loadTileBitmap(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}
