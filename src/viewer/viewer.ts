/**
 * Viewer page script.
 * Provides full-page screenshot preview with Zoom, Copy, and Save controls.
 */

const headerEl = document.getElementById('viewer-header') as HTMLElement;
const loadingEl = document.getElementById('loading-state') as HTMLElement;
const errorEl = document.getElementById('error-state') as HTMLElement;
const errorMsgEl = document.getElementById('error-message') as HTMLElement;
const imageContainerEl = document.getElementById('image-container') as HTMLElement;
const imageEl = document.getElementById('screenshot-image') as HTMLImageElement;
const dimensionBadgeEl = document.getElementById('dimension-badge') as HTMLElement;

const btnZoom = document.getElementById('btn-zoom') as HTMLButtonElement;
const zoomLabel = document.getElementById('zoom-label') as HTMLElement;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const copyLabel = document.getElementById('copy-label') as HTMLElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const saveLabel = document.getElementById('save-label') as HTMLElement;

let currentDataUrl: string | null = null;
let isActualSize = false;

function showError(msg: string): void {
  loadingEl.classList.add('hidden');
  imageContainerEl.classList.add('hidden');
  headerEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorMsgEl.textContent = msg;
}

function showImage(src: string): void {
  currentDataUrl = src;

  imageEl.onload = (): void => {
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    imageContainerEl.classList.remove('hidden');
    headerEl.classList.remove('hidden');

    const naturalW = imageEl.naturalWidth;
    const naturalH = imageEl.naturalHeight;
    dimensionBadgeEl.textContent = `${naturalW} × ${naturalH} px`;
    document.title = `Screenshot (${naturalW} × ${naturalH}) — Full Page Capture`;
  };

  imageEl.onerror = (): void => {
    showError('Failed to display the screenshot. Please try capturing again.');
  };

  imageEl.src = src;
}

function toggleZoom(): void {
  isActualSize = !isActualSize;
  imageEl.classList.toggle('actual-size', isActualSize);
  zoomLabel.textContent = isActualSize ? 'Fit Width' : 'Actual Size';

  const iconSvg = isActualSize
    ? `<svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"></circle><line x1="10.5" y1="10.5" x2="14.5" y2="14.5"></line><line x1="4.5" y1="7" x2="9.5" y2="7"></line></svg>`
    : `<svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"></circle><line x1="10.5" y1="10.5" x2="14.5" y2="14.5"></line><line x1="7" y1="4.5" x2="7" y2="9.5"></line><line x1="4.5" y1="7" x2="9.5" y2="7"></line></svg>`;

  btnZoom.innerHTML = `${iconSvg}<span>${zoomLabel.textContent}</span>`;
}

async function handleCopy(): Promise<void> {
  if (!currentDataUrl) return;

  btnCopy.disabled = true;
  copyLabel.textContent = 'Copying…';

  try {
    const res = await fetch(currentDataUrl);
    const blob = await res.blob();
    const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);

    btnCopy.classList.add('btn-success');
    btnCopy.innerHTML = `
      <svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 8.5 6 11.5 13 4.5"></polyline>
      </svg>
      <span>Copied</span>
    `;

    setTimeout(() => {
      btnCopy.classList.remove('btn-success');
      btnCopy.disabled = false;
      btnCopy.innerHTML = `
        <svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5"></rect>
          <path d="M3.5 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5"></path>
        </svg>
        <span>Copy</span>
      `;
    }, 2500);
  } catch (err) {
    console.error('[ScreenShot:Viewer] Copy error:', err);
    btnCopy.disabled = false;
    btnCopy.innerHTML = `
      <svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5"></rect>
        <path d="M3.5 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5"></path>
      </svg>
      <span>Failed</span>
    `;
    setTimeout(() => {
      btnCopy.innerHTML = `
        <svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5"></rect>
          <path d="M3.5 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5"></path>
        </svg>
        <span>Copy</span>
      `;
    }, 2000);
  }
}

async function handleSave(): Promise<void> {
  if (!currentDataUrl) return;

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `screenshot-${timestamp}.png`;

  try {
    const a = document.createElement('a');
    a.href = currentDataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    saveLabel.textContent = 'Saved';
    setTimeout(() => {
      saveLabel.textContent = 'Save PNG';
    }, 2000);
  } catch (err) {
    console.error('[ScreenShot:Viewer] Download error:', err);
  }
}

// Event Listeners
btnZoom.addEventListener('click', toggleZoom);
imageEl.addEventListener('click', toggleZoom);
btnCopy.addEventListener('click', () => { void handleCopy(); });
btnSave.addEventListener('click', () => { void handleSave(); });

// Request the data URL from the service worker
chrome.runtime.sendMessage({ type: 'GET_SCREENSHOT_DATA' }, (response: unknown) => {
  if (chrome.runtime.lastError) {
    showError('Could not connect to extension. Try capturing again.');
    return;
  }

  const resp = response as { dataUrl?: string } | null;
  if (!resp?.dataUrl) {
    showError('No screenshot found. Please capture a new screenshot first.');
    return;
  }

  showImage(resp.dataUrl);
});
