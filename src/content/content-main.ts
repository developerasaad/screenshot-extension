import { buildCaptureResult } from '../shared/messages.js';
import type {
  CapturePreparedMessage,
  CleanupCaptureMessage,
  ExtensionMessage,
  PrepareCaptureMessage,
  ResultActionStateMessage,
  ScrollCompleteMessage,
  ScrollToPositionMessage,
  SuppressOverlaysMessage,
} from '../shared/messages.js';
import { isExtensionMessage } from '../shared/messages.js';
import { toErrorMessage } from '../shared/errors.js';
import { analyzePage, findAllFixedAndStickyOverlays, findNestedScrollContainers } from './page-analyzer.js';
import { PageStateManager } from './page-state.js';
import { ResultDialog } from './result-dialog.js';

const dialog = new ResultDialog();

let currentSessionId: string | null = null;
let pageState: PageStateManager | null = null;

chrome.runtime.onMessage.addListener((rawMsg: unknown, _sender, sendResponse: (response: unknown) => void) => {
  if (!isExtensionMessage(rawMsg)) {
    return false;
  }

  const message = rawMsg as ExtensionMessage;
  console.log('[ScreenShot:Content] Received message:', message.type);

  switch (message.type) {
    case 'PREPARE_CAPTURE':
      void handlePrepareCapture(message as PrepareCaptureMessage).then(
        (response) => sendResponse(response),
        (error) => {
          console.error('[ScreenShot:Content] PREPARE_CAPTURE error:', error);
          sendResponse({ ok: false, error: toErrorMessage(error) });
        }
      );
      return true;

    case 'SCROLL_TO_POSITION':
      void handleScrollToPosition(message as ScrollToPositionMessage).then(
        (response) => sendResponse(response),
        (error) => {
          console.error('[ScreenShot:Content] SCROLL_TO_POSITION error:', error);
          sendResponse({ ok: false, error: toErrorMessage(error) });
        }
      );
      return true;

    case 'SUPPRESS_OVERLAYS':
      void handleSuppressOverlays(message as SuppressOverlaysMessage).then(
        () => sendResponse({ ok: true }),
        (error) => {
          console.error('[ScreenShot:Content] SUPPRESS_OVERLAYS error:', error);
          sendResponse({ ok: false, error: toErrorMessage(error) });
        }
      );
      return true;

    case 'CLEANUP_CAPTURE':
      void handleCleanupCapture(message as CleanupCaptureMessage).then(
        () => sendResponse({ ok: true }),
        (error) => {
          console.error('[ScreenShot:Content] CLEANUP_CAPTURE error:', error);
          sendResponse({ ok: false, error: toErrorMessage(error) });
        }
      );
      return true;

    case 'SHOW_RESULT':
      console.log('[ScreenShot:Content] SHOW_RESULT received for session:', message.sessionId);
      currentSessionId = message.sessionId;
      dialog.showSuccess(buildCaptureResult(message), handleDialogAction);
      sendResponse({ ok: true });
      return false;

    case 'SHOW_ERROR':
      console.error('[ScreenShot:Content] SHOW_ERROR received:', message.error);
      currentSessionId = message.sessionId;
      dialog.showError(message.error);
      sendResponse({ ok: true });
      return false;

    case 'DISMISS_DIALOG':
      console.log('[ScreenShot:Content] DISMISS_DIALOG');
      currentSessionId = null;
      dialog.dismiss(true);
      sendResponse({ ok: true });
      return false;

    case 'RESULT_ACTION_STATE':
      console.log('[ScreenShot:Content] RESULT_ACTION_STATE:', message.action, message.status);
      if (message.sessionId === currentSessionId) {
        dialog.applyActionState(message as ResultActionStateMessage);
      }
      sendResponse({ ok: true });
      return false;

    default:
      sendResponse({ ok: false });
      return false;
  }
});

async function handlePrepareCapture(message: PrepareCaptureMessage): Promise<{ ok: true; payload: CapturePreparedMessage }> {
  console.log('[ScreenShot:Content] handlePrepareCapture session:', message.sessionId);
  await handleCleanupCapture({ type: 'CLEANUP_CAPTURE', sessionId: currentSessionId ?? message.sessionId });

  currentSessionId = message.sessionId;
  pageState = new PageStateManager();
  pageState.recordScroll();
  pageState.disableSmoothScroll();

  // Discover and safely expand nested scroll containers (sidebar filters, tables, code blocks, chat panels)
  const nestedContainers = findNestedScrollContainers();
  if (nestedContainers.length > 0) {
    console.log(`[ScreenShot:Content] Discovered ${nestedContainers.length} nested scrollable containers. Expanding for full-content capture...`);
    pageState.expandNestedContainers(nestedContainers);
    await waitForFrame();
    await waitForFrame();
  }

  const metrics = analyzePage();
  console.log('[ScreenShot:Content] Measured page metrics (with expanded nested content):', metrics);

  return {
    ok: true,
    payload: {
      type: 'CAPTURE_PREPARED',
      sessionId: message.sessionId,
      metrics,
    },
  };
}

async function handleScrollToPosition(message: ScrollToPositionMessage): Promise<{ ok: true; payload: ScrollCompleteMessage }> {
  ensureActiveSession(message.sessionId);
  console.log(`[ScreenShot:Content] Scrolling to (${message.scrollX}, ${message.scrollY}) [suppressOverlays=${message.suppressOverlays}]...`);

  window.scrollTo({
    left: message.scrollX,
    top: message.scrollY,
    behavior: 'instant',
  });

  await waitForFrame();
  await waitForFrame();

  // Allow lazy images to trigger and settle
  await waitForVisibleImages(150);
  await waitForFrame();

  if (message.suppressOverlays && pageState) {
    const overlays = findAllFixedAndStickyOverlays();
    if (overlays.length > 0) {
      console.log(`[ScreenShot:Content] Suppressing ${overlays.length} fixed/sticky overlays for tile at (${message.scrollX}, ${message.scrollY})...`);
      pageState.hideOverlays(overlays);
      await waitForFrame();
    }
  }

  const actualScrollX = window.scrollX;
  const actualScrollY = window.scrollY;
  const latestMetrics = analyzePage();

  console.log(`[ScreenShot:Content] Scroll settled at (${actualScrollX}, ${actualScrollY}), current page dimensions: ${latestMetrics.pageWidth}x${latestMetrics.pageHeight}`);

  return {
    ok: true,
    payload: {
      type: 'SCROLL_COMPLETE',
      sessionId: message.sessionId,
      actualScrollX,
      actualScrollY,
      latestPageWidth: latestMetrics.pageWidth,
      latestPageHeight: latestMetrics.pageHeight,
    },
  };
}

async function handleSuppressOverlays(message: SuppressOverlaysMessage): Promise<void> {
  ensureActiveSession(message.sessionId);

  if (pageState) {
    const overlays = findAllFixedAndStickyOverlays();
    console.log(`[ScreenShot:Content] SUPPRESS_OVERLAYS: identified and suppressing ${overlays.length} overlay elements.`);
    if (overlays.length > 0) {
      pageState.hideOverlays(overlays);
      await waitForFrame();
    }
  }
}

async function handleCleanupCapture(message: CleanupCaptureMessage): Promise<void> {
  console.log('[ScreenShot:Content] handleCleanupCapture for session:', message.sessionId);
  if (currentSessionId !== null && message.sessionId !== currentSessionId) {
    return;
  }

  currentSessionId = null;

  if (pageState) {
    await pageState.restoreAll();
    pageState = null;
    console.log('[ScreenShot:Content] Page state, nested scrollers, overlays, and original scroll restored.');
  }
}

function ensureActiveSession(sessionId: string): void {
  if (!currentSessionId || currentSessionId !== sessionId) {
    throw new Error('Capture session is no longer active.');
  }
}

async function handleDialogAction(action: 'view' | 'save' | 'copy', sessionId: string): Promise<void> {
  console.log(`[ScreenShot:Content] Dialog action clicked: ${action} for session: ${sessionId}`);

  if (action === 'copy') {
    try {
      console.log('[ScreenShot:Content] Fetching screenshot data URL from Service Worker...');
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SCREENSHOT_DATA',
      } satisfies ExtensionMessage) as { dataUrl?: string } | undefined;

      if (!response?.dataUrl) {
        throw new Error('Screenshot data is not available.');
      }

      console.log('[ScreenShot:Content] Converting data URL to PNG blob in active tab context...');
      const blobRes = await fetch(response.dataUrl);
      const blob = await blobRes.blob();
      const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });

      console.log('[ScreenShot:Content] Writing PNG blob to clipboard in focused tab context...');
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);

      console.log('[ScreenShot:Content] Clipboard write succeeded!');
      dialog.applyActionState({
        action: 'copy',
        status: 'success',
      });
      return;
    } catch (err) {
      console.warn('[ScreenShot:Content] Direct clipboard write failed, trying Service Worker fallback...', err);

      const fallbackResponse = await chrome.runtime.sendMessage({
        type: 'COPY_SCREENSHOT',
        sessionId,
      } satisfies ExtensionMessage) as { ok?: boolean; error?: string } | undefined;

      if (!fallbackResponse?.ok) {
        console.error('[ScreenShot:Content] Fallback copy also failed:', fallbackResponse?.error);
        dialog.applyActionState({
          action: 'copy',
          status: 'error',
        });
        throw new Error(err instanceof Error ? err.message : 'Copy failed');
      }
    }
    return;
  }

  const type = action === 'view' ? 'VIEW_SCREENSHOT' : 'SAVE_SCREENSHOT';
  const response = await chrome.runtime.sendMessage({
    type,
    sessionId,
  } satisfies ExtensionMessage) as { ok?: boolean; error?: string } | undefined;

  if (!response?.ok) {
    console.error(`[ScreenShot:Content] Action ${action} response failed:`, response?.error);
    throw new Error(response?.error ?? `${action} failed.`);
  }

  console.log(`[ScreenShot:Content] Action ${action} successfully initiated.`);
}

async function waitForVisibleImages(timeoutMs: number): Promise<void> {
  const images = Array.from(document.images);
  const visiblePendingImages: HTMLImageElement[] = [];
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  for (const img of images) {
    if (img.complete) continue;
    const rect = img.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw) {
      visiblePendingImages.push(img);
    }
  }

  if (visiblePendingImages.length === 0) {
    await sleep(Math.min(timeoutMs, 60));
    return;
  }

  console.log(`[ScreenShot:Content] Waiting for ${visiblePendingImages.length} visible images to load...`);

  await Promise.race([
    Promise.all(
      visiblePendingImages.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const onDone = () => {
              img.removeEventListener('load', onDone);
              img.removeEventListener('error', onDone);
              resolve();
            };
            img.addEventListener('load', onDone);
            img.addEventListener('error', onDone);
          })
      )
    ),
    sleep(timeoutMs),
  ]);
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
