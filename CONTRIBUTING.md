# Contributing to ScreenShot

Thank you for your interest in contributing to **ScreenShot — Full Page Capture**!

This project is maintained as a small, high-quality, open-source tool. We welcome bug fixes, performance improvements, and compatibility fixes.

---

## 1. Project Philosophy

Before submitting a feature or opening a PR, please keep our core philosophy in mind:

- **Do one job well**: The extension captures full webpages, and provides View, Save, and Copy. That's it.
- **No bloat**: We do not accept PRs adding image editors, annotation tools, social share buttons, analytics, cloud storage integrations, accounts, or background trackers.
- **Local-first & Private**: Everything must run in the user's browser using web standards.
- **Reliable browser geometry**: We prioritize deterministic coordinate math and clean DOM restoration over complex computer-vision guesswork.

---

## 2. Development Setup

### Prerequisites

- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **Google Chrome** or **Microsoft Edge**

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/developerasaad/screenshot-extension.git
   cd screenshot-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development build with auto-rebuild:
   ```bash
   npm run dev
   ```

4. Load the extension in your browser:
   - Open `chrome://extensions` or `edge://extensions`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and choose the `dist/` directory.

---

## 3. Build & Quality Commands

Always verify your changes before submitting a pull request:

```bash
# Typecheck TypeScript files
npm run typecheck

# Production build
npm run build

# Build and package store release ZIPs
npm run package:all
```

---

## 4. Testing Your Changes

The extension is designed to work on arbitrary real-world webpages.

### Manual Testing Guide

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open `chrome://extensions` or `edge://extensions` and reload the unpacked extension.
3. Open various real-world websites and trigger capture with the toolbar button.

### Recommended Regression Test Scenarios

If you make changes to the capture engine, coordinate math, or DOM analysis, verify behavior across these webpage patterns:

| Webpage Category | Key Verification Check |
| :--- | :--- |
| **Standard Long Page** | Entire document height captured cleanly down to the footer. |
| **Fixed Navigation Header** | Header appears once at the top; never repeated down the page. |
| **Sticky Navigation Bar** | Sticky navbar remains at its natural position without duplication. |
| **Nested Scrollable Panel** | Sidebars, filter lists, or code boxes expand and capture full inner content without cutoff. |
| **Nested Scrollable Table** | Multi-row/column tables are fully rendered without breaking surrounding layout. |
| **Horizontal Overflow / Wide Page** | Wide layouts are captured across full width without right-side clipping. |
| **Lazy-Loaded Images** | Visible images trigger and settle before tile capture. |
| **Single Page App (SPA)** | Dynamic client-side DOM transitions capture and clean up state cleanly. |
| **High DPR Screen** | Canvas stitches at true physical resolution without blurry scaling. |

---

## 5. Submitting a Pull Request

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b fix/nested-table-clipping
   ```
2. Write clean, readable TypeScript. Follow existing codebase conventions.
3. Ensure `npm run typecheck` and `npm run build` pass with zero errors.
4. Commit your changes with clear, descriptive commit messages.
5. Push to your fork and submit a Pull Request describing:
   - The bug or improvement you addressed.
   - The test pages or live websites you tested against.
   - Screenshots or visual confirmation if applicable.

---

## 6. Reporting Bugs

If you find a page where the screenshot is misaligned, clipped, or captures duplicate headers:

1. Search existing GitHub Issues to see if the bug was already reported.
2. Open a new issue with:
   - The webpage URL (or a minimal HTML reproduction).
   - Your browser and OS version (e.g. Chrome 124 on macOS, Edge on Windows 11).
   - Screen scale / Device Pixel Ratio (e.g. 100%, 150%, 200%).
   - The resulting screenshot illustrating the issue.
