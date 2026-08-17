# Architecture & Capture Engine

This document details the internal architecture of **ScreenShot — Full Page Capture**, explaining how the extension analyzes, scrolls, captures, and stitches full-page screenshots in Chrome and Microsoft Edge.

---

## 1. High-Level System Overview

The extension is structured around Chromium's **Manifest V3** lifecycle, dividing responsibilities cleanly between the Service Worker, Content Scripts, and an Offscreen Document:

```text
 User Action (Toolbar Icon Click)
                │
                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Service Worker (`src/background/service-worker.ts`)         │
 │ • Validates tab URL and creates a CaptureSession           │
 │ • Orchestrates the 2D capture loop and rate limits         │
 │ • Injects content script and manages tab messaging          │
 └──────────────┬───────────────────────────────▲──────────────┘
                │ 1. PREPARE_CAPTURE             │ 2. Dimensions & Metrics
                ▼                               │
 ┌──────────────────────────────────────────────┴──────────────┐
 │ Content Script (`src/content/content-main.ts`)              │
 │ • `PageAnalyzer`: Discovers nested scrollers & dimensions   │
 │ • `PageStateManager`: Expands scrollers, disables smooth    │
 │   scrolling, hides scrollbars, and records initial state    │
 └──────────────┬──────────────────────────────────────────────┘
                │ 3. Grid calculated, starts scroll loop
                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Serialized 2D Capture Loop (Service Worker)                 │
 │ • Step 1: SCROLL_TO_POSITION (x, y)                         │
 │ • Step 2: Content script suppresses fixed/sticky on Y,X > 0 │
 │ • Step 3: chrome.tabs.captureVisibleTab(windowId)           │
 │ • Step 4: Record actual scroll coordinates & tile bitmap    │
 └──────────────┬──────────────────────────────────────────────┘
                │ 4. All tiles captured
                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tile Stitcher (`src/capture/screenshot-stitcher.ts`)        │
 │ • Allocates OffscreenCanvas (pageWidth * DPR, height * DPR) │
 │ • Maps actual document coordinates to physical canvas       │
 │ • Crops overlapping edges with zero gaps or duplicate seams │
 │ • Exports final PNG Blob and data URL                       │
 └──────────────┬──────────────────────────────────────────────┘
                │ 5. Session READY -> Cleanup & Display
                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Result Presentation & Action Handling                      │
 │ • Content script restores original DOM, styles, and scroll  │
 │ • Shadow DOM Result Dialog rendered at (top: 20px, right)   │
 │ • Actions: Save PNG, Copy to Clipboard, or View in Tab      │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. The 2D Coordinate System

Webpages are 2-dimensional coordinate spaces:

$$\text{Document Space} = [0, \text{pageWidth}] \times [0, \text{pageHeight}]$$

Because `chrome.tabs.captureVisibleTab()` only captures the current viewport window, the extension models capture as a discrete 2D grid of scroll positions.

### Grid Construction (`src/capture/capture-positions.ts`)

For both the horizontal ($X$) and vertical ($Y$) axes:
1. **Zero-Overflow Check**: If `pageSize <= viewportSize`, the axis position list is simply `[0]`.
2. **Step Calculation**: When `pageSize > viewportSize`, positions increment by `viewportSize`:
   $$p_0 = 0, \quad p_1 = \text{viewportSize}, \quad p_2 = 2 \times \text{viewportSize}, \dots$$
3. **Strict Boundary Clamping**: The final position is clamped to the maximum possible scroll offset:
   $$\text{maxScroll} = \text{pageSize} - \text{viewportSize}$$
   
*Example*: If `viewportWidth = 1000px` and `pageWidth = 2350px`, the $X$ capture offsets are:
$$[0, 1000, 1350]$$

---

## 3. Fixed and Sticky Overlay Handling

Elements with `position: fixed` or `position: sticky` are anchored to the browser viewport rather than the document body. In naive screenshot tools, these elements are stamped repeatedly on every captured tile.

### The Authoritative First Viewport Strategy

1. **Tile 0 $(0, 0)$**: The top-left viewport is captured in its natural state. The main website header, navigation bar, and top banners are fully rendered.
2. **Subsequent Tiles $(X > 0 \text{ or } Y > 0)$**:
   - `findAllFixedAndStickyOverlays()` scans the DOM for all elements where computed `position` is `'fixed'` or `'sticky'`.
   - `PageStateManager.hideOverlays()` applies `visibility: hidden !important` to these elements.
   - Using `visibility: hidden` instead of `display: none` preserves element layout and prevents surrounding page content from shifting.
3. **Restoration**: On capture completion, all original inline visibility values and priorities are restored.

---

## 4. Nested Scroll Containers

Many modern applications feature independent scroll containers—such as sidebar category filters, scrollable code blocks, multi-row tables, or chat panels:

```text
Main document (scrolls vertically)
├── Fixed Header
├── Content Grid
│   ├── Filter Sidebar (style="max-height: 160px; overflow-y: auto;")
│   │   ├── Category 1
│   │   ├── Category 2
│   │   └── ... (hidden categories below internal scrollbar)
│   └── Product Cards
└── Footer
```

### Detection and False Positive Suppression (`src/content/page-analyzer.ts`)

`findNestedScrollContainers()` inspects elements across the DOM and filters out false positives:
- **Exclusions**: `<html>`, `<body>`, extension Shadow DOM hosts, form controls (`<textarea>`, `<input>`), and media elements.
- **Visibility Checks**: Must have computed `display !== 'none'`, `visibility !== 'hidden'`, and `opacity > 0`.
- **Dimension Thresholds**: Minimum bounding size of $40 \times 40\text{ px}$.
- **Overflow Validation**: Must have computed `overflow: auto | scroll` and genuine scroll overflow:
  - Vertical: $(\text{scrollHeight} - \text{clientHeight}) \ge 15\text{ px}$
  - Horizontal: $(\text{scrollWidth} - \text{clientWidth}) \ge 15\text{ px}$
- **Hierarchy Depth Sorting**: Containers are sorted by descending DOM depth (deepest child first) so nested inner containers expand cleanly within outer wrappers.

### Expansion & Restoration (`src/content/page-state.ts`)

During preparation:
1. Original inline styles (`height`, `max-height`, `min-height`, `width`, `max-width`, `overflow`, `overflow-y`, `overflow-x`, `scrollbar-width`) and `scrollTop`/`scrollLeft` are saved.
2. Elements are temporarily expanded to their full scroll dimensions:
   ```css
   max-height: none !important;
   min-height: ${scrollHeight}px !important;
   height: auto !important;
   overflow-y: visible !important;
   scrollbar-width: none !important;
   ```
3. After page capture, all styles and internal scroll offsets are cleanly restored.

---

## 5. Exact Canvas Stitching (`src/capture/screenshot-stitcher.ts`)

The stitcher runs on an `OffscreenCanvas` in the Service Worker:

1. **Device Pixel Ratio Scaling**:
   Physical pixel scaling factors are calculated directly from the first captured bitmap:
   $$\text{scaleX} = \frac{\text{firstTile.imageWidth}}{\text{firstTile.viewportWidth}}, \quad \text{scaleY} = \frac{\text{firstTile.imageHeight}}{\text{firstTile.viewportHeight}}$$
2. **Canvas Allocation**:
   $$\text{canvasWidth} = \text{round}(\text{pageWidth} \times \text{scaleX})$$
   $$\text{canvasHeight} = \text{round}(\text{pageHeight} \times \text{scaleY})$$
3. **Overlap Slicing**:
   For each tile at grid coordinate $(col, row)$:
   - Destination $X$: $\text{round}(\text{targetScrollX} \times \text{scaleX})$
   - Destination $Y$: $\text{round}(\text{targetScrollY} \times \text{scaleY})$
   - Slice width: $\min(\text{bitmap.width}, \text{nextTileX} - \text{currentTileX})$
   - Slice height: $\min(\text{bitmap.height}, \text{nextTileY} - \text{currentTileY})$
   - For the final column and row, the slice draws directly to the edge of the canvas.
4. **Zero-Gap Guarantee**: Because each tile draws precisely up to the starting boundary of the next tile, overlapping scroll offsets are clipped seamlessly without duplicate content.

---

## 6. Clipboard Architecture

Writing image data to the system clipboard in Manifest V3 requires specific handling depending on context focus:

1. **Active Webpage Context (Primary)**:
   When the user clicks the "Copy" button in the Result Dialog, the content script running in the active webpage has user activation. It fetches the PNG blob and calls `navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])` directly.
2. **Offscreen Document Fallback**:
   If direct clipboard access fails or is restricted by permissions, the Service Worker spins up a dedicated `chrome.offscreen` document (`src/offscreen/offscreen.html`) with the `CLIPBOARD` reason to write the image blob.

---

## 7. Rate Limiting and Browser Safety

- `chrome.tabs.captureVisibleTab()` enforces internal Chromium rate limits (typically ~2 requests per second).
- `waitForCaptureSlot()` serializes all screenshot captures with a mandatory interval (`CAPTURE_INTERVAL_MS = 550ms`), preventing API exhaustion.
- No concurrent `Promise.all` captures are ever executed against the tab capture API.
