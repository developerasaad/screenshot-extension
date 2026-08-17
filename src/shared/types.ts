export interface CaptureResult {
  sessionId: string;
  pageTitle: string;
  capturedAt: string;
}

export interface ResultActionState {
  action: 'view' | 'save' | 'copy';
  status: 'success' | 'error';
}

export type CaptureStatus = 'IDLE' | 'CAPTURING' | 'STITCHING' | 'READY' | 'ERROR';

export interface CaptureSession {
  id: string;
  tabId: number;
  status: CaptureStatus;
  startedAt: number;
}

export interface PageMetrics {
  pageWidth: number;
  pageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  maxScrollX: number;
  maxScrollY: number;
  devicePixelRatio: number;
  isInnerScroller?: boolean;
}

export interface CapturedTile {
  dataUrl: string;
  targetScrollX: number;
  targetScrollY: number;
  actualScrollX: number;
  actualScrollY: number;
  colIndex: number;
  rowIndex: number;
  viewportWidth: number;
  viewportHeight: number;
  imageWidth: number;
  imageHeight: number;
}
