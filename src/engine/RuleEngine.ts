import {
  UserSettings,
  PresetProfile,
  CustomRule,
  PageType,
} from '../types';

export class RuleEngine {
  /**
   * Compiles the entire CSS stylesheet from the user settings and active preset
   */
  static compileCss(settings: UserSettings, currentPage: PageType = 'all'): string {
    if (!settings.masterEnabled) {
      return '/* YouTube Unchained is Disabled */';
    }

    const activePreset = settings.presets.find((p) => p.id === settings.activePresetId) || settings.presets[0];
    if (!activePreset) {
      return '';
    }

    const cssBlocks: string[] = [];

    // Root flag block
    cssBlocks.push(`
      /* YouTube Unchained Base Root Variables */
      html[yt-unchained-active="true"] {
        --yt-unchained-loaded: 1;
      }
    `);

    // Visibility Rules
    cssBlocks.push(this.generateVisibilityCss(activePreset));

    // Layout Rules
    cssBlocks.push(this.generateLayoutCss(activePreset));

    // Theme Rules
    cssBlocks.push(this.generateThemeCss(activePreset));

    // Custom User Rules
    cssBlocks.push(this.generateCustomRulesCss(settings.customRules, currentPage));

    return cssBlocks.filter(Boolean).join('\n\n');
  }

  /**
   * Generate CSS for built-in visibility controls
   */
  private static generateVisibilityCss(preset: PresetProfile): string {
    const { visibility } = preset;
    const rules: string[] = [];

    if (visibility.hideShortsNavAndShelves) {
      rules.push(`
        /* Hide Shorts in Shelves, Feeds, and Navigation */
        ytd-rich-shelf-renderer[is-shorts],
        #contents ytd-reel-shelf-renderer,
        ytd-reel-shelf-renderer,
        ytd-shorts,
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        ytd-guide-entry-renderer:has(a[href^="/shorts"]),
        a[title="Shorts"],
        yt-chip-cloud-chip-renderer:has(yt-formatted-string[title="Shorts"]),
        ytd-rich-grid-slim-media,
        ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        yt-lockup-view-model:has(a[href*="/shorts/"]) {
          display: none !important;
        }
      `);
    }

    if (visibility.hideHomeRecommendations) {
      rules.push(`
        /* Hide Home Recommendations Feed */
        ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer #contents {
          display: none !important;
        }
      `);
    }

    if (visibility.hideWatchRelatedVideos) {
      rules.push(`
        /* Hide Watch Page Secondary / Related Recommendations */
        #related.ytd-watch-flexy,
        #items.ytd-watch-next-secondary-results-renderer,
        ytd-watch-next-secondary-results-renderer,
        ytd-rich-grid-renderer.ytd-watch-grid {
          display: none !important;
        }
      `);
    }

    if (visibility.hideComments) {
      rules.push(`
        /* Hide Comments Section */
        #comments.ytd-watch-flexy,
        ytd-comments#comments,
        #comment-teaser,
        ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] {
          display: none !important;
        }
      `);
    }

    if (visibility.hideLiveChat) {
      rules.push(`
        /* Hide Live Chat */
        #chat.ytd-watch-flexy,
        ytd-live-chat-frame#chat,
        ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-live-chat"],
        #chat-container {
          display: none !important;
        }
      `);
    }

    if (visibility.hideEndCardsAndOverlays) {
      rules.push(`
        /* Hide Video End Cards and Popover Cards */
        .ytp-ce-element,
        .html5-endscreen:not(.mweb-endscreen),
        .ytp-endscreen-content,
        .ytp-cards-button,
        .ytp-cards-teaser,
        .ytp-pause-overlay-container {
          display: none !important;
        }
      `);
    }

    if (visibility.hideMerchAndShopping) {
      rules.push(`
        /* Hide Merchandise & Shopping Shelves */
        ytd-merch-shelf-renderer,
        div.ytp-suggested-action,
        #ticket-shelf,
        ytd-engagement-panel-section-list-renderer[target-id*="shopping"],
        ytd-rich-section-renderer:has(ytd-merch-shelf-renderer) {
          display: none !important;
        }
      `);
    }

    if (visibility.hideGamingAndPlayables) {
      rules.push(`
        /* Hide Gaming and Playables Promotion Shelves */
        ytd-rich-section-renderer:has(a[href*="/gaming"]),
        ytd-guide-entry-renderer:has(a[href*="/gaming"]),
        ytd-rich-section-renderer:has(a[href*="/playables"]),
        ytd-guide-entry-renderer:has(a[href*="/playables"]),
        ytd-mini-guide-entry-renderer[aria-label="Playables"],
        ytd-mini-guide-entry-renderer[aria-label="Gaming"] {
          display: none !important;
        }
      `);
    }

    if (visibility.hideTrendingAndExplore) {
      rules.push(`
        /* Hide Trending and Explore Navigation Entries */
        ytd-guide-entry-renderer:has(a[href*="/feed/trending"]),
        ytd-guide-entry-renderer:has(a[href*="/feed/explore"]),
        ytd-mini-guide-entry-renderer[aria-label="Trending"] {
          display: none !important;
        }
      `);
    }

    if (visibility.hideCommunityPosts) {
      rules.push(`
        /* Hide Community Backstage Posts */
        ytd-post-renderer,
        ytd-backstage-post-thread-renderer,
        ytd-rich-section-renderer:has(ytd-post-renderer),
        ytd-rich-section-renderer:has(ytd-backstage-post-thread-renderer) {
          display: none !important;
        }
      `);
    }

    if (visibility.hideNotificationBell) {
      rules.push(`
        /* Hide Topbar Notification Bell */
        ytd-notification-topbar-button-renderer {
          display: none !important;
        }
      `);
    }

    if (visibility.hideVoiceSearchButton) {
      rules.push(`
        /* Hide Voice Search Button */
        #voice-search-button {
          display: none !important;
        }
      `);
    }

    if (visibility.hideHeaderButtons) {
      rules.push(`
        /* Hide Create (+) and Extra Topbar Buttons */
        ytd-topbar-menu-button-renderer:has(yt-icon[icon="yt-icons:video_call"]),
        #buttons ytd-button-renderer:has(a[href*="/upload"]) {
          display: none !important;
        }
      `);
    }

    if (visibility.hideSidebarSections) {
      rules.push(`
        /* Hide Explore & More From YouTube Sections in Left Guide */
        #sections > ytd-guide-section-renderer:nth-child(n+3) {
          display: none !important;
        }
      `);
    }

    if (visibility.hideAmbientLighting) {
      rules.push(`
        /* Hide Ambient Lighting / Canvas Glow / Cinematics */
        #cinematics,
        #ambient-canvas,
        .ytp-ambient-lighting,
        ytd-watch-flexy[cinematics-enabled] #cinematics,
        #cinematics-container {
          display: none !important;
          opacity: 0 !important;
        }
      `);
    }

    if (visibility.autoExpandDescription) {
      rules.push(`
        /* Auto-Expand Video Description */
        ytd-watch-metadata[description-collapsed] #description-inline-expander[collapsed] {
          max-height: none !important;
        }
        #description-inline-expander[collapsed] #snippet {
          display: none !important;
        }
        #description-inline-expander[collapsed] #content {
          display: block !important;
        }
        #description-inline-expander[collapsed] #expand {
          display: none !important;
        }
      `);
    }

    if (visibility.hideInterfaceAds) {
      rules.push(`
        /* Hide Interface Advertisements & Sponsored Elements */
        ytd-ad-slot-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-banner-promo-renderer,
        #masthead-ad,
        ytd-masthead-ad-v3-renderer,
        ytd-promoted-sparkles-web-renderer,
        ytd-promoted-video-renderer,
        ytd-search ytd-ad-slot-renderer,
        #player-ads,
        ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
        yt-mealbar-promo-renderer,
        .ytd-mealbar-promo-renderer,
        ytd-statement-banner-renderer,
        ytd-action-companion-ad-renderer,
        .ytp-ad-overlay-container,
        .ytp-ad-overlay-slot,
        .ytp-ad-message-container,
        ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
        ytd-rich-section-renderer:has(ytd-statement-banner-renderer) {
          display: none !important;
        }
      `);
    }

    return rules.join('\n');
  }

  /**
   * Generate CSS for layout modifications
   */
  private static generateLayoutCss(preset: PresetProfile): string {
    const { layout } = preset;
    const rules: string[] = [];

    // Custom Video Grid Columns
    const cols = Math.max(0, Math.min(10, Math.floor(Number(layout.videoGridColumns) || 0)));
    if (cols > 0) {
      rules.push(`
        /* Custom Video Grid Columns: ${cols} */
        ytd-rich-grid-renderer {
          --ytd-rich-grid-items-per-row: ${cols} !important;
        }
        ytd-rich-grid-row #contents {
          display: flex !important;
          flex-wrap: wrap !important;
        }
      `);
    }

    // Compact Spacing
    if (layout.compactSpacing) {
      rules.push(`
        /* Compact Video Grid Spacing */
        ytd-rich-grid-renderer {
          --ytd-rich-grid-item-margin: 8px !important;
          --ytd-rich-grid-row-margin: 12px !important;
        }
        ytd-rich-item-renderer {
          margin-bottom: 12px !important;
        }
        #video-title {
          font-size: 1.35rem !important;
          line-height: 1.8rem !important;
        }
      `);
    }

    // Hide Sidebar By Default
    if (layout.hideSidebarByDefault) {
      rules.push(`
        /* Hide Persistent Sidebar */
        app-drawer#guide,
        #guide-wrapper,
        ytd-mini-guide-renderer {
          display: none !important;
        }
        ytd-page-manager {
          margin-left: 0 !important;
        }
      `);
    }

    // Custom Sidebar Width
    const sidebarWidth = Math.max(0, Math.min(800, Math.floor(Number(layout.sidebarWidthPx) || 0)));
    if (sidebarWidth > 0) {
      rules.push(`
        /* Custom Sidebar Width: ${sidebarWidth}px */
        app-drawer#guide,
        #guide-wrapper,
        ytd-guide-renderer {
          width: ${sidebarWidth}px !important;
        }
      `);
    }

    // Distraction Free Mode
    if (layout.distractionFreeMode) {
      rules.push(`
        /* Distraction-Free Viewing Mode */
        #related,
        #comments,
        #chat,
        ytd-live-chat-frame,
        app-drawer#guide,
        ytd-mini-guide-renderer,
        ytd-notification-topbar-button-renderer,
        .ytp-ce-element,
        .html5-endscreen {
          display: none !important;
        }
        ytd-watch-flexy[flexy] #primary.ytd-watch-flexy {
          max-width: 1200px !important;
          margin: 0 auto !important;
          float: none !important;
        }
        ytd-watch-flexy[flexy] #columns.ytd-watch-flexy {
          justify-content: center !important;
        }
      `);
    }

    // Clean Player Controls
    if (layout.cleanPlayerControls) {
      rules.push(`
        /* Clean Minimal Video Player Controls */
        .ytp-subtitles-button,
        .ytp-miniplayer-button,
        .ytp-size-button {
          opacity: 0.5;
          transition: opacity 0.2s ease;
        }
        .ytp-subtitles-button:hover,
        .ytp-miniplayer-button:hover,
        .ytp-size-button:hover {
          opacity: 1;
        }
      `);
    }

    return rules.join('\n');
  }

  /**
   * Generate CSS for theme overrides
   */
  private static generateThemeCss(preset: PresetProfile): string {
    const { theme } = preset;
    const rules: string[] = [];

    // Custom Accent Color
    const cleanColor = this.sanitizeColor(theme.customAccentColor);
    if (cleanColor) {
      rules.push(`
        /* Custom Accent Color */
        html {
          --yt-spec-brand-button-background: ${cleanColor} !important;
          --yt-spec-static-brand-red: ${cleanColor} !important;
          --yt-spec-call-to-action: ${cleanColor} !important;
        }
        .ytp-play-progress,
        .ytp-scrubber-button {
          background-color: ${cleanColor} !important;
        }
      `);
    }

    // OLED Deep Black
    if (theme.oledBlackMode) {
      rules.push(`
        /* OLED True Black Mode */
        html[dark],
        html[dark] ytd-app,
        html[dark] #masthead-container,
        html[dark] ytd-masthead,
        html[dark] #page-manager,
        html[dark] body {
          background: #000000 !important;
          background-color: #000000 !important;
        }
      `);
    }

    // Reduced Motion
    if (theme.reducedMotion) {
      rules.push(`
        /* Reduced Motion */
        * {
          animation-duration: 0.001s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001s !important;
        }
      `);
    }

    return rules.join('\n');
  }

  private static sanitizeColor(val: string): string {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    // Valid hex (#fff, #123456, #12345678)
    if (/^#([0-9a-fA-F]{3,8})$/.test(trimmed)) {
      return trimmed;
    }
    // Valid rgb/rgba/hsl/hsla functions
    if (/^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,+-]+\s*\)$/i.test(trimmed)) {
      return trimmed;
    }
    // Valid single-word named color keywords (e.g. red, blue, transparent)
    if (/^[a-zA-Z]{3,20}$/.test(trimmed)) {
      return trimmed;
    }
    return '';
  }

  private static sanitizeCssContent(content: string): string {
    if (!content || typeof content !== 'string') return '';
    return content
      .replace(/<\/style/gi, '<\\/style')
      .replace(/<script/gi, '<\\/script')
      .replace(/javascript\s*:/gi, '')
      .replace(/expression\s*\(/gi, '');
  }

  private static isValidSelector(selector: string): boolean {
    if (!selector || typeof selector !== 'string') return false;
    // Reject selectors with closing style tags, curly braces, angle brackets, or semicolons
    if (/[<>{};]/.test(selector) || /<\/style/i.test(selector)) return false;
    if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      try {
        document.querySelector(selector);
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate CSS for user-created custom rules
   */
  private static generateCustomRulesCss(rules: CustomRule[], currentPage: PageType): string {
    if (!rules || rules.length === 0) return '';

    const output: string[] = ['/* User-Defined Custom Rules */'];

    for (const rule of rules) {
      if (!rule.enabled || !rule.selector) continue;
      if (!this.isValidSelector(rule.selector)) continue;

      // Check page scoping
      const isTargeted =
        rule.targetPages.includes('all') ||
        rule.targetPages.includes(currentPage) ||
        currentPage === 'all';

      if (!isTargeted) continue;

      const cleanSelector = rule.selector.trim();
      let styleRule = '';
      if (rule.action === 'hide') {
        styleRule = `${cleanSelector} { display: none !important; }`;
      } else if (rule.action === 'collapse') {
        styleRule = `${cleanSelector} { visibility: hidden !important; height: 0 !important; overflow: hidden !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }`;
      } else if (rule.action === 'custom-style' && rule.customCss) {
        const cleanCss = this.sanitizeCssContent(rule.customCss.trim());
        styleRule = `${cleanSelector} { ${cleanCss} }`;
      }

      if (styleRule) {
        output.push(`/* Custom Rule: ${rule.name || rule.id} */\n${styleRule}`);
      }
    }

    return output.join('\n\n');
  }
}
