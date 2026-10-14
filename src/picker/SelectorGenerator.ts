/**
 * SelectorGenerator produces stable, resilient CSS selectors for YouTube elements,
 * avoiding brittle deep nth-child chains and prioritizing semantic attributes.
 */

export interface GeneratedSelector {
  selector: string;
  isSpecific: boolean;
  matchCount: number;
}

function escapeCss(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

export class SelectorGenerator {
  /**
   * Generates a stable CSS selector for the given element
   */
  static generate(el: HTMLElement): GeneratedSelector {
    if (!el || !(el instanceof HTMLElement)) {
      return { selector: '', isSpecific: false, matchCount: 0 };
    }

    // 1. Direct stable ID check
    if (el.id && this.isStableId(el.id)) {
      const idSel = `#${escapeCss(el.id)}`;
      const matches = document.querySelectorAll(idSel).length;
      if (matches === 1) {
        return { selector: idSel, isSpecific: true, matchCount: 1 };
      }
    }

    // 2. Semantic attributes on the element itself
    const attrSel = this.getSemanticAttributeSelector(el);
    if (attrSel) {
      const matches = document.querySelectorAll(attrSel).length;
      if (matches === 1) {
        return { selector: attrSel, isSpecific: true, matchCount: 1 };
      }
    }

    // 3. YouTube Custom Elements (ytd-*, yt-*)
    const tag = el.tagName.toLowerCase();
    if (tag.startsWith('ytd-') || tag.startsWith('yt-')) {
      const contextual = this.buildContextualSelector(el);
      const matches = document.querySelectorAll(contextual).length;
      return { selector: contextual, isSpecific: matches === 1, matchCount: matches };
    }

    // 4. Hierarchical path generation traversing upwards
    const path = this.buildHierarchicalPath(el);
    const matches = document.querySelectorAll(path).length;
    return { selector: path, isSpecific: matches === 1, matchCount: matches };
  }

  /**
   * Checks if an ID appears stable and not randomly generated
   */
  private static isStableId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Disqualify purely numeric or hex hashes
    if (/^[0-9]+$/.test(id)) return false;
    if (/[a-f0-9]{8,}/i.test(id)) return false;
    // Disqualify temporary Polymer/Lit IDs
    if (id.startsWith('tp-yt-') && /-\d+$/.test(id)) return false;
    return true;
  }

  /**
   * Builds an attribute-based selector from stable semantic attributes
   */
  private static getSemanticAttributeSelector(el: HTMLElement): string | null {
    const tag = el.tagName.toLowerCase();

    // target-id (used extensively on engagement panels)
    const targetId = el.getAttribute('target-id');
    if (targetId) {
      return `${tag}[target-id="${escapeCss(targetId)}"]`;
    }

    // aria-label (stable navigation and button labels)
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.length > 2 && ariaLabel.length < 50) {
      return `${tag}[aria-label="${escapeCss(ariaLabel)}"]`;
    }

    // title attribute
    const title = el.getAttribute('title');
    if (title && title.length > 2 && title.length < 50) {
      return `${tag}[title="${escapeCss(title)}"]`;
    }

    // role attribute combined with tag
    const role = el.getAttribute('role');
    if (role && role !== 'presentation') {
      const testSel = `${tag}[role="${escapeCss(role)}"]`;
      if (document.querySelectorAll(testSel).length === 1) {
        return testSel;
      }
    }

    return null;
  }

  /**
   * Builds contextual selector using nearest identifiable ancestor
   */
  private static buildContextualSelector(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    let current: HTMLElement | null = el.parentElement;
    const parts: string[] = [tag];

    while (current && current !== document.body && current !== document.documentElement) {
      const parentTag = current.tagName.toLowerCase();
      if (current.id && this.isStableId(current.id)) {
        parts.unshift(`#${escapeCss(current.id)}`);
        break;
      } else if (parentTag.startsWith('ytd-') || parentTag.startsWith('yt-')) {
        parts.unshift(parentTag);
        if (parts.length >= 3) break;
      }
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  /**
   * Builds resilient hierarchical path avoiding fragile deep :nth-child
   */
  private static buildHierarchicalPath(el: HTMLElement): string {
    const segments: string[] = [];
    let current: HTMLElement | null = el;
    let depth = 0;

    while (current && current !== document.body && depth < 4) {
      const tag = current.tagName.toLowerCase();

      if (current.id && this.isStableId(current.id)) {
        segments.unshift(`#${escapeCss(current.id)}`);
        break;
      }

      // Check class names (filtering out dynamic utility classes)
      const meaningfulClasses = Array.from(current.classList).filter((c) => {
        return !c.startsWith('style-scope') && !c.startsWith('yt-spec-') && !/\d{4,}/.test(c);
      });

      if (meaningfulClasses.length > 0) {
        segments.unshift(`${tag}.${escapeCss(meaningfulClasses[0])}`);
      } else {
        segments.unshift(tag);
      }

      current = current.parentElement;
      depth++;
    }

    return segments.join(' > ');
  }
}
