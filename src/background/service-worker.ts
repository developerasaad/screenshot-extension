import { CaptureSessionManager } from '../capture/capture-session.js';
import { buildCaptureGrid } from '../capture/capture-positions.js';
import { stitchTiles } from '../capture/screenshot-stitcher.js';
import { CAPTURE_INTERVAL_MS, VIEWER_PAGE } from '../shared/constants.js';
import {
  CaptureAbortedError,
  ClipboardError,
  DownloadError,
  toErrorMessage,
} from '../shared/errors.js';
import type {
  CapturePreparedMessage,
  ExtensionMessage,
  ScrollCompleteMessage,
} from '../shared/messages.js';
import { isExtensionMessage } from '../shared/messages.js';
import type { CapturedTile, PageMetrics } from '../shared/types.js';

interface ReadyCaptureState {
  sessionId: string;
  tabId: number;
  pageTitle: string;
  capturedAt: string;
  dataUrl: string;
}

const sessions = new CaptureSessionManager();

let captureState: ReadyCaptureState | null = null;
let captureDeadline = 0;

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) {
    return;
  }

  console.log('[ScreenShot:SW] Action clicked on tab:', tab.id, tab.url);
  void startCapture(tab.id, tab.windowId, tab.title ?? '', tab.url ?? '');
});

chrome.runtime.onMessage.addListener((rawMsg: unknown, _sender, sendResponse: (response: unknown) => void) => {
  if (!isExtensionMessage(rawMsg)) {
    return false;
  }

  const message = rawMsg as ExtensionMessage;
  console.log('[ScreenShot:SW] Received message:', message.type);

  switch (message.type) {
    case 'VIEW_SCREENSHOT':
      void handleViewAction(message.sessionId).then(
        () => sendResponse({ ok: true }),
        (error) => sendResponse({ ok: false, error: toErrorMessage(error) })
      );
      return true;

    case 'SAVE_SCREENSHOT':
      void handleSaveAction(message.sessionId).then(
        () => sendResponse({ ok: true }),
        (error) => sendResponse({ ok: false, error: toErrorMessage(error) })
      );
      return true;

    case 'COPY_SCREENSHOT':
      void handleCopyAction(message.sessionId).then(
        () => sendResponse({ ok: true }),
        (error) => sendResponse({ ok: false, error: toErrorMessage(error) })
      );
      return true;

    case 'GET_SCREENSHOT_DATA':
      sendResponse({ dataUrl: captureState?.dataUrl ?? null });
      return false;

    default:
      sendResponse({ ok: false });
      return false;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (sessions.current?.tabId === tabId && sessions.isActive) {
    console.warn('[ScreenShot:SW] Tab removed during active capture:', tabId);
    void abortCapture(tabId, 'Tab closed');
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (sessions.current?.tabId === tabId && sessions.isActive && changeInfo.status === 'loading') {
    console.warn('[ScreenShot:SW] Tab navigated during active capture:', tabId);
    void abortCapture(tabId, 'Tab navigated');
  }
});

async function startCapture(
  tabId: number,
  windowId: number,
  pageTitle: string,
  url: string
): Promise<void> {
  console.log('[ScreenShot:SW] Starting capture pipeline for tab:', tabId, url);

  if (isRestrictedUrl(url)) {
    console.warn('[ScreenShot:SW] Restricted URL cannot be captured:', url);
    await showErrorInTab(tabId, "This page can't be captured.");
    return;
  }

  const previousSession = sessions.current;
  if (previousSession && sessions.isActive) {
    console.log('[ScreenShot:SW] Aborting previous active session:', previousSession.id);
    await cleanupCaptureInTab(previousSession.tabId, previousSession.id);
    sessions.fail();
  }

  sessions.resetToIdle();
  const session = sessions.start(tabId);
  captureState = null;
  console.log('[ScreenShot:SW] Started new session:', session.id);

  await injectContentScript(tabId);
  await sendToTabSafe(tabId, { type: 'DISMISS_DIALOG' });

  try {
    console.log('[ScreenShot:SW] Preparing page for capture...');
    const prepared = await prepareCapture(tabId, session.id);
    if (!sessions.validateSession(session.id) || sessions.current?.status !== 'CAPTURING') {
      throw new CaptureAbortedError('Capture session changed before tile capture.');
    }

    const metrics = prepared.metrics;
    console.log('[ScreenShot:SW] Page metrics received:', metrics);

    const grid = buildCaptureGrid(
      metrics.pageWidth,
      metrics.pageHeight,
      metrics.viewportWidth,
      metrics.viewportHeight
    );
    console.log('[ScreenShot:SW] Capture grid constructed:', {
      totalTiles: grid.xPositions.length * grid.yPositions.length,
      xPositions: grid.xPositions,
      yPositions: grid.yPositions,
    });

    const tiles = await captureTiles(windowId, tabId, session.id, metrics, grid.xPositions, grid.yPositions);
    console.log(`[ScreenShot:SW] Captured all ${tiles.length} tiles successfully.`);

    sessions.transition('STITCHING');
    console.log('[ScreenShot:SW] Stitching tiles on OffscreenCanvas...');

    const pngBlob = await stitchTiles(metrics, tiles, grid.xPositions, grid.yPositions);
    console.log('[ScreenShot:SW] Stitching complete. PNG blob size:', (pngBlob.size / 1024).toFixed(1), 'KB');

    const dataUrl = await blobToDataUrl(pngBlob);

    captureState = {
      sessionId: session.id,
      tabId,
      pageTitle: pageTitle || 'screenshot',
      capturedAt: new Date().toISOString(),
      dataUrl,
    };

    sessions.transition('READY');
    console.log('[ScreenShot:SW] Session READY. Restoring page state...');

    await cleanupCaptureInTab(tabId, session.id);
    console.log('[ScreenShot:SW] Displaying result dialog on tab:', tabId);
    await sendToTabSafe(tabId, {
      type: 'SHOW_RESULT',
      sessionId: session.id,
      pageTitle: captureState.pageTitle,
      capturedAt: captureState.capturedAt,
    });
  } catch (error) {
    console.error('[ScreenShot:SW] Capture error:', error);
    sessions.fail();
    await cleanupCaptureInTab(tabId, session.id);
    await showErrorInTab(tabId, toErrorMessage(error));
  }
}

async function prepareCapture(tabId: number, sessionId: string): Promise<CapturePreparedMessage> {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'PREPARE_CAPTURE',
    sessionId,
  } satisfies ExtensionMessage) as { ok?: boolean; error?: string; payload?: CapturePreparedMessage } | undefined;

  if (!response?.ok || !response.payload) {
    throw new Error(response?.error ?? 'Failed to prepare page capture.');
  }

  return response.payload;
}

async function captureTiles(
  windowId: number,
  tabId: number,
  sessionId: string,
  metrics: PageMetrics,
  xPositions: number[],
  yPositions: number[]
): Promise<CapturedTile[]> {
  const tiles: CapturedTile[] = [];
  const totalCount = yPositions.length * xPositions.length;
  let tileIndex = 0;
  const needsMultipleTiles = totalCount > 1;

  for (let rowIndex = 0; rowIndex < yPositions.length; rowIndex++) {
    const scrollY = yPositions[rowIndex]!;
    for (let colIndex = 0; colIndex < xPositions.length; colIndex++) {
      const scrollX = xPositions[colIndex]!;
      const isFirstTile = rowIndex === 0 && colIndex === 0;
      tileIndex++;

      if (!sessions.validateSession(sessionId) || sessions.current?.status !== 'CAPTURING') {
        throw new CaptureAbortedError('Capture session was interrupted.');
      }

      console.log(`[ScreenShot:SW] Capturing tile ${tileIndex}/${totalCount} at target (${scrollX}, ${scrollY}) [suppressOverlays=${!isFirstTile}]...`);

      const scrolled = await scrollTabToPosition(tabId, {
        sessionId,
        scrollX,
        scrollY,
        suppressOverlays: !isFirstTile,
      });

      if (scrolled.latestPageWidth && scrolled.latestPageWidth > metrics.pageWidth) {
        metrics.pageWidth = scrolled.latestPageWidth;
      }
      if (scrolled.latestPageHeight && scrolled.latestPageHeight > metrics.pageHeight) {
        metrics.pageHeight = scrolled.latestPageHeight;
      }

      await waitForCaptureSlot();

      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
      const { width, height } = await measureCapturedImage(dataUrl);

      console.log(`[ScreenShot:SW] Tile ${tileIndex} captured. Dimensions: ${width}x${height}px, Actual scroll: (${scrolled.actualScrollX}, ${scrolled.actualScrollY})`);

      tiles.push({
        dataUrl,
        targetScrollX: scrollX,
        targetScrollY: scrollY,
        actualScrollX: scrolled.actualScrollX,
        actualScrollY: scrolled.actualScrollY,
        colIndex,
        rowIndex,
        viewportWidth: metrics.viewportWidth,
        viewportHeight: metrics.viewportHeight,
        imageWidth: width,
        imageHeight: height,
      });

      // Immediately after capturing the first tile at (0, 0), instruct content script to suppress overlays
      if (isFirstTile && needsMultipleTiles) {
        console.log('[ScreenShot:SW] First tile captured. Requesting overlay suppression for subsequent viewports...');
        await suppressOverlaysInTab(tabId, sessionId);
      }
    }
  }

  return tiles;
}

async function scrollTabToPosition(
  tabId: number,
  message: {
    sessionId: string;
    scrollX: number;
    scrollY: number;
    suppressOverlays: boolean;
  }
): Promise<ScrollCompleteMessage> {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'SCROLL_TO_POSITION',
    sessionId: message.sessionId,
    scrollX: message.scrollX,
    scrollY: message.scrollY,
    suppressOverlays: message.suppressOverlays,
  } satisfies ExtensionMessage) as { ok?: boolean; error?: string; payload?: ScrollCompleteMessage } | undefined;

  if (!response?.ok || !response.payload) {
    throw new Error(response?.error ?? 'Failed to position the page for capture.');
  }

  return response.payload;
}

async function suppressOverlaysInTab(tabId: number, sessionId: string): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'SUPPRESS_OVERLAYS',
      sessionId,
    } satisfies ExtensionMessage);
  } catch (err) {
    console.warn('[ScreenShot:SW] suppressOverlaysInTab warning:', err);
  }
}

async function waitForCaptureSlot(): Promise<void> {
  const now = Date.now();
  if (captureDeadline > now) {
    const delay = captureDeadline - now;
    console.log(`[ScreenShot:SW] Rate limiting: waiting ${delay}ms before next capture...`);
    await sleep(delay);
  }
  captureDeadline = Date.now() + CAPTURE_INTERVAL_MS;
}

async function cleanupCaptureInTab(tabId: number, sessionId: string): Promise<void> {
  console.log('[ScreenShot:SW] Cleaning up tab capture state...');
  await sendToTabSafe(tabId, {
    type: 'CLEANUP_CAPTURE',
    sessionId,
  });
}

async function abortCapture(tabId: number, reason: string): Promise<void> {
  if (!sessions.isActive) {
    return;
  }

  console.warn('[ScreenShot:SW] Aborting capture:', reason);
  sessions.fail();
  await cleanupCaptureInTab(tabId, sessions.current?.id ?? 'stale');
  await showErrorInTab(tabId, `Capture aborted: ${reason}`);
}

async function handleViewAction(sessionId: string): Promise<void> {
  console.log('[ScreenShot:SW] Handling VIEW action for session:', sessionId);
  const state = requireCaptureState(sessionId);
  await chrome.tabs.create({ url: chrome.runtime.getURL(VIEWER_PAGE) });
  await notifyDialogState(state.tabId, state.sessionId, { action: 'view', status: 'success' });
}

async function handleSaveAction(sessionId: string): Promise<void> {
  console.log('[ScreenShot:SW] Handling SAVE action for session:', sessionId);
  const state = requireCaptureState(sessionId);

  try {
    const filename = buildFilename(state.pageTitle, state.capturedAt);
    console.log('[ScreenShot:SW] Initiating download with filename:', filename);
    await chrome.downloads.download({
      url: state.dataUrl,
      filename,
      saveAs: false,
    });
    await notifyDialogState(state.tabId, state.sessionId, { action: 'save', status: 'success' });
  } catch (error) {
    console.error('[ScreenShot:SW] Save error:', error);
    await notifyDialogState(state.tabId, state.sessionId, { action: 'save', status: 'error' });
    throw new DownloadError(toErrorMessage(error));
  }
}

async function handleCopyAction(sessionId: string): Promise<void> {
  console.log('[ScreenShot:SW] Handling COPY action via Offscreen Document for session:', sessionId);
  const state = requireCaptureState(sessionId);

  try {
    await ensureOffscreenDocument();
    console.log('[ScreenShot:SW] Sending WRITE_CLIPBOARD_IMAGE to offscreen document...');
    const response = await chrome.runtime.sendMessage({
      type: 'WRITE_CLIPBOARD_IMAGE',
      sessionId,
      dataUrl: state.dataUrl,
    } satisfies ExtensionMessage) as { ok?: boolean; error?: string } | undefined;

    if (!response?.ok) {
      throw new Error(response?.error ?? 'Failed to write screenshot to clipboard.');
    }

    console.log('[ScreenShot:SW] Offscreen document reported clipboard write success.');
    await notifyDialogState(state.tabId, state.sessionId, { action: 'copy', status: 'success' });
  } catch (error) {
    console.error('[ScreenShot:SW] Copy error:', error);
    await notifyDialogState(state.tabId, state.sessionId, { action: 'copy', status: 'error' });
    throw new ClipboardError(toErrorMessage(error));
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL('offscreen/offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    console.log('[ScreenShot:SW] Offscreen document already exists.');
    return;
  }

  console.log('[ScreenShot:SW] Creating new offscreen document for clipboard...');
  await chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ['CLIPBOARD' as chrome.offscreen.Reason],
    justification: 'Write screenshot image to system clipboard',
  });
  console.log('[ScreenShot:SW] Offscreen document created.');
}

async function notifyDialogState(
  tabId: number,
  sessionId: string,
  detail: { action: 'view' | 'save' | 'copy'; status: 'success' | 'error' }
): Promise<void> {
  await sendToTabSafe(tabId, {
    type: 'RESULT_ACTION_STATE',
    sessionId,
    action: detail.action,
    status: detail.status,
  });
}

function requireCaptureState(sessionId: string): ReadyCaptureState {
  if (!captureState || captureState.sessionId !== sessionId) {
    throw new Error('This screenshot is no longer available.');
  }

  return captureState;
}

function buildFilename(pageTitle: string, capturedAt: string): string {
  const baseTitle = pageTitle
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'screenshot';

  const timestamp = new Date(capturedAt);
  const yyyy = timestamp.getFullYear();
  const mm = String(timestamp.getMonth() + 1).padStart(2, '0');
  const dd = String(timestamp.getDate()).padStart(2, '0');
  const hh = String(timestamp.getHours()).padStart(2, '0');
  const min = String(timestamp.getMinutes()).padStart(2, '0');
  const sec = String(timestamp.getSeconds()).padStart(2, '0');

  return `${baseTitle}-${yyyy}-${mm}-${dd}-${hh}-${min}-${sec}.png`;
}

function isRestrictedUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'chrome:' ||
      parsed.protocol === 'edge:' ||
      parsed.protocol === 'about:' ||
      parsed.protocol === 'chrome-extension:' ||
      parsed.hostname === 'chrome.google.com' ||
      parsed.hostname === 'microsoftedge.microsoft.com'
    );
  } catch {
    return false;
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content-main.js'],
    });
  } catch (err) {
    console.warn('[ScreenShot:SW] injectContentScript note:', err);
  }
}

async function sendToTabSafe(tabId: number, message: ExtensionMessage): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Ignore messaging failures when the page is gone.
  }
}

async function showErrorInTab(tabId: number, error: string): Promise<void> {
  await injectContentScript(tabId);
  await sendToTabSafe(tabId, {
    type: 'SHOW_ERROR',
    sessionId: sessions.current?.id ?? 'error',
    error,
  });
}

async function measureCapturedImage(dataUrl: string): Promise<{ width: number; height: number }> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert screenshot to a data URL.'));
    reader.readAsDataURL(blob);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
