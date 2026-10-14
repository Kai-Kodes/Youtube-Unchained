import { UserSettings, PageType } from '../types';
import { ContentFilter } from '../filters/ContentFilter';

const VIDEO_CONTAINER_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-grid-video-renderer',
  'yt-lockup-view-model',
].join(', ');

export class DOMObserver {
  private static observer: MutationObserver | null = null;
  private static rafId: number | null = null;
  private static pendingElements: Set<HTMLElement> = new Set();
  private static settings: UserSettings | null = null;
  private static currentPage: PageType = 'unknown';
  private static isScanning: boolean = false;

  /**
   * Initialize observer with current settings
   */
  static init(settings: UserSettings, pageType: PageType): void {
    this.settings = settings;
    this.currentPage = pageType;

    if (!settings.masterEnabled) {
      this.disconnect();
      return;
    }

    this.scan();

    if (!this.observer) {
      this.observer = new MutationObserver((mutations) => {
        let hasNewNodes = false;
        for (const m of mutations) {
          if (m.addedNodes.length > 0) {
            for (let i = 0; i < m.addedNodes.length; i++) {
              const node = m.addedNodes[i];
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                // Ignore mutations triggered by our own element picker or filter attributes
                if (
                  el.id === 'yt-unchained-picker-root' ||
                  el.id === 'yt-unchained-styles' ||
                  el.hasAttribute('data-yt-unchained-filtered')
                ) {
                  continue;
                }

                if (el.matches?.(VIDEO_CONTAINER_SELECTORS)) {
                  this.pendingElements.add(el);
                  hasNewNodes = true;
                } else if (el.querySelectorAll) {
                  const children = el.querySelectorAll<HTMLElement>(VIDEO_CONTAINER_SELECTORS);
                  if (children.length > 0) {
                    children.forEach((c) => this.pendingElements.add(c));
                    hasNewNodes = true;
                  }
                }

                // If a child node inside an existing video container was added (e.g. hydrated title or badges)
                const parentContainer = el.closest?.(VIDEO_CONTAINER_SELECTORS) as HTMLElement;
                if (parentContainer) {
                  this.pendingElements.add(parentContainer);
                  hasNewNodes = true;
                }
              }
            }
          }
        }

        if (hasNewNodes) {
          this.scheduleBatchProcess();
        }
      });

      const root = document.querySelector('ytd-app') || document.body || document.documentElement;
      if (root) {
        this.observer.observe(root, {
          childList: true,
          subtree: true,
        });
      }
    }
  }

  /**
   * Updates settings and triggers re-scan
   */
  static updateSettings(settings: UserSettings, pageType: PageType): void {
    this.settings = settings;
    this.currentPage = pageType;
    if (!settings.masterEnabled) {
      this.disconnect();
      this.clearFilters();
      ContentFilter.restoreSearchShelves();
    } else {
      if (!this.observer) {
        this.init(settings, pageType);
      } else {
        this.scan();
      }
    }
  }

  /**
   * Immediate scan of all currently rendered video cards
   */
  static scan(): void {
    if (!this.settings || !this.settings.masterEnabled || this.isScanning) return;
    this.isScanning = true;

    try {
      const activePreset =
        this.settings.presets.find((p) => p.id === this.settings!.activePresetId) ||
        this.settings.presets[0];

      if (!activePreset) return;

      const filterSettings = activePreset.filters;

      // Handle search shelves if on /results
      if (this.currentPage === 'results') {
        if (filterSettings.cleanSearchResults) {
          ContentFilter.filterSearchShelves();
        } else {
          ContentFilter.restoreSearchShelves();
        }
      } else {
        ContentFilter.restoreSearchShelves();
      }

      // Query existing cards
      const elements = document.querySelectorAll<HTMLElement>(VIDEO_CONTAINER_SELECTORS);
      for (let i = 0; i < elements.length; i++) {
        ContentFilter.filterElement(elements[i], filterSettings);
      }
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Schedule debounced batch processing via requestAnimationFrame
   */
  private static scheduleBatchProcess(): void {
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.settings || !this.settings.masterEnabled) {
        this.pendingElements.clear();
        return;
      }

      const activePreset =
        this.settings.presets.find((p) => p.id === this.settings!.activePresetId) ||
        this.settings.presets[0];

      if (!activePreset) {
        this.pendingElements.clear();
        return;
      }

      const filterSettings = activePreset.filters;

      if (this.currentPage === 'results') {
        if (filterSettings.cleanSearchResults) {
          ContentFilter.filterSearchShelves();
        } else {
          ContentFilter.restoreSearchShelves();
        }
      } else {
        ContentFilter.restoreSearchShelves();
      }

      for (const el of this.pendingElements) {
        if (document.contains(el)) {
          ContentFilter.filterElement(el, filterSettings);
        }
      }
      this.pendingElements.clear();
    });
  }

  /**
   * Remove filter attributes and restores display styles
   */
  static clearFilters(): void {
    const filtered = document.querySelectorAll<HTMLElement>('[data-yt-unchained-filtered]');
    for (let i = 0; i < filtered.length; i++) {
      const el = filtered[i];
      el.style.removeProperty('display');
      el.style.removeProperty('filter');
      el.style.removeProperty('opacity');
      el.removeAttribute('data-yt-unchained-filtered');
    }
  }

  /**
   * Disconnects observer and cancels animation frames
   */
  static disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingElements.clear();
  }
}
