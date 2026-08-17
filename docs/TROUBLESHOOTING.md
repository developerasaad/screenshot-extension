# Troubleshooting Guide

This guide covers common issues and troubleshooting steps when using or developing **ScreenShot — Full Page Capture**.

---

## Common Issues & Solutions

### 1. The extension icon is grayed out or displays an error: *"This page can't be captured"*

- **Cause**: Browser security policies prevent extensions from running scripts on internal browser pages (`chrome://`, `edge://`, `about:blank`, `chrome-extension://`) or extension store galleries (`chromewebstore.google.com`, `microsoftedge.microsoft.com`).
- **Solution**: Navigate to a standard webpage (e.g. `https://example.com` or `http://localhost:3000`).

---

### 2. The capture stopped before reaching the bottom of the page

- **Cause**: The tab was closed, refreshed, or navigated while a capture was in progress.
- **Solution**: Keep the tab active and avoid clicking links or scrolling manually until the top-right result card appears.

---

### 3. Clipboard copy fails or shows "Failed" on the button

- **Cause**: In some Linux window managers (Wayland/X11) or when browser window focus is lost, the `navigator.clipboard.write()` API may be blocked by system permission policies.
- **Solution**:
  - Click anywhere inside the webpage to ensure the browser window is focused before clicking **Copy**.
  - Alternatively, click **Save PNG** to download the file directly, or click **View** and right-click $\to$ *Copy Image*.

---

### 4. Content inside an embedded iframe is missing from the screenshot

- **Cause**: Cross-origin iframes are protected by the browser's Same-Origin Policy (SOP). Extensions cannot inspect, scroll, or expand the internal DOM of a cross-origin iframe.
- **Solution**: If you need to capture the contents of an iframe, open the iframe's source URL in its own dedicated browser tab and capture it directly.

---

### 5. Fixed header is duplicated or appears striped down the page

- **Cause**: The header may be using an unconventional positioning structure (e.g. JavaScript-driven `transform: translateY()` on window scroll events) instead of standard CSS `position: fixed` or `position: sticky`.
- **Solution**:
  1. Open Developer Tools (`F12`).
  2. Inspect the header element to check how its position is applied.
  3. Report the URL or HTML structure in a [GitHub Issue](https://github.com/developerasaad/screenshot-extension/issues) so we can improve overlay detection heuristics.

---

## How to Collect Debug Logs

If you encounter unexpected behavior and want to report a bug:

1. Open Developer Tools on the target tab (`Ctrl+Shift+I` / `Cmd+Option+I`).
2. Switch to the **Console** tab.
3. Filter the console output by typing `[ScreenShot` in the filter box.
4. Trigger the capture.
5. Copy the console logs showing page metrics, detected overlays, and scroll tile events.
6. Open the Service Worker console:
   - Go to `chrome://extensions` $\to$ find **ScreenShot**.
   - Click **service worker** (Inspect views) $\to$ check the Console tab for backend logs.
7. Include these logs in your GitHub Issue report.
