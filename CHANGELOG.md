# Changelog

All notable changes to **YouTube Unchained** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-13

### Initial Production Release

#### Added
- **Core Declarative Rule Engine**:
  - Zero-FOUC (Flash of Unstyled Content) stylesheet compilation executed at `document_start`.
  - Dynamic `document.documentElement` attribute synchronization (`yt-unchained-active`, `yt-unchained-page`, `yt-unchained-pathname`).
  - Native YouTube CSS variable overrides for video grid items per row (`--ytd-rich-grid-items-per-row`), item margins, and sidebar widths.
- **Single Page Application (SPA) Navigation Support**:
  - Seamless tracking of YouTube navigation events (`yt-navigate-finish`, `yt-page-data-updated`, and `popstate`).
  - Precise page classification (`home`, `watch`, `results`, `channel`, `subscriptions`, `shorts`, `playlist`).
- **Interactive In-Page Element Picker**:
  - Closed Shadow DOM overlay (`#yt-unchained-picker-root`) preventing style leakage between extension HUD and YouTube.
  - Semantic selector generator prioritizing stable IDs, `target-id`, `aria-label`, and custom element hierarchies over fragile deep `:nth-child` chains.
  - Action modal supporting "Hide completely", "Collapse space", page-scoping ("Current page only" vs "All YouTube pages"), and custom naming.
- **Granular Interface Visibility Controls**:
  - Hide Shorts across navigation menus, homepage shelves, and watch recommendations.
  - Hide homepage recommendation feeds and watch-page related videos.
  - Hide comments, live-chat frames, and backstage community posts.
  - Hide video end cards, hover overlays, and pause overlay panels.
  - Hide merchandise carousels, ticket shelves, and shopping modules.
  - Hide gaming promotional shelves and YouTube Playables.
  - Strip algorithmic shelves ("People also watched", "For you") from search results.
  - Hide topbar notification bell and voice search buttons.
- **Layout & Spacing Customization**:
  - Configurable video grid columns (2, 3, 4, 5, 6, or auto).
  - High-density compact spacing mode.
  - Left navigation guide persistent collapse.
  - Distraction-Free viewing mode centering the player and stripping all peripheral noise.
  - Clean minimal player controls with hover disclosure.
- **Content Filtering Engine**:
  - Channel name blocklists with case-insensitive `contains` and `exact` match modes.
  - Video title keyword filtering with text and Regular Expression support.
  - Duration boundary filtering (minimum and maximum video length thresholds).
  - Automatic filtering of already-watched videos based on watch history progress bars.
  - Batched, debounced DOM mutation processing using `requestAnimationFrame` to ensure 60fps scrolling without layout thrashing.
- **Preset Profile Engine**:
  - Six built-in presets: *Default*, *Study Mode*, *Minimal Mode*, *Music Mode*, *Subscription Mode*, and *Distraction-Free*.
  - Non-destructive preset switching preserving custom element rules intact.
  - Reset built-in presets to factory defaults.
- **Appearance & Themes**:
  - Custom brand accent color overrides (Sky Cyan, Violet, Emerald, Amber, Rose).
  - True OLED Deep Black mode (`#000000`).
  - Reduced motion mode disabling heavy transitions.
- **Configuration Management**:
  - Local persistent storage via `chrome.storage.local`.
  - Versioned JSON export and import with schema validation.
  - Safety confirmations for destructive actions.
- **User Interface**:
  - Compact popup with master toggle, active preset switcher, quick toggles, page status indicator, and element picker launcher.
  - Comprehensive Settings Dashboard with tabbed navigation, live search, and statistics overview.
- **Test Automation Suite**:
  - 33 automated unit tests in Vitest covering the RuleEngine, SelectorGenerator, ContentFilter, StorageManager, and PageDetector.
- **Documentation**:
  - Comprehensive `README.md` with developer-mode installation instructions for Vivaldi and Chrome.
  - Detailed system architecture guide (`docs/architecture.md`).
  - Reference analysis of existing extensions (`docs/reference-analysis.md`).
  - Implementation roadmap (`docs/implementation-plan.md`).
  - QA verification and testing report (`docs/testing.md`).
