import { UserSettings, PageType } from '../types';
import { RuleEngine } from './RuleEngine';

const STYLE_ELEMENT_ID = 'yt-unchained-styles';

export class StyleManager {
  private static styleElement: HTMLStyleElement | null = null;

  /**
   * Applies the compiled stylesheet to the document.
   * Can be called at document_start (before head or body exists).
   */
  static apply(settings: UserSettings, currentPage: PageType = 'all'): void {
    if (typeof document === 'undefined') return;

    if (!settings.masterEnabled) {
      this.remove();
      document.documentElement?.removeAttribute('yt-unchained-active');
      return;
    }

    document.documentElement?.setAttribute('yt-unchained-active', 'true');

    const css = RuleEngine.compileCss(settings, currentPage);
    let style = this.getOrCreateStyleElement();
    style.textContent = css;
  }

  /**
   * Retrieves or creates the style element, attaching to head or documentElement.
   */
  private static getOrCreateStyleElement(): HTMLStyleElement {
    if (!this.styleElement || !document.contains(this.styleElement)) {
      let existing = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
      if (!existing) {
        existing = document.createElement('style');
        existing.id = STYLE_ELEMENT_ID;
        existing.setAttribute('data-extension', 'youtube-unchained');
        
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(existing);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            (document.head || document.documentElement)?.appendChild(existing!);
          });
        }
      }
      this.styleElement = existing;
    }
    return this.styleElement;
  }

  /**
   * Removes injected stylesheet and active attribute from document
   */
  static remove(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }
    const el = document.getElementById(STYLE_ELEMENT_ID);
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    document.documentElement?.removeAttribute('yt-unchained-active');
  }
}
