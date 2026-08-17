import { isExtensionMessage } from '../shared/messages.js';
import type { ExtensionMessage } from '../shared/messages.js';

console.log('[ScreenShot:Offscreen] Offscreen document script initialized.');

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, _sender, sendResponse: (r: unknown) => void) => {
    if (!isExtensionMessage(rawMsg)) return false;
    const msg = rawMsg as ExtensionMessage;

    if (msg.type === 'WRITE_CLIPBOARD_IMAGE') {
      console.log('[ScreenShot:Offscreen] Received WRITE_CLIPBOARD_IMAGE for session:', msg.sessionId);
      void writeImageToClipboard(msg.dataUrl)
        .then(() => {
          console.log('[ScreenShot:Offscreen] Successfully wrote PNG image to system clipboard.');
          sendResponse({ ok: true });
        })
        .catch((err) => {
          console.error('[ScreenShot:Offscreen] navigator.clipboard.write error:', err);
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'Clipboard write failed',
          });
        });
      return true; // Keep message channel open for async response
    }

    return false;
  }
);

async function writeImageToClipboard(dataUrl: string): Promise<void> {
  window.focus();
  const trap = document.getElementById('focus-trap') as HTMLElement | null;
  trap?.focus();

  console.log('[ScreenShot:Offscreen] Fetching blob from dataUrl (length:', dataUrl.length, 'chars)...');
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  console.log('[ScreenShot:Offscreen] Converted blob size:', (blob.size / 1024).toFixed(1), 'KB, MIME type:', blob.type);

  const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });

  console.log('[ScreenShot:Offscreen] Calling navigator.clipboard.write with ClipboardItem({ image/png })...');
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': pngBlob }),
  ]);
}
