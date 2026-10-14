# YouTube Unchained 🛡️⚡

> **An extensible, user-controlled YouTube interface customization browser extension for Chromium (Vivaldi, Chrome, Brave, Edge).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Unit Tests](https://img.shields.io/badge/Unit%20Tests-64%20Passed-10b981.svg)](docs/testing.md)
[![Browser Tests](https://img.shields.io/badge/Browser%20Tests-32%20Passed-10b981.svg)](docs/testing.md)

---

## 🎯 Product Vision

**"YouTube should look and behave the way the user wants, not the way YouTube dictates."**

Modern YouTube is cluttered with algorithmic rabbit holes, auto-playing Shorts shelves, intrusive comment sections, promotional merchandise bars, and recommendation grids designed to maximize watch-time rather than user utility.

**YouTube Unchained** is a lightweight, local-first browser extension that restores complete control of the YouTube interface to the user. It combines a declarative CSS rule engine with an interactive in-page element picker, customizable content filtering, layered ad blocking, full-range playback speed control, and six pre-configured viewing presets.

---

## ✨ Key Features

### 1. 👁️ Granular Visibility Controls
* **Shorts Suppression:** Hide Shorts across navigation menus, homepage carousels, subscription feeds, and watch recommendations.
* **Feed Decluttering:** Hide homepage recommendations, watch-page related videos, and explore shelves.
* **Interactivity Controls:** Hide comments, live-chat frames, and backstage community posts.
* **Overlay Cleanup:** Block end screens, hover cards, call-to-action teasers, and pause overlay panels.
* **Commercial Module Removal:** Hide merchandise carousels, ticket shelves, and shopping drawers.
* **Promotional Sections:** Hide gaming shelves and YouTube Playables promotions.
* **Search Cleaner:** Strip algorithmic "People also watched" and "For you" recommendation shelves from search results.
* **Atmosphere:** Disable video ambient lighting/cinematic glow canvas.

### 2. 📐 Layout & Player Ergonomics
* **Video Grid Columns:** Dynamically scale YouTube's video grid to 2, 3, 4, 5, or 6 columns using native layout variables (`--ytd-rich-grid-items-per-row`).
* **Compact Spacing:** Tighten card margins and thumbnail padding for high-density browsing.
* **Persistent Sidebar:** Automatically collapse or adjust the width of the left navigation guide.
* **Distraction-Free Mode:** Center the video player and eliminate sidebars, recommendations, comments, and notification badges for pure focus.
* **Full-Range Playback Speed:** Configure default playback speed from 0.1x to 16.0x with quick presets and strict or flexible enforcement.
* **Mouse Wheel Volume Control:** Adjust video volume in 5% steps simply by scrolling over the HTML5 player.

### 3. 🔍 Content Filtering (Channels, Keywords, Durations, Watched)
* **Channel Blocklist:** Filter videos by channel name, `@handle` (e.g. `@veritasium`), channel ID (`UC...`), or full channel URL with `contains` or `exact` matching across classic and modern Lit/Wiz view-models.
* **Title Keywords:** Filter video titles using plain text keywords or Regular Expressions.
* **Duration Thresholds:** Hide videos shorter than minimum or longer than maximum duration limits (e.g. hide clips < 2 min).
* **Watched Video Filtering:** Completely hide or dim (`35% opacity + grayscale`) already-watched videos to maintain grid alignment.

### 4. 🛡️ Layered Ad & Promotion Blocking
* **Layer 1: Declarative Interface Ad Hiding:** High-performance CSS injected at `document_start` hiding homepage banner ads (`#masthead-ad`), sponsored cards, search result ads, promoted channels, and merch shelves with zero layout shift.
* **Layer 2: Video Player Ad Handling:** Dynamic observer on HTML5 video player that auto-clicks "Skip Ad" buttons, mutes ad audio, accelerates unskippable ads at 16x speed, and restores user volume and playback speed when main content resumes.

### 5. 🎯 Interactive Element Picker
* Click **"Pick & Hide Element on Page"** to enter visual inspection mode.
* Point and hover over any element on YouTube to see a cyan selection highlight.
* A tooltip displays the calculated stable CSS selector and element dimensions.
* Click any element to open the in-page customization modal.
* Choose to **hide completely** or **collapse space**, scope the rule to **current page only** or **all YouTube pages**, and assign a custom name.
* **Isolated via Closed Shadow DOM:** The picker HUD and modal are completely insulated from YouTube's styles.
* Every custom rule is editable, reversible, and toggleable in the Settings Dashboard.

### 6. 🎛️ Presets & Profiles
Switch between six distinct built-in configurations without destroying custom rules:
1. **Default:** Clean baseline interface with safe defaults.
2. **Study Mode:** Removes Shorts, gaming promotions, distracting recommendations, and comments.
3. **Minimal Mode:** Stripped-down, fast UI with reduced visual noise and compact 4-column layout.
4. **Music Mode:** Emphasizes player and playlists while suppressing chat and comments.
5. **Subscription Mode:** Prioritizes channels you subscribe to and hides algorithmic homepage feeds.
6. **Distraction-Free:** Pure video player focus mode.

### 7. 🔒 100% Local, Private & Secure
* **Zero Accounts & Zero Backends:** All settings and rules are stored strictly in `chrome.storage.local`.
* **Zero External Network Requests:** 100% local operation without external APIs or analytics tracking.
* **Least-Privilege Permissions:** Uses only `storage` and `contextMenus`, scoped exclusively to `*://*.youtube.com/*`.

---

## 🚀 Installation Guide

### Loading into Vivaldi or Google Chrome (Developer Mode)

1. **Build the extension artifact** (if not already built):
   ```bash
   npm run build
   ```
   The compiled unpacked extension is output to the `dist/` directory.

2. **Open Extensions in your browser**:
   * **In Vivaldi:** Type `vivaldi://extensions` in the address bar and press Enter.
   * **In Google Chrome / Brave:** Type `chrome://extensions` in the address bar and press Enter.

3. **Enable Developer Mode**:
   * Toggle the **"Developer mode"** switch located in the top-right corner of the Extensions page.

4. **Load Unpacked Extension**:
   * Click the **"Load unpacked"** button in the top toolbar.
   * In the file picker dialog, select the `dist` directory inside the project root.
   * Click **Select Folder** (or Open).

5. **Verify Installation**:
   * **YouTube Unchained** will appear in your extension list with version `1.0.0` and status active.
   * Pin the **YouTube Unchained** icon to your browser toolbar for quick access.

---

## 📖 Usage Walkthrough

### 1. The Compact Popup
* Click the toolbar extension icon while browsing:
  * **Master Switch:** Instantly toggle all customizations on or off.
  * **Active Preset:** Switch between Default, Study, Minimal, Music, or Distraction-Free modes.
  * **Quick Toggles:** One-click toggles for Shorts, Comments, Home Feed, and Focus Mode.
  * **Page Status:** Live display of current YouTube page context and count of filtered videos.
  * **Pick Element:** Launch the on-page visual element picker.

### 2. Full Settings Dashboard
* Click the gear icon in the popup or right-click the extension icon and select **Options**.
* **Overview:** System status, active profile summary, and master controls.
* **Visibility:** Searchable library of all interface toggles.
* **Layout:** Configure grid columns, compact spacing, and sidebar parameters.
* **Content Filters:** Manage channel blocklists and keyword filters.
* **Custom Rules:** Review and edit rules created by the element picker.
* **Appearance:** Set custom accent colors (Cyan, Violet, Emerald, Amber, etc.) and toggle OLED Black mode.
* **Backup & Diagnostics:** Export and import settings in versioned JSON format with schema validation.

---

## 🛠️ Development & Testing

### Prerequisites
* **Node.js**: v18.0.0 or later (tested on v22.23.3)
* **npm**: v9.0.0 or later
* **Browser**: Vivaldi 8.2+, Google Chrome 130+, Brave, or Microsoft Edge

### Project Structure
```
├── dist/                  # Production unpacked extension (load this in browser)
├── docs/
│   ├── architecture.md    # System architecture and technical design
│   ├── reference-analysis.md # Static analysis of existing extensions
│   ├── implementation-plan.md# Phase roadmap and technical milestones
│   └── testing.md         # Automated test suite and QA verification report
├── public/
│   ├── icons/             # PNG icons (16, 48, 128)
│   └── manifest.json      # Manifest V3 specification
├── scripts/
│   └── build.ts           # Extension bundler (React UI + IIFE content script + SW)
├── src/
│   ├── background/        # Background service worker (badge, context menus)
│   ├── content/           # Content script coordinator (zero-FOUC injection)
│   ├── engine/            # RuleEngine, StyleManager, PageDetector, DOMObserver
│   ├── filters/           # ContentFilter (channel, title, duration, watched)
│   ├── options/           # React Settings Dashboard
│   ├── picker/            # ElementPicker (Shadow DOM HUD) & SelectorGenerator
│   ├── popup/             # React Popup interface
│   ├── shared/            # StorageManager, defaults, schemas
│   └── types/             # Strict TypeScript models
├── tests/                 # Vitest automated unit test suites & Puppeteer browser test
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### CLI Commands
* **Run Unit Tests (Vitest):**
  ```bash
  npm test
  ```
* **Run Real-Browser Behavioral Test Suite (Puppeteer / Vivaldi):**
  ```bash
  npm run test:browser
  ```
* **Build Production Extension:**
  ```bash
  npm run build
  ```
* **Typecheck Codebase:**
  ```bash
  npm run lint
  ```

---

## ⚖️ Architecture, Privacy & Current Limitations

YouTube Unchained customizes YouTube's **graphical user interface** and client-side presentation:
* **Interface & Video Ad Blocking:** Declarative CSS hides promotional merchandise modules, sponsored banner shelves, and algorithmic recommendation cards at `document_start`. HTML5 video player ads are handled dynamically via auto-skip and acceleration.
* **Zero-Network Privacy Guarantee:** The extension does **not** make any external network requests or collect telemetry. All configuration is saved in local browser storage (`chrome.storage.local`).
* **Creator In-Video Sponsorships (SponsorBlock-style):** Skipping creator-read sponsorships inside the video stream requires continuous API queries to third-party timestamp databases (`sponsor.ajay.app`). To strictly maintain YouTube Unchained's offline, zero-network security model, third-party cloud database calls are excluded.
* **High-Speed Audio Note:** HTML5 video playback supports hardware-accelerated speeds up to 16.0x; however, the Chromium platform audio engine automatically mutes audio at speeds exceeding 4.0x due to pitch-preservation limits.

---

## 📄 License

MIT License. Designed and engineered for user freedom and personal autonomy.
