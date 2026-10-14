# Implementation Plan: YouTube Unchained

**Project:** YouTube Unchained  
**Target Browsers:** Vivaldi, Google Chrome, Chromium-based browsers (Manifest V3)  
**Architecture:** Vite + TypeScript + React 18 + Vitest + Playwright-ready  

---

## 1. Project Overview & Deliverables

YouTube Unchained is an extensible, user-controlled YouTube interface customization extension.
The project requires:
1. **Core Declarative Rule Engine**: Decoupled, modular system for visibility rules, layout variables, and custom user rules.
2. **Page Detection & SPA Navigation**: Seamless tracking of YouTube navigation (`yt-navigate-finish`, `popstate`, `mutation`) across page types (`home`, `watch`, `results`, `channel`, `subscriptions`, `shorts`).
3. **Content Filtering Engine**: Filtering video elements by channel name, keyword pattern matching, duration limits, and watched status, with batched and debounced DOM processing.
4. **Interactive In-Page Element Picker**: Shadow-DOM isolated HUD for point-and-click selection of YouTube UI elements, calculating stable semantic CSS selectors and generating editable, removable rules.
5. **Preset & Profile Management**: Built-in presets (Default, Study Mode, Minimal Mode, Music Mode, Subscription Mode, Distraction-Free) and custom user presets with export/import and schema migrations.
6. **Polished Extension Interfaces**:
   - Compact popup with master switch, active preset selector, quick toggles, and element picker launcher.
   - Comprehensive Settings Dashboard organized into tabs: Overview, Visibility, Layout, Content Filters, Custom Rules, Presets, Appearance, Diagnostics/Import/Export.
7. **Testing & Verification Suite**: Unit tests with Vitest covering the rule engine, selector generator, storage migration, and filter matcher. Reproducible build output in `dist/`.
8. **Comprehensive Documentation**: `README.md`, `docs/architecture.md`, `docs/reference-analysis.md`, `docs/implementation-plan.md`, `docs/testing.md`, and `CHANGELOG.md`.

---

## 2. Phase-by-Phase Execution Roadmap

### Phase 1: Reconnaissance & Environment Setup (Completed / In Progress)
- [x] Inspect local browser profiles and installed extensions (`Improve YouTube!`, `Enhancer for YouTube`, `Tweaks for YouTube`, `SponsorBlock`, `Better YouTube Search`, `StayFree`, `VisBug`, `Control Panel for Twitter`).
- [x] Generate `docs/reference-analysis.md`.
- [x] Create `docs/implementation-plan.md`.

### Phase 2: Project Architecture, Scaffolding & Tooling
- Initialize project with `package.json`, Vite, TypeScript strict configuration, Vitest, and CRX bundling.
- Establish clean directory hierarchy:
  - `src/manifest.json`: Manifest V3 specification with least-privilege permissions (`storage`).
  - `src/types/`: Strict TypeScript models for Settings, Rules, Presets, Filters, PageContext.
  - `src/shared/`: Storage manager, default settings, preset definitions, schema validators, logger.
  - `src/engine/`: RuleEngine, StyleManager, PageDetector, SelectorGenerator, DOMObserver.
  - `src/filters/`: ContentFilterManager (channel blocking, keyword regex, duration limits).
  - `src/picker/`: ElementPicker overlay with Shadow DOM, selection box, and rule creation modal.
  - `src/popup/`: React popup UI.
  - `src/options/`: React Settings Dashboard UI.
  - `src/content/`: Main content script entry point bridging storage, engine, filters, and picker.
  - `src/background/`: Background service worker managing icon state, context menus, and storage migrations.

### Phase 3: Core Functional Implementation
- **Step 3.1: Rule Engine & Style Generator**
  - Declarative CSS generator producing zero-latency scoped stylesheet.
  - Dynamic `document.documentElement` attribute synchronization (`yt-unchained-active`, page type, theme).
  - Native CSS variable overrides for YouTube grid items per row, spacing, sidebar width, and accent colors.
- **Step 3.2: SPA Navigation & Page Detector**
  - Listen to `yt-navigate-finish`, `yt-page-data-updated`, and popstate events.
  - Classify page types accurately (`home`, `watch`, `results`, `channel`, `subscriptions`, `shorts`).
  - Update page attributes and re-evaluate scoped page rules.
- **Step 3.3: Visibility Controls Library**
  - Implement comprehensive, resilient rules for Shorts, Recommendations, Comments, Live Chat, Gaming, Shopping/Merch, Sidebar items, End screens/cards, and Search recommendation shelves.
- **Step 3.4: Content Filtering Engine**
  - Implement robust channel name matching (case-insensitive substring and exact matches).
  - Implement title keyword matching (substring and regex).
  - Implement duration filtering (e.g. hide videos < 60s or > 60m).
  - Implement hide watched videos (detecting `ytd-thumbnail-overlay-resume-playback-renderer` progress bars).
  - Batching via `requestAnimationFrame` and throttled MutationObserver to guarantee 60fps scrolling without layout thrashing.
- **Step 3.5: Interactive Element Picker**
  - In-page pointer highlighter with bounding client rect calculations.
  - Closed Shadow DOM container preventing YouTube CSS from polluting the picker and vice-versa.
  - Smart selector generator: prioritizes semantic IDs, `data-*` attributes, YouTube custom element tags, and stable structural selectors while avoiding brittle `:nth-child` chains.
  - Modal action menu: "Hide this element", "Hide on this page type only", "Hide across all YouTube", with live preview and save/cancel.
- **Step 3.6: Presets, Profiles & Storage**
  - 6 built-in presets: Default, Study Mode, Minimal Mode, Music Mode, Subscription Mode, Distraction-Free.
  - Preset switching without clobbering custom element rules.
  - JSON configuration export/import with validation and migration logic.
  - Reset to default with safe confirmation.
- **Step 3.7: Popup & Settings Dashboard UI**
  - Modern, dark/light theme, high-density developer-grade interface.
  - Keyboard accessible, responsive layout with tabbed navigation and instant search.

### Phase 4: Verification, Testing & Build
- Configure Vitest with unit test suites:
  - `tests/rule-engine.test.ts`: CSS rule generation and attribute mapping.
  - `tests/selector-generator.test.ts`: Stable selector calculation and validation.
  - `tests/content-filter.test.ts`: Channel, keyword, and duration filtering logic.
  - `tests/storage-migration.test.ts`: Preset switching, import/export schema validation, and migration.
- Execute TypeScript build (`tsc --noEmit`).
- Execute production build (`npm run build`).
- Verify generated `dist/` directory satisfies Chrome Extension MV3 requirements.
- Document testing procedures in `docs/testing.md`.

### Phase 5: Documentation & Release Readiness
- Generate `README.md` with complete installation guides for Vivaldi & Chrome developer mode.
- Generate `docs/architecture.md`.
- Generate `CHANGELOG.md`.
- Package clean, reproducible unpacked extension build.
