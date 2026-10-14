import { describe, it, expect, beforeEach } from 'vitest';
import { SelectorGenerator } from '../src/picker/SelectorGenerator';

describe('SelectorGenerator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('selects unique element by stable ID', () => {
    const el = document.createElement('div');
    el.id = 'comments';
    document.body.appendChild(el);

    const result = SelectorGenerator.generate(el);
    expect(result.selector).toBe('#comments');
    expect(result.isSpecific).toBe(true);
    expect(result.matchCount).toBe(1);
  });

  it('ignores volatile numeric/hash IDs and uses semantic attributes', () => {
    const el = document.createElement('ytd-engagement-panel-section-list-renderer');
    el.id = '12345678';
    el.setAttribute('target-id', 'engagement-panel-comments-section');
    document.body.appendChild(el);

    const result = SelectorGenerator.generate(el);
    expect(result.selector).toBe(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]'
    );
    expect(result.isSpecific).toBe(true);
  });

  it('uses aria-label when available and unique', () => {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Previous video');
    document.body.appendChild(btn);

    const result = SelectorGenerator.generate(btn);
    expect(result.selector).toBe('button[aria-label="Previous video"]');
    expect(result.isSpecific).toBe(true);
  });

  it('constructs contextual selector for YouTube custom elements', () => {
    const parent = document.createElement('ytd-watch-flexy');
    const child = document.createElement('ytd-watch-next-secondary-results-renderer');
    parent.appendChild(child);
    document.body.appendChild(parent);

    const result = SelectorGenerator.generate(child);
    expect(result.selector).toContain('ytd-watch-next-secondary-results-renderer');
    expect(result.matchCount).toBe(1);
  });
});
