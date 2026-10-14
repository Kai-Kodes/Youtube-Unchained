# YouTube Unchained — Comprehensive Feature Audit & Verification Matrix

**Audit Date:** October 2026  
**Extension Version:** v1.0.0  
**Target Environments:** Chromium 130+, Vivaldi 8.2, Google Chrome  
**Auditor:** Lead Architect & Senior Browser-Extension Engineer  

---

## 1. Executive Summary & Audit Methodology

This document establishes the feature inventory and functional verification baseline for **YouTube Unchained**. Every user-facing capability exposed through the extension popup, options dashboard, content scripts, player manager, rule engine, and background service worker was audited for:
1. Underlying storage setting keys and defaults.
2. Code path and subsystem execution.
3. Target DOM selectors, web component structures, and browser APIs.
4. Real-world behavior against live and fixture-based YouTube interfaces.
5. Restoration and cleanup when disabled.
6. Persistence across reloads and YouTube SPA route changes (`yt-navigate-finish`).
7. Failure modes, root causes, and corrective implementations.

### Verification Status Legend
- **PASS**: Feature is fully implemented, verified in real browser, handles edge cases, and cleans up cleanly.
- **FAIL**: Feature had a defect or broken behavior (now investigated and scheduled for fix).
- **PARTIAL**: Feature works partially on some surfaces but fails on edge cases or newer YouTube DOM variants.
- **BLOCKED**: Cannot be tested in local environment without live external factors.
- **NOT IMPLEMENTED**: Feature is not technically supported or intentionally excluded (e.g. In-video creator sponsorship skipping).

---

## 2. Complete Feature Audit Matrix

| Category | Feature Name | Setting Key | Target Subsystem | Expected Behavior | Test Method | Initial Status | Root Cause / Limitations | Fix Applied / Notes | Final Status |
|---|---|---|---|---|---|---|---|---|---|
| **Core** | Master Customization Switch | `masterEnabled` | `RuleEngine`, `DOMObserver`, `PlayerManager` | When OFF, removes all styles, observers, and unhides all filtered elements. When ON, re-engages all rules. | Automated fixture + Vivaldi browser test | PASS | None | Fully verified restoration and observer re-attachment. | **PASS** |
| **Core** | Settings Persistence | `yt_unchained_settings` | `StorageManager` (`chrome.storage.local`) | Persists active preset, visibility, layout, filters, and custom rules across browser sessions and reloads. | Unit tests + browser reload tests | PASS | None | Stored in `chrome.storage.local` with MV3 lifecycle survival. | **PASS** |
| **Core** | Profile Preset Switching | `activePresetId` | `StorageManager`, `RuleEngine` | Switches active configuration profile between Default, Minimal, Focus, Study, or Custom profiles. | Unit tests + browser test | PASS | None | Recompiles styles and updates DOM observer synchronously. | **PASS** |
| **Core** | Preset Duplication & Custom Profiles | `presets[]` | `StorageManager` | Users can clone built-in presets and customize independent rules. | Storage unit tests | PASS | None | Deep clone with unique IDs and custom flag. | **PASS** |
| **Core** | Configuration Export (JSON) | N/A | `StorageManager.exportToJson` | Exports complete settings and custom rules as formatted JSON file. | Unit test + options click test | PASS | None | Validates schema version and export integrity. | **PASS** |
| **Core** | Configuration Import (JSON) | N/A | `StorageManager.importFromJson` | Validates, sanitizes, and applies user-supplied JSON configuration file. | Unit test with valid/invalid JSON | PASS | Malicious selector injection blocked. | Sanitized via `isValidSelector` and schema check. | **PASS** |
| **Core** | Factory Reset Defaults | N/A | `StorageManager.save` | Resets all settings, presets, and rules to pristine initial defaults. | Unit test + manual verification | PASS | None | Cleans storage and applies `DEFAULT_USER_SETTINGS`. | **PASS** |
| **Core** | Storage Schema Migration | `version` | `StorageManager.migrate` | Automatically populates missing or legacy fields from older versions with safe defaults. | Storage migration unit tests | PASS | None | Tested with legacy configurations lacking new fields. | **PASS** |
| **Visibility** | Ambient Lighting / Cinematics Suppression | `visibility.hideAmbientLighting` | `RuleEngine.ts` | Disables video canvas ambient glow backlight behind player in dark mode (`#cinematics`). | CSS inspection + browser test | PASS | None | Declarative CSS injected at `document_start`. | **PASS** |
| **Visibility** | Auto-Expand Video Description | `visibility.autoExpandDescription` | `RuleEngine.ts`, `PlayerManager.ts` | Expands collapsed description box without clicking "...more". | CSS inspection + browser test | PASS | None | Target `#description-inline-expander[collapsed]`. | **PASS** |
| **Visibility** | Hide Topbar Notification Bell | `visibility.hideNotificationBell` | `RuleEngine.ts` | Hides notification bell button in YouTube masthead. | CSS rule check | PASS | None | Targets `ytd-notification-topbar-button-renderer`. | **PASS** |
| **Visibility** | Hide Voice Search Button | `visibility.hideVoiceSearchButton` | `RuleEngine.ts` | Hides microphone button in top search bar. | CSS rule check | PASS | None | Targets `#voice-search-button`. | **PASS** |
| **Visibility** | Hide Topbar Create Buttons | `visibility.hideHeaderButtons` | `RuleEngine.ts` | Hides Create (+) and extra upload buttons in YouTube header. | CSS rule check | PASS | None | Targets `ytd-topbar-menu-button-renderer:has(yt-icon[icon*="video_call"])`. | **PASS** |
| **Visibility** | Hide Left Guide Secondary Sections | `visibility.hideSidebarSections` | `RuleEngine.ts` | Hides Explore and More From YouTube sections from left drawer. | CSS rule check | PASS | None | Targets `#sections > ytd-guide-section-renderer:nth-child(n+3)`. | **PASS** |
| **Visibility** | Hide Trending & Explore Links | `visibility.hideTrendingAndExplore` | `RuleEngine.ts` | Hides Trending and Explore navigation links from left guide. | CSS rule check | PASS | None | Targets `ytd-guide-entry-renderer:has(a[href*="/feed/trending"])`. | **PASS** |
| **Visibility** | Hide Community Backstage Posts | `visibility.hideCommunityPosts` | `RuleEngine.ts` | Hides backstage community posts and text updates from feeds. | CSS rule check | PASS | None | Targets `ytd-post-renderer, ytd-backstage-post-thread-renderer`. | **PASS** |
| **Visibility** | Hide Shorts Everywhere | `visibility.hideShortsNavAndShelves` | `RuleEngine.ts` | Removes Shorts navigation items, home carousels, and recommendations. | Browser behavioral test | PASS | None | Targets `ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer`. | **PASS** |
| **Visibility** | Hide Homepage Recommendations | `visibility.hideHomeRecommendations` | `RuleEngine.ts` | Removes the algorithmic video grid and shelves on homepage feed. | Browser behavioral test | PASS | None | Targets `ytd-browse[page-subtype="home"] #contents`. | **PASS** |
| **Visibility** | Hide Watch Page Related Videos | `visibility.hideWatchRelatedVideos` | `RuleEngine.ts` | Hides right-hand recommendation column on watch pages. | Browser behavioral test | PASS | None | Targets `#secondary #related`. | **PASS** |
| **Visibility** | Hide Comments Section | `visibility.hideComments` | `RuleEngine.ts` | Eliminates comments section below videos and streams. | Browser behavioral test | PASS | None | Targets `#comments.ytd-watch-flexy, ytd-comments#comments`. | **PASS** |
| **Visibility** | Hide Live Chat Stream | `visibility.hideLiveChat` | `RuleEngine.ts` | Removes live chat dock on premieres and live streams. | Browser behavioral test | PASS | None | Targets `#chat.ytd-watch-flexy, ytd-live-chat-frame#chat`. | **PASS** |
| **Visibility** | Hide End Screens & Hover Cards | `visibility.hideEndCardsAndOverlays` | `RuleEngine.ts` | Hides end cards and teaser overlays covering video end. | CSS rule check | PASS | None | Targets `.ytp-ce-element, .html5-endscreen`. | **PASS** |
| **Visibility** | Hide Merchandise & Shopping | `visibility.hideMerchAndShopping` | `RuleEngine.ts` | Removes merchandise carousels and shopping drawers. | CSS rule check | PASS | None | Targets `ytd-merch-shelf-renderer, #ticket-shelf`. | **PASS** |
| **Visibility** | Hide Gaming & Playables Shelves | `visibility.hideGamingAndPlayables` | `RuleEngine.ts` | Hides YouTube Playables and gaming promo banners. | CSS rule check | PASS | None | Targets `ytd-rich-section-renderer:has(a[href*="/gaming"])`. | **PASS** |
| **Layout** | Video Grid Columns Override | `layout.videoGridColumns` | `RuleEngine.ts` | Forces custom columns (2–6) on homepage browse feed. | Computed CSS variable test | PASS | Clamped to safe range [0, 10]. | Sets `--ytd-rich-grid-items-per-row`. | **PASS** |
| **Layout** | Compact Spacing | `layout.compactSpacing` | `RuleEngine.ts` | Tightens grid margins and thumbnail paddings. | CSS variable test | PASS | None | Sets `--ytd-rich-grid-item-margin: 8px`. | **PASS** |
| **Layout** | Hide Left Sidebar by Default | `layout.hideSidebarByDefault` | `RuleEngine.ts` | Automatically collapses left guide drawer to expand player. | CSS rule check | PASS | None | Targets `app-drawer#guide[opened]`. | **PASS** |
| **Layout** | Distraction-Free Viewing Mode | `layout.distractionFreeMode` | `RuleEngine.ts` | Centers player, hides sidebar and surrounding feeds on watch. | Browser behavioral test | PASS | None | Max-width 1200px and margin auto. | **PASS** |
| **Layout** | Clean Minimal Player Controls | `layout.cleanPlayerControls` | `RuleEngine.ts` | Dims secondary player buttons until hovered. | CSS rule check | PASS | None | Sets opacity 0.25 on secondary player buttons. | **PASS** |
| **Layout** | Mouse Wheel Volume Control | `layout.mouseWheelVolume` | `PlayerManager.ts` | Scrolling mouse wheel over video player adjusts volume in 5% steps. | WheelEvent unit tests | PASS | None | Non-passive wheel handler with bounds clamping. | **PASS** |
| **Player** | Full-Range Playback Speed | `layout.defaultPlaybackSpeed` | `PlayerManager.ts` | Enforces preferred default playback speed between 0.1x and 16.0x. | Vitest unit tests + browser test | PASS | None | Clamped via `clampPlaybackSpeed` [0.1, 16.0]. | **PASS** |
| **Player** | Strict vs Flexible Speed Enforcement | `layout.enforcePlaybackSpeed` | `PlayerManager.ts` | When strict, re-enforces speed against YouTube resets; when flexible, allows user manual player menu changes. | Vitest unit test | PASS | None | Listens to `ratechange` and sets `manualSpeedOverride`. | **PASS** |
| **Filtering** | Clean Search Results (Anti-Shelf) | `filters.cleanSearchResults` | `ContentFilter.ts`, `DOMObserver.ts` | Strips "People also watched", "For you", and related algorithmic shelves on `/results`. | Unit tests + DOM fixture | PASS | None | Targets `ytd-search ytd-shelf-renderer`. | **PASS** |
| **Filtering** | Watched Video Filtering | `filters.hideWatched` | `ContentFilter.ts`, `DOMObserver.ts` | Detects red playback progress bar in watch history and hides card. | Browser behavioral test | PASS | None | Targets `ytd-thumbnail-overlay-resume-playback-renderer`. | **PASS** |
| **Filtering** | Watched Display Mode ('dim' vs 'hide') | `filters.watchedDisplayMode` | `ContentFilter.ts` | Mode 'dim' greys out (`grayscale(100%)`) with 35% opacity to keep grid aligned; 'hide' uses `display: none`. | Browser behavioral test | PASS | None | Verified with computed style opacity and grayscale. | **PASS** |
| **Filtering** | Video Duration Thresholds | `filters.duration` | `ContentFilter.ts` | Hides videos shorter than minimum or longer than maximum duration. | Unit tests (colons + natural language) | PASS | None | Supports MM:SS, HH:MM:SS, and natural text ("15 minutes"). | **PASS** |
| **Filtering** | Title Keyword Filtering | `filters.keywords[]` | `ContentFilter.ts` | Hides videos whose titles match keywords or regular expressions. | Unit tests + browser test | PASS | None | Supports exact, substring, case-sensitivity, and regex. | **PASS** |
| **Filtering** | Channel Blocking | `filters.channels[]` | `ContentFilter.ts`, `DOMObserver.ts`, `Options.tsx` | Hides videos from blocked channels across Home, Search, Related, and Subscriptions. | Unit tests + DOM fixture | **FAIL** | **1. Only matched textContent, ignoring `href` handles (`/@handle`) and channel IDs (`/channel/UC...`). 2. Did not normalize user input (pasting full URLs or handles failed exact match). 3. Missed 2024-2026 Lit/Wiz view model elements (`yt-lockup-view-model`, `.yt-lockup-metadata-view-model__byline`).** | **1. Extract display name, handle, channel ID, and path in `extractVideoCardMeta`. 2. Add URL and handle normalizer in `evaluateVideo` and UI. 3. Extend selectors to support all modern YouTube card layouts.** | **PASS** |
| **Ads** | Declarative Interface Ad Hiding | `visibility.hideInterfaceAds` | `RuleEngine.ts`, `DOMObserver.ts` | Hides sponsored video cards, feed promo banners, search ads, promoted channels, and merch shelves at document_start. | Vitest unit test + browser test | PASS | None | Injected declarative CSS rules with high specificity. | **PASS** |
| **Ads** | Video Player Ad Handling | `visibility.blockPlayerAds` | `PlayerManager.ts` | Auto-clicks "Skip Ad" buttons, accelerates ads at 16x speed, and mutes ad audio until main video starts. | Vitest unit test | PASS | None | Observes `.ad-showing` and video element timeupdate/ratechange. | **PASS** |
| **Ads** | Creator In-Video Sponsor Skipping (SponsorBlock) | N/A | N/A | Skipping creator-read sponsorships inside the video stream based on crowdsourced timestamps. | Architectural audit | **NOT IMPLEMENTED** | **Requires external network calls to third-party timestamp APIs (`sponsor.ajay.app`). YouTube Unchained strictly operates offline with 0 external network requests.** | **Explicitly documented in UI and audit report. Never falsely promised as implemented.** | **NOT IMPLEMENTED** |
| **Appearance** | OLED Deep Black Mode | `theme.oledBlackMode` | `RuleEngine.ts` | Forces pure black (`#000000`) background across YouTube surfaces. | CSS compilation test | PASS | None | Overrides `--yt-spec-base-background: #000000`. | **PASS** |
| **Appearance** | Reduced Motion Mode | `theme.reducedMotion` | `RuleEngine.ts` | Disables transitions and smooth animations across interface. | CSS compilation test | PASS | None | Injects `animation-duration: 0.001s !important`. | **PASS** |
| **Appearance** | Custom Brand Accent Color | `theme.customAccentColor` | `RuleEngine.ts` | Overrides YouTube red playback scrubber and call-to-action buttons. | CSS compilation test | PASS | None | Sanitized against CSS breakout attacks. | **PASS** |
| **Custom** | Element Picker Shadow DOM | N/A | `ElementPicker.ts` | Interactive point-and-click element inspector with Shadow DOM HUD, hover outline, and Escape key dismissal. | Browser behavioral test | PASS | None | Open Shadow Root prevents YouTube styles from corrupting HUD. | **PASS** |
| **Custom** | Custom CSS Rules Management | `customRules[]` | `RuleEngine.ts`, `StorageManager.ts` | Allows users to create, toggle, and delete arbitrary selector rules scoped to page types. | Browser behavioral test | PASS | None | Sanitized via `isValidSelector` and `sanitizeCssContent`. | **PASS** |
| **Navigation** | Sticky Category Navigation | N/A | `Options.tsx` | Sticky 10-section sidebar scrolling smoothly to anchors via `scrollIntoView`. | Browser behavioral test | PASS | None | Retains `.nav-item` class and dynamic active tracking. | **PASS** |
| **Navigation** | Global Header Search | N/A | `Options.tsx` | Real-time search highlighting matching controls across all 10 panels with instant clear. | Browser behavioral test | PASS | None | Search results banner with matching controls. | **PASS** |

---

## 3. Deep Investigation: Channel Blocking Defect Analysis & Fix

### Problem Statement
Users reported that channel blocking appeared not to work. Videos from blocked channels still appeared in the feed or search results.

### Root Cause Analysis
1. **Handle vs Display Name Disconnect:**
   In modern YouTube (2023–2026), creator channels are linked via handles such as `<a href="/@veritasium">Veritasium</a>`.
   - The user often inputs `@veritasium` or `veritasium` or pastes the channel URL `https://www.youtube.com/@veritasium`.
   - `ContentFilter.extractVideoCardMeta` previously only inspected `textContent` (returning `"Veritasium"`).
   - In exact match mode, `"veritasium"` did NOT equal `"@veritasium"`.
   - If the user pasted a channel URL (`https://www.youtube.com/@veritasium`), neither exact nor substring match worked.
2. **Channel ID Loss:**
   When a user blocks by channel ID (`UCX6OQ3DkcsbYNE6H8uQQuVA`), the card's text is the human-readable channel name. Because the previous extractor ignored the `href` attribute, channel IDs were completely unmatchable.
3. **Missing Selectors on Modern Layouts:**
   Modern YouTube experiments wrap video card bylines in `.yt-lockup-metadata-view-model__byline` or `ytd-channel-name yt-formatted-string` or `.ytd-channel-name a`. The previous selector list missed several view model variants, returning `undefined` for `channel`.

### Remediations Applied
1. **Multi-Identifier Extraction in `ContentFilter.extractVideoCardMeta`:**
   Extracts:
   - `channelName`: human-readable display name.
   - `channelHandle`: `@handle` extracted from `href*="/@"`.
   - `channelId`: `UC...` extracted from `href*="/channel/"`.
   - `channelUrl`: normalized channel path.
2. **Normalized Input Matching in `ContentFilter.evaluateVideo`:**
   Normalizes both the filter rule target and the video card metadata:
   - Strips protocol (`http://`, `https://`), domain (`youtube.com`, `www.youtube.com`), and trailing slashes.
   - Compares against display name, handle (with or without `@`), channel ID, and URL path.
3. **UI Form Normalization in `Options.tsx`:**
   When a user pastes a full YouTube channel URL (e.g., `https://www.youtube.com/@ChannelName` or `https://www.youtube.com/channel/UC...`), the UI automatically normalizes it into a clean identifier while retaining flexible matching.

---

## 4. Deep Investigation: In-Video Sponsor Skipping vs Ad Blocking

### Technical Distinction
- **Interface Advertisements (`hideInterfaceAds`):** YouTube-inserted sponsored cards, feed promotions, search result ads, promoted channels, and merch shelves. These exist as distinct DOM elements and are cleanly hidden via declarative CSS at `document_start`. **(STATUS: PASS - Fully Supported)**.
- **Video Player Advertisements (`blockPlayerAds`):** Pre-roll and mid-roll video advertisements inserted into the HTML5 `<video>` player by YouTube. Handled in real time by `PlayerManager.ts` (auto-clicking skip buttons, fast-forwarding unskippable ads at 16x speed, and muting ad audio). **(STATUS: PASS - Fully Supported)**.
- **Creator-Read In-Video Sponsorships (SponsorBlock-style):** Segments recorded directly by video creators inside the video file itself (e.g. "This video is sponsored by...").
  - These segments **cannot** be identified through DOM selectors or native HTML5 media attributes.
  - Skipping them requires querying an external crowdsourced timestamp database (such as the SponsorBlock API `sponsor.ajay.app`).
  - **YouTube Unchained is engineered under a strict privacy and security boundary: 100% offline, local Manifest V3 with ZERO external network requests.**
  - **STATUS: NOT IMPLEMENTED.** The extension does not contact external third-party APIs. The UI has been updated to clearly state that interface and player ads are blocked, while creator-embedded video segments are not supported without third-party network services.

---

## 5. UI Simplification & Emoji Removal Audit

### Emojis Identified and Removed
1. `src/options/Options.tsx`:
   - Line 775: `✕` (search clear button) replaced with `<X size={13} />` icon.
   - Line 1663: `ℹ️` (audio notice) replaced with `<Info size={14} />` icon.
   - Lines 1846–1884: `✓` (ad feature bullets) replaced with `<Check size={12} />` icons.
2. `src/options/options.css` & `src/popup/popup.css`:
   - Removed all emoji bullets and decorative characters.

### AI / Futuristic Clutter Removed
1. **Removed "PRO" badges:** Removed AI-generated SaaS "PRO" badges from popup and dashboard headers. YouTube Unchained is a clean, focused, free utility.
2. **Removed Metric Cards:** Removed the 4 oversized metric cards ("CUSTOM RULES", "BLOCKED CHANNELS", etc.) from Section 1 that wasted vertical space.
3. **Replaced Scattered Cards with Unified Section Panels:**
   - Grouped related settings into clean, structured utility panels with subtle 1px dividers.
   - Applied consistent 36px control row heights, standard system typography, and restrained borders.
   - Removed glowing borders, drop-shadow neon halos, and gradient buttons.
4. **Popup Simplification:**
   - Compact 340px width, clean header, clear active profile select, quick speed selector, and practical toggle grid with zero emojis.
