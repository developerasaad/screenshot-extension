export interface CaptureGrid {
  xPositions: number[];
  yPositions: number[];
}

export function buildCaptureGrid(
  pageWidth: number,
  pageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): CaptureGrid {
  return {
    xPositions: buildAxisPositions(pageWidth, viewportWidth),
    yPositions: buildAxisPositions(pageHeight, viewportHeight),
  };
}

function buildAxisPositions(pageSize: number, viewportSize: number): number[] {
  const maxScroll = Math.max(0, pageSize - viewportSize);
  if (maxScroll <= 0) {
    return [0];
  }

  const positions: number[] = [];
  let current = 0;

  while (current < maxScroll) {
    positions.push(current);
    current += viewportSize;
  }

  if (positions.length === 0 || positions[positions.length - 1] !== maxScroll) {
    positions.push(maxScroll);
  }

  return positions;
}
