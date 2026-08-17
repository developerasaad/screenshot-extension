# Frequently Asked Questions (FAQ)

---

### Why another screenshot extension?

Most popular screenshot extensions have accumulated feature bloat over the years: full annotation suites, cloud upload integrations, accounts, paid subscription tiers, and in some cases, tracking scripts or ads. 

This project was built to do one thing reliably: **take a complete, full-page screenshot of the rendered webpage and give you the PNG image to view, save, or copy.**

---

### Why doesn't this just use Chrome's DevTools screenshot command?

Chrome DevTools provides a "Capture full size screenshot" feature. While useful, it requires opening Developer Tools (`Ctrl+Shift+I` / `Cmd+Option+I`), opening the command menu (`Ctrl+Shift+P`), and typing the command. More importantly, DevTools full-size capture often encounters layout issues with complex CSS (e.g. `vh` units, sticky positioning, lazy images, and nested scrollable containers) because it renders the page in an emulated non-scrolled layout.

This extension scrolls the actual live page in real time, triggers lazy-loaded elements naturally, and handles fixed headers cleanly.

---

### Why does full-page capture require scrolling?

Web browsers do not render offscreen parts of a webpage into memory as a giant ready-to-copy image bitmap. The official extension API `chrome.tabs.captureVisibleTab()` only captures what is currently visible on the screen. 

To capture a page that is 5,000 pixels tall, the extension must scroll through the document in viewport-sized increments, capture each tile, and stitch them together on a canvas.

---

### Why are fixed/sticky headers difficult to capture?

Elements with `position: fixed` or `position: sticky` stay pinned to the viewport window as you scroll. If you scroll down 5 times, a fixed header will naturally appear in all 5 captured viewports, resulting in a striped image with 5 repeated headers.

This extension solves this by capturing the natural top-of-page header on the first viewport $(0, 0)$, and then temporarily setting `visibility: hidden !important` on fixed/sticky overlays during subsequent scroll positions. All styles are restored immediately once capture finishes.

---

### Does it capture nested scrollable elements like sidebar filters or code blocks?

Yes. The extension scans the DOM for meaningful nested scroll containers (elements with `overflow-y: auto`, `scrollHeight > clientHeight`, etc.) and temporarily expands their content height during capture. This ensures that lists with internal scrollbars (like category filters in e-commerce sidebars or long code blocks) are captured in their entirety rather than cut off at their scrollbar boundary.

---

### Does it work on wide pages with horizontal scrolling?

Yes. The capture engine calculates a 2D coordinate grid $(X, Y)$ using the page's true `scrollWidth` and `scrollHeight`. If a page is wider than the browser window, it scrolls both horizontally and vertically, stitching all tiles in document coordinate space.

---

### Can I copy the screenshot directly to the clipboard?

Yes. Clicking the **Copy** button writes the raw `image/png` blob to your operating system clipboard. You can paste it directly into Slack, Discord, Notion, Figma, GitHub issues, or AI chat interfaces (`Ctrl+V` / `Cmd+V`).

---

### Does the extension upload my screenshots to any cloud server?

**No.** All canvas rendering and stitching runs locally in your browser memory. There are no remote servers, analytics, or external API endpoints.

---

### Why is this useful when building websites with AI coding assistants?

AI coding assistants (like Cursor, Claude, ChatGPT, Gemini, or GitHub Copilot) can read your source code, but code is only a blueprint. A CSS rule might look correct in code, but produce unexpected layout behavior in the browser due to margin collapsing, flex wrapping, z-index collisions, or viewport constraints.

Providing an actual full-page screenshot gives the AI **visual ground truth**, allowing it to see exactly how the layout rendered and provide accurate CSS/HTML fixes.

---

### Does it work on both Chrome and Microsoft Edge?

Yes. The extension is built using standard Manifest V3 Chromium APIs and works identically on Google Chrome, Microsoft Edge, Brave, Opera, and other Chromium-based browsers.

---

### How can I contribute?

Check out [CONTRIBUTING.md](../CONTRIBUTING.md) for local setup, build instructions, and the regression testing checklist.
