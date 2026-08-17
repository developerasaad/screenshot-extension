# Privacy Policy

**Effective Date**: August 2026

**ScreenShot — Full Page Capture** is built on a strict **local-first, zero-tracking** privacy model.

---

## 1. Zero Data Collection

- **No Remote Servers**: This extension does not communicate with any external servers, third-party APIs, or cloud services.
- **No Analytics or Telemetry**: We do not include Google Analytics, Sentry, Mixpanel, or any tracking scripts.
- **No User Accounts**: The extension has no sign-up, sign-in, or authentication mechanisms.
- **No Advertisements**: There are no ads, sponsor links, or affiliate trackers.

---

## 2. How Webpage Data Is Handled

- **Capture Process**: When you click the extension toolbar button, the extension scrolls the active tab to take viewport snapshots using the browser's native `chrome.tabs.captureVisibleTab()` API.
- **In-Memory Stitching**: Captured image tiles are combined locally in browser memory using an `OffscreenCanvas`.
- **Local Output**:
  - When you click **Save PNG**, the file is downloaded directly to your computer using the standard browser download manager (`chrome.downloads.download`).
  - When you click **Copy**, the PNG data is written to your local system clipboard (`navigator.clipboard.write`).
  - When you close the viewer or dismiss the dialog, all in-memory image buffers are released.

---

## 3. Extension Permissions & Justification

| Permission | Technical Reason |
| :--- | :--- |
| `activeTab` | Required to inspect page height and scroll the active webpage during an explicit user-initiated capture. |
| `scripting` | Required to inject the coordinate controller and the isolated Shadow DOM action dialog into the active tab. |
| `downloads` | Required to save the completed PNG screenshot to your local machine. |
| `tabs` | Required to detect tab closure or navigation so capture sessions abort cleanly without leaking memory. |
| `offscreen` | Required to provide an offscreen document context to write clipboard data in Manifest V3 environments where tab focus is unavailable. |
| `clipboardWrite` | Required to place the captured image onto your operating system clipboard. |

---

## 4. Third-Party Code

The extension contains zero third-party runtime analytics or external tracking libraries. All dependencies in `package.json` are development-only build tools (TypeScript and Vite).

---

## 5. Contact & Questions

If you have questions about the privacy model or wish to audit the implementation, the entire source code is available in this repository for inspection.
