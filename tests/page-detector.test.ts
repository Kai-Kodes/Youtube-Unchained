import { describe, it, expect, afterEach } from 'vitest';
import { PageDetector } from '../src/engine/PageDetector';

describe('PageDetector', () => {
  afterEach(() => {
    PageDetector.destroy();
  });

  it('correctly classifies home page', () => {
    expect(PageDetector.getPageType('/')).toBe('home');
    expect(PageDetector.getPageType('')).toBe('home');
  });

  it('correctly classifies watch page', () => {
    expect(PageDetector.getPageType('/watch', '?v=dQw4w9WgXcQ')).toBe('watch');
  });

  it('correctly classifies results search page', () => {
    expect(PageDetector.getPageType('/results', '?search_query=test')).toBe('results');
  });

  it('correctly classifies subscriptions feed', () => {
    expect(PageDetector.getPageType('/feed/subscriptions')).toBe('subscriptions');
  });

  it('correctly classifies shorts page', () => {
    expect(PageDetector.getPageType('/shorts/abc123xyz')).toBe('shorts');
  });

  it('correctly classifies channel pages', () => {
    expect(PageDetector.getPageType('/@Veritasium')).toBe('channel');
    expect(PageDetector.getPageType('/channel/UC1234567890')).toBe('channel');
    expect(PageDetector.getPageType('/c/TED')).toBe('channel');
    expect(PageDetector.getPageType('/user/google')).toBe('channel');
  });

  it('correctly classifies playlist pages', () => {
    expect(PageDetector.getPageType('/playlist', '?list=PL12345')).toBe('playlist');
  });

  it('updates HTML documentElement attributes on navigation', () => {
    PageDetector.init();
    PageDetector.update();

    expect(document.documentElement.getAttribute('yt-unchained-page')).toBeDefined();
    expect(document.documentElement.getAttribute('yt-unchained-pathname')).toBeDefined();
  });
});
