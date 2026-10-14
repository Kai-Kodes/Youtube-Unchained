import { describe, it, expect, beforeEach } from 'vitest';
import { ContentFilter } from '../src/filters/ContentFilter';
import { ContentFilterSettings } from '../src/types';
import { DEFAULT_CONTENT_FILTERS } from '../src/shared/defaults';

describe('ContentFilter', () => {
  it('parses duration strings correctly into seconds', () => {
    expect(ContentFilter.parseDurationSeconds('12:34')).toBe(12 * 60 + 34);
    expect(ContentFilter.parseDurationSeconds('1:02:30')).toBe(1 * 3600 + 2 * 60 + 30);
    expect(ContentFilter.parseDurationSeconds('0:45')).toBe(45);
    expect(ContentFilter.parseDurationSeconds('')).toBe(0);
    expect(ContentFilter.parseDurationSeconds('invalid')).toBe(0);
  });

  describe('evaluateVideo', () => {
    const baseSettings: ContentFilterSettings = {
      ...DEFAULT_CONTENT_FILTERS,
      enabled: true,
    };

    it('blocks videos from blocked channels (contains match)', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        channels: [
          { id: '1', channelName: 'Spam Network', matchType: 'contains', enabled: true },
        ],
      };

      const result = ContentFilter.evaluateVideo(
        { channel: 'The Official Spam Network Channel' },
        settings
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('channel');
    });

    it('blocks videos from blocked channels (exact match)', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        channels: [
          { id: '1', channelName: 'Spam Channel', matchType: 'exact', enabled: true },
        ],
      };

      // Substring should not block when matchType is exact
      const noBlock = ContentFilter.evaluateVideo(
        { channel: 'Spam Channel Extra' },
        settings
      );
      expect(noBlock.blocked).toBe(false);

      // Exact match should block
      const blocked = ContentFilter.evaluateVideo(
        { channel: 'Spam Channel' },
        settings
      );
      expect(blocked.blocked).toBe(true);
      expect(blocked.reason).toBe('channel');
    });

    it('blocks videos when rule is @handle but card has display name and href', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        channels: [
          { id: '1', channelName: '@mkbhd', matchType: 'exact', enabled: true },
        ],
      };

      const result = ContentFilter.evaluateVideo(
        {
          channel: 'Marques Brownlee',
          channelHandle: '@mkbhd',
          channelUrl: '/@mkbhd',
        },
        settings
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('channel');
    });

    it('blocks videos when user pasted full YouTube channel URL', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        channels: [
          {
            id: '1',
            channelName: 'https://www.youtube.com/@veritasium?si=test1234',
            matchType: 'exact',
            enabled: true,
          },
        ],
      };

      const result = ContentFilter.evaluateVideo(
        {
          channel: 'Veritasium',
          channelHandle: '@veritasium',
          channelUrl: '/@veritasium',
        },
        settings
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('channel');
    });

    it('blocks videos by channel ID (UC...)', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        channels: [
          {
            id: '1',
            channelName: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
            matchType: 'exact',
            enabled: true,
          },
        ],
      };

      const result = ContentFilter.evaluateVideo(
        {
          channel: 'MrBeast',
          channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
          channelUrl: '/channel/UCX6OQ3DkcsbYNE6H8uQQuVA',
        },
        settings
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('channel');
    });

    it('extracts metadata from 2024-2026 YouTube Lit/Wiz view-model cards', () => {
      const card = document.createElement('yt-lockup-view-model');
      card.innerHTML = `
        <div class="yt-lockup-metadata-view-model__title">Next Gen JavaScript Frameworks</div>
        <div class="yt-lockup-metadata-view-model__byline">
          <a href="/@Fireship">Fireship</a>
        </div>
      `;
      const meta = ContentFilter.extractVideoCardMeta(card);
      expect(meta.title).toBe('Next Gen JavaScript Frameworks');
      expect(meta.channel).toBe('Fireship');
      expect(meta.channelHandle).toBe('@Fireship');
      expect(meta.channelUrl).toBe('/@Fireship');
    });

    it('blocks videos matching keyword text', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        keywords: [
          { id: '1', pattern: 'clickbait', isRegex: false, caseSensitive: false, enabled: true },
        ],
      };

      const result = ContentFilter.evaluateVideo(
        { title: 'You will not BELIEVE this CLICKBAIT video!' },
        settings
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('keyword');
    });

    it('blocks videos matching regex keywords', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        keywords: [
          { id: '1', pattern: 'episode\\s+[0-9]+', isRegex: true, caseSensitive: false, enabled: true },
        ],
      };

      const result = ContentFilter.evaluateVideo(
        { title: 'Super Show - Episode 42 Review' },
        settings
      );
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('keyword');
    });

    it('blocks videos based on duration thresholds', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        duration: {
          enabled: true,
          minDurationSeconds: 120, // 2 mins
          maxDurationSeconds: 3600, // 1 hour
        },
      };

      // Too short (< 2 min)
      const shortVideo = ContentFilter.evaluateVideo({ durationSeconds: 60 }, settings);
      expect(shortVideo.blocked).toBe(true);
      expect(shortVideo.reason).toBe('duration');

      // Too long (> 1 hr)
      const longVideo = ContentFilter.evaluateVideo({ durationSeconds: 5000 }, settings);
      expect(longVideo.blocked).toBe(true);
      expect(longVideo.reason).toBe('duration');

      // In range
      const validVideo = ContentFilter.evaluateVideo({ durationSeconds: 600 }, settings);
      expect(validVideo.blocked).toBe(false);
    });

    it('blocks watched videos when hideWatched is enabled', () => {
      const settings: ContentFilterSettings = {
        ...baseSettings,
        hideWatched: true,
      };

      const result = ContentFilter.evaluateVideo({ isWatched: true }, settings);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('watched');
    });
  });

  describe('filterElement', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('hides DOM element and marks attribute when filter matches', () => {
      const card = document.createElement('div');
      card.className = 'ytd-rich-item-renderer';

      const title = document.createElement('h3');
      title.id = 'video-title';
      title.textContent = 'Reaction Video - Shocking!';
      card.appendChild(title);

      const channel = document.createElement('div');
      channel.className = 'ytd-channel-name';
      channel.textContent = 'ReactorGuy';
      card.appendChild(channel);

      document.body.appendChild(card);

      const settings: ContentFilterSettings = {
        ...DEFAULT_CONTENT_FILTERS,
        enabled: true,
        keywords: [
          { id: '1', pattern: 'Reaction', isRegex: false, caseSensitive: false, enabled: true },
        ],
      };

      const blocked = ContentFilter.filterElement(card, settings);
      expect(blocked).toBe(true);
      expect(card.style.display).toBe('none');
      expect(card.getAttribute('data-yt-unchained-filtered')).toBe('keyword');
    });

    it('parses spoken accessibility duration strings correctly', () => {
      expect(ContentFilter.parseDurationSeconds('1 hour, 2 minutes, 30 seconds')).toBe(3750);
      expect(ContentFilter.parseDurationSeconds('15 minutes, 20 seconds')).toBe(920);
      expect(ContentFilter.parseDurationSeconds('45 seconds')).toBe(45);
      expect(ContentFilter.parseDurationSeconds('2 hours')).toBe(7200);
    });

    it('extracts video metadata with cleaned whitespace across channel and title', () => {
      const card = document.createElement('div');
      const title = document.createElement('a');
      title.id = 'video-title';
      title.textContent = '\n   Deep Learning   Tutorial   \n';
      card.appendChild(title);

      const channel = document.createElement('div');
      channel.className = 'ytd-channel-name';
      channel.innerHTML = '<a href="/@lex">  Lex   Fridman  </a>';
      card.appendChild(channel);

      const meta = ContentFilter.extractVideoCardMeta(card);
      expect(meta.title).toBe('Deep Learning Tutorial');
      expect(meta.channel).toBe('Lex Fridman');
    });

    it('dims watched videos with grayscale and opacity when watchedDisplayMode is dim', () => {
      const card = document.createElement('div');
      card.innerHTML = `
        <a id="video-title">Watched Video Title</a>
        <ytd-thumbnail-overlay-resume-playback-renderer>
          <div id="progress" style="width: 80%"></div>
        </ytd-thumbnail-overlay-resume-playback-renderer>
      `;

      const settings: ContentFilterSettings = {
        ...DEFAULT_CONTENT_FILTERS,
        enabled: true,
        hideWatched: true,
        watchedDisplayMode: 'dim',
      };

      const blocked = ContentFilter.filterElement(card, settings);
      expect(blocked).toBe(true);
      expect(card.style.display).toBe('');
      expect(card.style.filter).toContain('grayscale');
      expect(card.style.opacity).toBe('0.35');
      expect(card.getAttribute('data-yt-unchained-filtered')).toBe('watched-dim');

      // Now disable hideWatched and test unfilter / restoration
      const unfilterSettings: ContentFilterSettings = {
        ...settings,
        hideWatched: false,
      };
      const unblocked = ContentFilter.filterElement(card, unfilterSettings);
      expect(unblocked).toBe(false);
      expect(card.style.filter).toBe('');
      expect(card.style.opacity).toBe('');
      expect(card.hasAttribute('data-yt-unchained-filtered')).toBe(false);
    });

    it('filters and restores search shelves properly', () => {
      const searchContainer = document.createElement('div');
      searchContainer.innerHTML = `
        <ytd-search>
          <ytd-shelf-renderer id="shelf-1"></ytd-shelf-renderer>
          <ytd-reel-shelf-renderer id="shelf-2"></ytd-reel-shelf-renderer>
        </ytd-search>
      `;
      document.body.appendChild(searchContainer);

      const count = ContentFilter.filterSearchShelves(searchContainer);
      expect(count).toBe(2);

      const s1 = searchContainer.querySelector('#shelf-1') as HTMLElement;
      expect(s1.style.display).toBe('none');
      expect(s1.getAttribute('data-yt-unchained-filtered')).toBe('shelf');

      const restored = ContentFilter.restoreSearchShelves(searchContainer);
      expect(restored).toBe(2);
      expect(s1.style.display).toBe('');
      expect(s1.hasAttribute('data-yt-unchained-filtered')).toBe(false);
    });
  });
});
