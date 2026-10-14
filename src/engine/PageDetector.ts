import { PageType } from '../types';

export type PageChangeCallback = (newPage: PageType, pathname: string) => void;

export class PageDetector {
  private static currentPage: PageType = 'unknown';
  private static currentPathname: string = '';
  private static listeners: Set<PageChangeCallback> = new Set();
  private static initialized: boolean = false;
  private static observer: MutationObserver | null = null;

  /**
   * Identifies the current YouTube page type from window.location
   */
  static getPageType(pathname: string = window.location.pathname, _search: string = window.location.search): PageType {
    if (pathname === '/' || pathname === '') {
      return 'home';
    }
    if (pathname.startsWith('/watch')) {
      return 'watch';
    }
    if (pathname.startsWith('/results')) {
      return 'results';
    }
    if (pathname.startsWith('/feed/subscriptions')) {
      return 'subscriptions';
    }
    if (pathname.startsWith('/shorts/')) {
      return 'shorts';
    }
    if (pathname.startsWith('/playlist')) {
      return 'playlist';
    }
    if (
      pathname.startsWith('/@') ||
      pathname.startsWith('/channel/') ||
      pathname.startsWith('/c/') ||
      pathname.startsWith('/user/')
    ) {
      return 'channel';
    }
    return 'unknown';
  }

  /**
   * Initializes page detection and hooks into YouTube navigation events
   */
  static init(onChange?: PageChangeCallback): void {
    if (onChange) {
      this.listeners.add(onChange);
    }

    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.update();

    // Hook YouTube SPA navigation events
    window.addEventListener('yt-navigate-finish', () => {
      this.update();
    });

    window.addEventListener('yt-page-data-updated', () => {
      this.update();
    });

    window.addEventListener('popstate', () => {
      this.update();
    });

    // Fallback: watch body/title for SPA navigation if YouTube events fail
    let lastUrl = window.location.href;
    this.observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.update();
      }
    });

    if (document.body) {
      this.observer.observe(document.body, { childList: true, subtree: false });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body && this.observer) {
          this.observer.observe(document.body, { childList: true, subtree: false });
        }
      });
    }
  }

  /**
   * Checks for URL changes and notifies subscribers
   */
  static update(): void {
    const pathname = window.location.pathname;
    const pageType = this.getPageType(pathname, window.location.search);

    const changed = pageType !== this.currentPage || pathname !== this.currentPathname;
    this.currentPage = pageType;
    this.currentPathname = pathname;

    // Synchronize HTML attributes for zero-latency CSS matching
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('yt-unchained-page', pageType);
      document.documentElement.setAttribute('yt-unchained-pathname', pathname);
    }

    if (changed) {
      for (const cb of this.listeners) {
        try {
          cb(pageType, pathname);
        } catch (e) {
          console.error('[YouTube Unchained] Error in page change callback:', e);
        }
      }
    }
  }

  static getCurrentPage(): PageType {
    return this.currentPage || this.getPageType();
  }

  static getCurrentPathname(): string {
    return this.currentPathname || window.location.pathname;
  }

  static onPageChange(cb: PageChangeCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  static destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}
