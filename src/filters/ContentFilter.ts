import { ContentFilterSettings } from '../types';

export interface FilterResult {
  blocked: boolean;
  reason?: 'channel' | 'keyword' | 'duration' | 'watched' | 'shorts' | 'shelf';
  matchedValue?: string;
}

export class ContentFilter {
  /**
   * Parse YouTube time duration string like "12:34", "1:02:30", "0:45" into total seconds
   */
  static parseDurationSeconds(text: string): number {
    if (!text) return 0;
    const clean = text.trim().replace(/[\r\n\t]/g, '');

    // 1. Spoken / natural language format (e.g. "1 hour, 2 minutes, 30 seconds" or "15 minutes")
    if (/hour|minute|second/i.test(clean)) {
      let total = 0;
      const hoursMatch = clean.match(/(\d+)\s*hour/i);
      const minsMatch = clean.match(/(\d+)\s*minute/i);
      const secsMatch = clean.match(/(\d+)\s*second/i);
      if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 3600;
      if (minsMatch) total += parseInt(minsMatch[1], 10) * 60;
      if (secsMatch) total += parseInt(secsMatch[1], 10);
      return total;
    }

    // 2. Colon timestamp format (e.g. "12:34", "1:02:30", "0:45")
    const parts = clean.split(':').map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return 0;

    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  /**
   * Normalizes a channel string or URL into matching components
   */
  static normalizeChannelTarget(input: string): {
    clean: string;
    handle?: string;
    id?: string;
  } {
    if (!input) return { clean: '' };
    let clean = input.trim();
    // Strip protocol and domain
    clean = clean.replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, '');
    // Strip query parameters and hash
    clean = clean.replace(/[?#].*$/, '');
    // Strip leading/trailing slashes
    clean = clean.replace(/^\/+|\/+$/g, '');

    let handle: string | undefined;
    let id: string | undefined;

    if (clean.startsWith('@')) {
      handle = clean;
    } else if (clean.includes('/@')) {
      const m = clean.match(/@([^/?#]+)/);
      if (m) handle = '@' + m[1];
    } else if (clean.startsWith('channel/')) {
      id = clean.replace(/^channel\//, '');
    } else if (clean.startsWith('c/') || clean.startsWith('user/')) {
      clean = clean.replace(/^(c|user)\//, '');
    }

    return {
      clean: clean.toLowerCase(),
      handle: handle ? handle.toLowerCase() : undefined,
      id: id ? id.toLowerCase() : undefined,
    };
  }

  /**
   * Evaluates video metadata against active filter settings
   */
  static evaluateVideo(
    meta: {
      title?: string;
      channel?: string;
      channelHandle?: string;
      channelId?: string;
      channelUrl?: string;
      durationSeconds?: number;
      isWatched?: boolean;
      isShort?: boolean;
    },
    settings: ContentFilterSettings
  ): FilterResult {
    if (!settings.enabled) {
      return { blocked: false };
    }

    // 1. Shorts filter
    if (settings.hideShortsFromFeed && meta.isShort) {
      return { blocked: true, reason: 'shorts' };
    }

    // 2. Watched filter
    if (settings.hideWatched && meta.isWatched) {
      return { blocked: true, reason: 'watched' };
    }

    // 3. Channel filter (supports display name, @handle, channel ID UC..., and channel path)
    if (
      (meta.channel || meta.channelHandle || meta.channelId || meta.channelUrl) &&
      settings.channels.length > 0
    ) {
      const channelDisplayLower = meta.channel ? meta.channel.trim().toLowerCase() : '';
      const handleLowerWithAt = meta.channelHandle ? meta.channelHandle.trim().toLowerCase() : '';
      const handleLowerWithoutAt = handleLowerWithAt.replace(/^@/, '');
      const channelIdLower = meta.channelId ? meta.channelId.trim().toLowerCase() : '';
      const channelUrlLower = meta.channelUrl ? meta.channelUrl.trim().toLowerCase() : '';

      for (const rule of settings.channels) {
        if (!rule.enabled || !rule.channelName) continue;
        const normalizedRule = this.normalizeChannelTarget(rule.channelName);
        const targetClean = normalizedRule.clean;
        const targetWithoutAt = targetClean.replace(/^@/, '');

        if (rule.matchType === 'exact') {
          // Exact match against display name, handle (with or without @), channel ID, or channel URL
          const matches =
            (channelDisplayLower &&
              (channelDisplayLower === targetClean || channelDisplayLower === targetWithoutAt)) ||
            (handleLowerWithAt &&
              (handleLowerWithAt === targetClean || handleLowerWithoutAt === targetWithoutAt)) ||
            (channelIdLower &&
              (channelIdLower === targetClean ||
                (normalizedRule.id && channelIdLower === normalizedRule.id))) ||
            (channelUrlLower &&
              (channelUrlLower === targetClean || channelUrlLower.endsWith('/' + targetClean)));

          if (matches) {
            return { blocked: true, reason: 'channel', matchedValue: rule.channelName };
          }
        } else {
          // Contains / substring match against display name, handle, channel ID, or channel URL
          const matches =
            (channelDisplayLower && channelDisplayLower.includes(targetWithoutAt)) ||
            (handleLowerWithoutAt && handleLowerWithoutAt.includes(targetWithoutAt)) ||
            (channelIdLower &&
              (channelIdLower.includes(targetClean) ||
                (normalizedRule.id && channelIdLower.includes(normalizedRule.id)))) ||
            (channelUrlLower && channelUrlLower.includes(targetWithoutAt));

          if (matches) {
            return { blocked: true, reason: 'channel', matchedValue: rule.channelName };
          }
        }
      }
    }

    // 4. Keyword filter on title
    if (meta.title && settings.keywords.length > 0) {
      const title = meta.title.trim();
      const titleLower = title.toLowerCase();

      for (const rule of settings.keywords) {
        if (!rule.enabled || !rule.pattern) continue;

        if (rule.isRegex) {
          try {
            const flags = rule.caseSensitive ? '' : 'i';
            const re = new RegExp(rule.pattern, flags);
            if (re.test(title)) {
              return { blocked: true, reason: 'keyword', matchedValue: rule.pattern };
            }
          } catch {
            // Invalid regex, skip safely
          }
        } else {
          const pattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
          const target = rule.caseSensitive ? title : titleLower;
          if (target.includes(pattern)) {
            return { blocked: true, reason: 'keyword', matchedValue: rule.pattern };
          }
        }
      }
    }

    // 5. Duration filter
    if (settings.duration.enabled && meta.durationSeconds !== undefined && meta.durationSeconds > 0) {
      const { minDurationSeconds, maxDurationSeconds } = settings.duration;
      if (minDurationSeconds > 0 && meta.durationSeconds < minDurationSeconds) {
        return {
          blocked: true,
          reason: 'duration',
          matchedValue: `< ${minDurationSeconds}s`,
        };
      }
      if (maxDurationSeconds > 0 && meta.durationSeconds > maxDurationSeconds) {
        return {
          blocked: true,
          reason: 'duration',
          matchedValue: `> ${maxDurationSeconds}s`,
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Extracts metadata from a YouTube DOM video card
   */
  static extractVideoCardMeta(element: HTMLElement): {
    title?: string;
    channel?: string;
    channelHandle?: string;
    channelId?: string;
    channelUrl?: string;
    durationSeconds?: number;
    isWatched?: boolean;
    isShort?: boolean;
  } {
    // 1. Extract title
    const titleEl = element.querySelector(
      '#video-title, #video-title-link, .yt-lockup-metadata-view-model__title, .yt-lockup-metadata-view-model-wiz__title, h3 a'
    );
    const rawTitle = titleEl?.textContent?.trim() || titleEl?.getAttribute('title')?.trim();
    const title = rawTitle ? rawTitle.replace(/\s+/g, ' ') : undefined;

    // 2. Extract channel name, handle, channelId, and URL
    const channelAnchor = element.querySelector<HTMLAnchorElement>(
      'ytd-channel-name a, #channel-name a, .yt-lockup-metadata-view-model__byline a, .yt-lockup-metadata-view-model-wiz__byline a, a.yt-lockup-metadata-view-model__byline, a.yt-formatted-string[href*="/@"], a.yt-formatted-string[href*="/channel/"], a[href*="/@"], a[href*="/channel/"]'
    );
    const channelFallbackEl = element.querySelector(
      'ytd-channel-name, #channel-name, .ytd-channel-name, .yt-lockup-metadata-view-model__byline, .yt-lockup-metadata-view-model-wiz__byline'
    );

    const rawChannel = (
      channelAnchor?.textContent ||
      channelFallbackEl?.querySelector('a, #text')?.textContent ||
      channelFallbackEl?.textContent
    )?.trim();
    const channel = rawChannel ? rawChannel.replace(/\s+/g, ' ') : undefined;

    let channelHandle: string | undefined;
    let channelId: string | undefined;
    let channelUrl: string | undefined;

    const href =
      channelAnchor?.getAttribute('href') ||
      channelFallbackEl?.querySelector('a')?.getAttribute('href') ||
      '';

    if (href) {
      channelUrl = href.split('?')[0].replace(/\/+$/, '');
      if (channelUrl.includes('/@')) {
        const handleMatch = channelUrl.match(/@([^/?#]+)/);
        if (handleMatch) channelHandle = '@' + handleMatch[1];
      } else if (channelUrl.includes('/channel/')) {
        const idMatch = channelUrl.match(/\/channel\/([^/?#]+)/);
        if (idMatch) channelId = idMatch[1];
      }
    }

    // 3. Extract duration
    let durationSeconds: number | undefined;
    const durationEl = element.querySelector(
      'ytd-thumbnail-overlay-time-status-renderer, span.ytd-thumbnail-overlay-time-status-renderer, badge-shape[aria-label], yt-thumbnail-badge-view-model'
    );
    if (durationEl) {
      const text = durationEl.textContent?.trim() || durationEl.getAttribute('aria-label')?.trim();
      if (text) {
        durationSeconds = this.parseDurationSeconds(text);
      }
    }

    // 4. Extract watched status
    const resumeEl = element.querySelector(
      'ytd-thumbnail-overlay-resume-playback-renderer, #progress.ytd-thumbnail-overlay-resume-playback-renderer'
    );
    const isWatched = Boolean(resumeEl);

    // 5. Extract short status
    const linkEl = element.querySelector('a[href*="/shorts/"]');
    const isShort = Boolean(linkEl) || element.hasAttribute('is-shorts');

    return {
      title,
      channel,
      channelHandle,
      channelId,
      channelUrl,
      durationSeconds,
      isWatched,
      isShort,
    };
  }

  /**
   * Applies content filtering to a single video element
   */
  static filterElement(element: HTMLElement, settings: ContentFilterSettings): boolean {
    const meta = this.extractVideoCardMeta(element);
    const res = this.evaluateVideo(meta, settings);

    if (res.blocked) {
      if (res.reason === 'watched' && settings.watchedDisplayMode === 'dim') {
        element.style.setProperty('filter', 'grayscale(100%)', 'important');
        element.style.setProperty('opacity', '0.35', 'important');
        element.style.removeProperty('display');
        element.setAttribute('data-yt-unchained-filtered', 'watched-dim');
      } else {
        element.style.removeProperty('filter');
        element.style.removeProperty('opacity');
        element.style.setProperty('display', 'none', 'important');
        element.setAttribute('data-yt-unchained-filtered', res.reason || 'true');
      }
      return true;
    } else {
      if (element.hasAttribute('data-yt-unchained-filtered')) {
        element.style.removeProperty('display');
        element.style.removeProperty('filter');
        element.style.removeProperty('opacity');
        element.removeAttribute('data-yt-unchained-filtered');
      }
      return false;
    }
  }

  /**
   * Filter search recommendation shelves on /results
   */
  static filterSearchShelves(container: Document | HTMLElement = document): number {
    let count = 0;
    const shelves = container.querySelectorAll(
      'ytd-search ytd-shelf-renderer, ytd-search ytd-horizontal-card-list-renderer, ytd-search ytd-reel-shelf-renderer'
    );
    for (const shelf of Array.from(shelves)) {
      (shelf as HTMLElement).style.setProperty('display', 'none', 'important');
      shelf.setAttribute('data-yt-unchained-filtered', 'shelf');
      count++;
    }
    return count;
  }

  /**
   * Restore search recommendation shelves previously hidden by cleanSearchResults
   */
  static restoreSearchShelves(container: Document | HTMLElement = document): number {
    let count = 0;
    const shelves = container.querySelectorAll<HTMLElement>('[data-yt-unchained-filtered="shelf"]');
    for (const shelf of Array.from(shelves)) {
      shelf.style.removeProperty('display');
      shelf.removeAttribute('data-yt-unchained-filtered');
      count++;
    }
    return count;
  }
}
