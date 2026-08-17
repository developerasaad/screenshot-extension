# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-17

### Added
- **2D Scroll Coordinate Engine**: Full-page capture for vertical, horizontal, and 2D-scrolling webpages.
- **Nested Scroll Container Support**: Automatic detection and safe expansion of inner scrollable containers (sidebar filters, tables, code blocks, chat histories).
- **Fixed & Sticky Header Handling**: Authoritative first-viewport capture with active overlay suppression on subsequent scroll positions to prevent duplicate headers.
- **Three-Action Result Dialog**: Minimal, dark-themed Shadow DOM card providing **View**, **Save PNG**, and **Copy** to clipboard.
- **Dedicated Viewer Page**: Minimal standalone full-page screenshot viewer with dimensions badge, 1:1 / fit-width zoom toggle, and quick actions.
- **Offscreen Clipboard Pipeline**: Support for writing raw PNG blobs directly to the operating system clipboard in Manifest V3 environments.
- **Automated Packaging**: Build scripts to produce production-ready ZIP packages for Google Chrome and Microsoft Edge (`npm run package:all`).
