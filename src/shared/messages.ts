import type { CaptureResult, PageMetrics, ResultActionState } from './types.js';

export type MessageType =
  | 'PREPARE_CAPTURE'
  | 'CAPTURE_PREPARED'
  | 'SCROLL_TO_POSITION'
  | 'SCROLL_COMPLETE'
  | 'SUPPRESS_OVERLAYS'
  | 'CLEANUP_CAPTURE'
  | 'SHOW_RESULT'
  | 'SHOW_ERROR'
  | 'DISMISS_DIALOG'
  | 'RESULT_ACTION_STATE'
  | 'VIEW_SCREENSHOT'
  | 'SAVE_SCREENSHOT'
  | 'COPY_SCREENSHOT'
  | 'WRITE_CLIPBOARD_IMAGE'
  | 'GET_SCREENSHOT_DATA';

export interface PrepareCaptureMessage {
  type: 'PREPARE_CAPTURE';
  sessionId: string;
}

export interface CapturePreparedMessage {
  type: 'CAPTURE_PREPARED';
  sessionId: string;
  metrics: PageMetrics;
}

export interface ScrollToPositionMessage {
  type: 'SCROLL_TO_POSITION';
  sessionId: string;
  scrollX: number;
  scrollY: number;
  suppressOverlays: boolean;
}

export interface ScrollCompleteMessage {
  type: 'SCROLL_COMPLETE';
  sessionId: string;
  actualScrollX: number;
  actualScrollY: number;
  latestPageWidth?: number;
  latestPageHeight?: number;
}

export interface SuppressOverlaysMessage {
  type: 'SUPPRESS_OVERLAYS';
  sessionId: string;
}

export interface CleanupCaptureMessage {
  type: 'CLEANUP_CAPTURE';
  sessionId: string;
}

export interface ShowResultMessage {
  type: 'SHOW_RESULT';
  sessionId: string;
  pageTitle: string;
  capturedAt: string;
}

export interface ShowErrorMessage {
  type: 'SHOW_ERROR';
  sessionId: string;
  error: string;
}

export interface DismissDialogMessage {
  type: 'DISMISS_DIALOG';
}

export interface ResultActionStateMessage extends ResultActionState {
  type: 'RESULT_ACTION_STATE';
  sessionId: string;
}

export interface ViewScreenshotMessage {
  type: 'VIEW_SCREENSHOT';
  sessionId: string;
}

export interface SaveScreenshotMessage {
  type: 'SAVE_SCREENSHOT';
  sessionId: string;
}

export interface CopyScreenshotMessage {
  type: 'COPY_SCREENSHOT';
  sessionId: string;
}

export interface WriteClipboardImageMessage {
  type: 'WRITE_CLIPBOARD_IMAGE';
  sessionId: string;
  dataUrl: string;
}

export interface GetScreenshotDataMessage {
  type: 'GET_SCREENSHOT_DATA';
}

export type ExtensionMessage =
  | PrepareCaptureMessage
  | CapturePreparedMessage
  | ScrollToPositionMessage
  | ScrollCompleteMessage
  | SuppressOverlaysMessage
  | CleanupCaptureMessage
  | ShowResultMessage
  | ShowErrorMessage
  | DismissDialogMessage
  | ResultActionStateMessage
  | ViewScreenshotMessage
  | SaveScreenshotMessage
  | CopyScreenshotMessage
  | WriteClipboardImageMessage
  | GetScreenshotDataMessage;

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

export function buildCaptureResult(message: ShowResultMessage): CaptureResult {
  return {
    sessionId: message.sessionId,
    pageTitle: message.pageTitle,
    capturedAt: message.capturedAt,
  };
}
