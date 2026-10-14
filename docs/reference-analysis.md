# Reference Analysis: Existing YouTube & Interface Customization Extensions

**Project:** YouTube Unchained  
**Date:** October 2026  
**Environment:** Linux (x86_64), Vivaldi (Chromium 130+), Google Chrome, Node.js v22.23.3  
**Analysis Author:** YouTube Unchained Lead Architecture & Engineering Team  

---

## 1. Executive Summary

As part of Phase 1 reconnaissance for **YouTube Unchained**, a forensic inspection was conducted of browser extension installations across local browser user profiles in `~/.config/vivaldi` and `~/.config/google-chrome`. 

We identified and analyzed eight relevant extensions currently installed in Vivaldi:
1. **'Improve YouTube!' 🎧 (for YouTube & Videos)** (`bnomihfieiccainjcjblhegjgglakjdd`, v4.2081_0)
2. **Enhancer for YouTube™** (`ponfpcnoihfmfllpaingbgckeeldkhle`, v3.0.19_0)
3. **Tweaks for YouTube** (`ogkoifddpkoabehfemkolflcjhklmkge`, v3.93.0_0)
4. **SponsorBlock for YouTube - Skip Sponsorships** (`mnjggcdmjocbbbhaepdhchncahnbgone`, v6.1.6_0)
5. **Better YouTube Search** (`ipnifedcddhdmpnldgfioocmglegkccj`, v2.0_0)
6. **StayFree - Website Blocker, Web Usage Stats, Shorts Blocker** (`elfaihghhjjoknimpccccmkioofjjfkf`, v2.10.8_0)
7. **VisBug** (`cdockenadnadldjbbgcallicgledbeoc`, v0.4.10_0)
8. **Control Panel for Twitter / X** (`kpmjjdhbcfebfjgdnpjagcndoelnidfj`, v4.25.1_0)

All files were inspected statically without executing untrusted code. This document synthesizes their architectures, DOM identification mechanisms, navigation handling, strengths, limitations, and how YouTube Unchained adopts and dramatically improves upon these patterns.

---

## 2. In-Depth Reference Evaluation

### 2.1 'Improve YouTube!' 🎧 (v4.2081_0)
* **Extension ID:** `bnomihfieiccainjcjblhegjgglakjdd`
* **Manifest Version:** MV3 (Service Worker `background.js`)
* **Execution Timing:** `run_at: "document_start"`, all frames.

#### Key Patterns & Implementation
* **HTML Attribute State Scoping:** Sets `document.documentElement.setAttribute('it-pathname', location.pathname)` immediately at document start and continuously updates it on the YouTube navigation event:
  ```js
  window.addEventListener('yt-navigate-finish', function () {
    document.documentElement.setAttribute('it-pathname', location.pathname);
    // triggers feature refresh
  });
  ```
* **Declarative CSS Binding:** Employs hundreds of CSS selectors bound to root attributes, e.g.:
  ```css
  html[it-hide-suggested-action="true"] div.ytp-suggested-action { display: none !important; }
  html[it-hide-merch-shelf="true"] div.style-scope.ytd-merch-shelf-renderer { display: none !important; }
  ```
* **Weaknesses & Limitations:**
  - Highly monolithic: Thousands of non-modular lines in `core.js` and `styles.css`.
  - Untyped, ad-hoc option storage dictionary.
  - No user-defined element picker or arbitrary rule creator.
  - No real-time keyword/channel filtering engine with user-customizable blocklists.
  - Brittle to DOM naming changes: relies heavily on legacy `ytd-*` elements and lacks support for newer YouTube Polymer/Wiz view models.

---

### 2.2 Enhancer for YouTube™ (v3.0.19_0)
* **Extension ID:** `ponfpcnoihfmfllpaingbgckeeldkhle`
* **Manifest Version:** MV3
* **Execution Timing:** Dual-world architecture: `MAIN` world script (`js/youtube-main.js`) and `ISOLATED` world script (`js/youtube-isolated.js`) registered at `document_start`.

#### Key Patterns & Implementation
* **Dual Execution Worlds:** Uses `MAIN` world content script to interact directly with YouTube's internal player APIs and custom element prototypes, bridged to `ISOLATED` world via `CustomEvent` listeners on `document` (`efyt-command`, `efyt-preference-changed`).
* **CSS Custom Property Theming:** Extensively overrides CSS custom properties on `html` and `html[dark]`:
  ```css
  html[dark] {
    --efyt-control-bar-background: var(--second-background, #272727);
    --efyt-button-filled-background: #f1f1f1;
  }
  ```
* **Weaknesses & Limitations:**
  - Primarily centered on media player controls, cinema mode, and volume booster.
  - Does not provide general interface decluttering, feed curation, or channel/title filtering.
  - No element picker or user-driven DOM customization.
  - Proprietary, obfuscated codebase structure.

---

### 2.3 Tweaks for YouTube (v3.93.0_0)
* **Extension ID:** `ogkoifddpkoabehfemkolflcjhklmkge`
* **Manifest Version:** MV3
* **Execution Timing:** Split bundles: `youtube-at-loading.bundle.js` at `document_start` and `youtube.bundle.js` at `document_end`.

#### Key Patterns & Implementation
* **Leveraging Native Grid Variables:** Discovered that YouTube's `ytd-rich-grid-renderer` internally listens to CSS variable `--ytd-rich-grid-items-per-row`:
  ```css
  ytd-browse[page-subtype=home] ytd-rich-grid-renderer,
  ytd-browse[page-subtype=channels] ytd-rich-grid-renderer {
    --ytd-rich-grid-items-per-row: var(--twfyt-rich-grid-view-items-per-row) !important;
  }
  ```
  This is a critical insight: overriding YouTube's native layout variables allows responsive column scaling without breaking Polymer's internal resize calculations or item calculation loops.
* **Weaknesses & Limitations:**
  - Large bundled files (350KB+ minified code).
  - Fixed, hardcoded feature set. No preset switching system (Study Mode, Minimal Mode, etc.).
  - No user-defined element removal or visual selector inspector.

---

### 2.4 StayFree (v2.10.8_0)
* **Extension ID:** `elfaihghhjjoknimpccccmkioofjjfkf`
* **Manifest Version:** MV3
* **Execution Timing:** Declarative CSS via `in-app-blocking.css`.

#### Key Patterns & Implementation
* **Modern `:has()` & Direct Section Selectors:** StayFree demonstrates the cleanest, most resilient visibility selectors for YouTube:
  - **Shorts:**
    ```css
    html[hide-shorts=true] .yt-simple-endpoint[title=Shorts],
    html[hide-shorts=true] ytd-rich-shelf-renderer[is-shorts],
    html[hide-shorts=true] #contents ytd-reel-shelf-renderer,
    html[hide-shorts=true] ytd-shorts.ytd-page-manager,
    html[hide-shorts=true] yt-chip-cloud-chip-renderer:has(yt-formatted-string[title=Shorts]) {
      display: none !important;
    }
    ```
  - **Comments:**
    ```css
    html[hide-comments=true] #comment-teaser,
    html[hide-comments=true] #comments,
    html[hide-comments=true] ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-comments-section] {
      display: none !important;
    }
    ```
  - **Recommendations:**
    ```css
    html[hide-recomended-video=true] #items.ytd-watch-next-secondary-results-renderer,
    html[hide-recomended-video=true] ytd-rich-grid-renderer.ytd-watch-grid {
      display: none !important;
    }
    ```
* **Weaknesses & Limitations:**
  - Broad all-or-nothing blocking without fine-grained user rule definition.
  - Doesn't filter individual feed items based on channel name, keywords, or video duration.

---

### 2.5 SponsorBlock (v6.1.6_0)
* **Extension ID:** `mnjggcdmjocbbbhaepdhchncahnbgone`
* **Manifest Version:** MV3

#### Key Patterns & Implementation
* **Modern YouTube Component Hierarchy:** Recognizes both legacy Polymer containers and modern 2024-2026 Lit/Wiz elements:
  - `yt-lockup-view-model`
  - `yt-lockup-metadata-view-model__title`
  - `yt-lockup-metadata-view-model-wiz__title`
  - `yt-thumbnail-view-model`
  - `yt-page-header-view-model`
* **Lifecycle Awareness:** Listens to `yt-navigate-start`, `yt-navigate-finish`, `yt-player-updated`, and `yt-page-data-updated` on `window`.

---

### 2.6 Better YouTube Search (v2.0_0)
* **Extension ID:** `ipnifedcddhdmpnldgfioocmglegkccj`
* **Key Finding:** Uses URL parameter `&sp=CAASAhAB` to instruct YouTube search backend to return clean, chronological/relevance search items and suppress algorithmic "People also watched" and "For You" shelves.

---

### 2.7 VisBug (v0.4.10_0)
* **Extension ID:** `cdockenadnadldjbbgcallicgledbeoc`
* **Key Finding:** Injects an isolated Web Component `<vis-bug>` with a **Shadow DOM** (`mode: 'open'` or `'closed'`).
* **Why this matters for YouTube Unchained:**
  - In-page element pickers and overlay toolbars MUST use Shadow DOM.
  - YouTube contains thousands of aggressive global CSS rules and CSS resets that would otherwise distort the picker HUD.
  - Conversely, picker styles must never leak into YouTube's DOM.

---

### 2.8 Control Panel for Twitter / X (v4.25.1_0)
* **Extension ID:** `kpmjjdhbcfebfjgdnpjagcndoelnidfj`
* **Architecture Inspiration:**
  - Ultra-fast synchronous `<style>` injection at `document_start` based on cached settings in `storage.local` to completely prevent Flash of Unstyled Content (FOUC).
  - Clean TypeScript configuration schema with migrations.
  - Clear distinction between pure CSS rules (instant, zero performance overhead) and DOM MutationObserver filtering (batched with `requestAnimationFrame`).

---

## 3. Synthesis: Key Design Decisions for YouTube Unchained

From this comprehensive reference analysis, we derive the definitive architecture for YouTube Unchained:

| Architectural Challenge | Reference Precedents | YouTube Unchained Implementation |
|---|---|---|
| **Zero-FOUC Visibility Rules** | Improve YouTube & Control Panel for Twitter | Cache active preset/rules in `chrome.storage.local`. Content script at `document_start` immediately injects compiled dynamic `<style id="yt-unchained-styles">` and sets root `<html>` attributes. |
| **Grid & Layout Customization** | Tweaks for YouTube | Override YouTube native CSS variables (`--ytd-rich-grid-items-per-row`, `--ytd-rich-grid-item-margin`, sidebar width) while preserving layout responsiveness. |
| **SPA Navigation Stability** | SponsorBlock & Improve YouTube | Multi-layered navigation observer: listen to `yt-navigate-finish`, `yt-page-data-updated`, and `popstate`, plus lightweight pathname watcher. Update page-type classifier (`home`, `watch`, `results`, `channel`, `subscriptions`). |
| **Element Picker HUD** | VisBug | Built using a Web Component with **Closed Shadow DOM** (`<yt-unchained-picker>`). Canvas/SVG highlight box around hovered element with stable CSS selector generator (avoiding fragile deep `:nth-child` chains). |
| **Content Filtering (Channel, Title, Duration)** | SponsorBlock & StayFree | Batched, debounced `MutationObserver` targeting feed containers (`ytd-rich-grid-renderer`, `ytd-watch-next-secondary-results-renderer`, `ytd-section-list-renderer`) evaluating item models against user keyword regexes, channel blocklists, and duration thresholds. |
| **Presets & Modularity** | Control Panel for Twitter | First-class Preset Engine: 6 built-in presets (Default, Study Mode, Minimal Mode, Music Mode, Subscription Mode, Distraction-Free), plus full custom presets with JSON export/import and schema validation. |
