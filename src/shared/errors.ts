/**
 * Typed error classes for the extension.
 */

export class ExtensionError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ExtensionError';
    this.code = code;
  }
}

export class CaptureAbortedError extends ExtensionError {
  constructor(reason: string) {
    super('CAPTURE_ABORTED', `Capture aborted: ${reason}`);
  }
}

export class ClipboardError extends ExtensionError {
  constructor(detail?: string) {
    super('CLIPBOARD_ERROR', `Failed to copy to clipboard.${detail ? ` ${detail}` : ''}`);
  }
}

export class DownloadError extends ExtensionError {
  constructor(detail?: string) {
    super('DOWNLOAD_ERROR', `Failed to save screenshot.${detail ? ` ${detail}` : ''}`);
  }
}

/** Convert an unknown thrown value to a string message */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unknown error occurred.';
}
