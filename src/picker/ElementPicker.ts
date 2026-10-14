import { CustomRule, PageType } from '../types';
import { SelectorGenerator } from './SelectorGenerator';
import { PageDetector } from '../engine/PageDetector';

export class ElementPicker {
  private static hostElement: HTMLElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;
  private static active: boolean = false;
  private static hoveredElement: HTMLElement | null = null;
  private static isModalOpen: boolean = false;

  private static onSaveCallback?: (rule: CustomRule) => void;
  private static onCancelCallback?: () => void;

  /**
   * Start element selection mode
   */
  static start(
    onSave: (rule: CustomRule) => void,
    onCancel: () => void
  ): void {
    if (this.active) return;
    this.active = true;
    this.onSaveCallback = onSave;
    this.onCancelCallback = onCancel;
    this.isModalOpen = false;

    this.createOverlay();
    this.bindEvents();
  }

  /**
   * Stop selection mode and clean up DOM and listeners
   */
  static stop(): void {
    this.unbindEvents();
    if (this.hostElement && this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
    }
    this.hostElement = null;
    this.shadowRoot = null;
    this.hoveredElement = null;
    this.active = false;
    this.isModalOpen = false;
  }

  private static createOverlay(): void {
    this.hostElement = document.createElement('div');
    this.hostElement.id = 'yt-unchained-picker-root';
    this.hostElement.style.cssText =
      'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .picker-hud {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #f8fafc;
          padding: 8px 18px;
          border-radius: 9999px;
          border: 1px solid #334155;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
          z-index: 10000;
        }

        .hud-badge {
          background: #ff0000;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .hud-btn {
          background: #334155;
          color: #f8fafc;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.15s;
        }
        .hud-btn:hover {
          background: #475569;
        }

        .highlight-box {
          position: fixed;
          border: 2px solid #ff0000;
          background: rgba(255, 0, 0, 0.18);
          border-radius: 4px;
          pointer-events: none;
          display: none;
          z-index: 9999;
          transition: all 0.05s ease-out;
        }

        .tooltip {
          position: absolute;
          bottom: 100%;
          left: 0;
          transform: translateY(-6px);
          background: #0f172a;
          color: #ff4d4d;
          font-family: monospace;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255, 0, 0, 0.4);
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: none;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          z-index: 10001;
        }

        .modal {
          background: #1e293b;
          color: #f8fafc;
          border: 1px solid #334155;
          border-radius: 12px;
          width: 440px;
          max-width: 90vw;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }

        .modal-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 14px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 6px;
        }

        .form-input, .form-select {
          width: 100%;
          box-sizing: border-box;
          background: #0f172a;
          border: 1px solid #475569;
          border-radius: 6px;
          color: #f8fafc;
          padding: 8px 12px;
          font-size: 13px;
        }

        .form-input:focus, .form-select:focus {
          border-color: #ff0000;
          outline: none;
        }

        .selector-display {
          background: #0f172a;
          border: 1px solid #334155;
          padding: 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          color: #ff4d4d;
          word-break: break-all;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid #475569;
          color: #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-cancel:hover {
          background: #334155;
        }

        .btn-save {
          background: #ff0000;
          border: none;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .btn-save:hover {
          background: #cc0000;
        }
      </style>

      <div class="picker-hud" id="hud">
        <span class="hud-badge">Picker Active</span>
        <span>Click any element to customize it. Press <b>Esc</b> to exit.</span>
        <button class="hud-btn" id="hud-cancel">Cancel</button>
      </div>

      <div class="highlight-box" id="highlight">
        <div class="tooltip" id="tooltip">element</div>
      </div>

      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal">
          <h3 class="modal-title">Customize YouTube Element</h3>
          
          <div class="form-group">
            <label class="form-label">Calculated Selector</label>
            <div class="selector-display" id="modal-selector">...</div>
          </div>

          <div class="form-group">
            <label class="form-label">Rule Name</label>
            <input type="text" class="form-input" id="rule-name" value="Custom Hidden Element" />
          </div>

          <div class="form-group">
            <label class="form-label">Action</label>
            <select class="form-select" id="rule-action">
              <option value="hide">Hide completely (display: none)</option>
              <option value="collapse">Collapse space (height: 0, hidden)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Scope Page</label>
            <select class="form-select" id="rule-page">
              <option value="all">All YouTube Pages</option>
              <option value="current" id="option-curr-page">Current Page Only</option>
            </select>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" id="btn-modal-cancel">Cancel</button>
            <button class="btn-save" id="btn-modal-save">Save Rule</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.hostElement);

    const backdrop = this.shadowRoot.getElementById('modal-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeModal();
      }
    });

    const cancelBtn = this.shadowRoot.getElementById('hud-cancel');
    cancelBtn?.addEventListener('click', () => {
      this.cancel();
    });

    const modalCancel = this.shadowRoot.getElementById('btn-modal-cancel');
    modalCancel?.addEventListener('click', () => {
      this.closeModal();
    });

    const modalSave = this.shadowRoot.getElementById('btn-modal-save');
    modalSave?.addEventListener('click', () => {
      this.saveModalRule();
    });
  }

  private static bindEvents(): void {
    window.addEventListener('mousemove', this.handleMouseMove, true);
    window.addEventListener('click', this.handleClick, true);
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  private static unbindEvents(): void {
    window.removeEventListener('mousemove', this.handleMouseMove, true);
    window.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private static handleMouseMove = (e: MouseEvent): void => {
    if (this.isModalOpen) return;

    const target = e.target as HTMLElement;
    if (!target || target === this.hostElement || this.hostElement?.contains(target)) {
      return;
    }

    this.hoveredElement = target;
    this.updateHighlight(target);
  };

  private static updateHighlight(el: HTMLElement): void {
    if (!this.shadowRoot) return;
    const highlight = this.shadowRoot.getElementById('highlight');
    const tooltip = this.shadowRoot.getElementById('tooltip');
    if (!highlight || !tooltip) return;

    const rect = el.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;

    const generated = SelectorGenerator.generate(el);
    tooltip.textContent = `${generated.selector} (${Math.round(rect.width)}×${Math.round(rect.height)})`;
  }

  private static handleClick = (e: MouseEvent): void => {
    if (this.isModalOpen) return;

    const target = e.target as HTMLElement;
    if (target === this.hostElement || this.hostElement?.contains(target)) {
      return;
    }

    // Intercept click on YouTube to prevent following links or triggering video play
    e.preventDefault();
    e.stopPropagation();

    const picked = this.hoveredElement || target;
    if (picked) {
      this.openModal(picked);
    }
  };

  private static handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.isModalOpen) {
        this.closeModal();
      } else {
        this.cancel();
      }
    }
  };

  private static openModal(el: HTMLElement): void {
    this.isModalOpen = true;
    if (!this.shadowRoot) return;

    const backdrop = this.shadowRoot.getElementById('modal-backdrop');
    const selectorDisplay = this.shadowRoot.getElementById('modal-selector');
    const currOption = this.shadowRoot.getElementById('option-curr-page') as HTMLOptionElement;
    const ruleNameInput = this.shadowRoot.getElementById('rule-name') as HTMLInputElement;

    const generated = SelectorGenerator.generate(el);
    const currentPage = PageDetector.getCurrentPage();

    if (selectorDisplay) selectorDisplay.textContent = generated.selector;
    if (currOption) currOption.textContent = `Current Page Only (${currentPage})`;
    if (ruleNameInput) ruleNameInput.value = `Hide ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;

    if (backdrop) backdrop.style.display = 'flex';
  }

  private static closeModal(): void {
    this.isModalOpen = false;
    if (this.shadowRoot) {
      const backdrop = this.shadowRoot.getElementById('modal-backdrop');
      if (backdrop) backdrop.style.display = 'none';
    }
  }

  private static saveModalRule(): void {
    if (!this.shadowRoot || !this.hoveredElement) return;

    const selectorDisplay = this.shadowRoot.getElementById('modal-selector');
    const ruleNameInput = this.shadowRoot.getElementById('rule-name') as HTMLInputElement;
    const actionSelect = this.shadowRoot.getElementById('rule-action') as HTMLSelectElement;
    const pageSelect = this.shadowRoot.getElementById('rule-page') as HTMLSelectElement;

    const selector = selectorDisplay?.textContent || '';
    const name = ruleNameInput?.value.trim() || 'Custom Rule';
    const action = (actionSelect?.value as 'hide' | 'collapse') || 'hide';
    const pageScope = pageSelect?.value === 'current' ? [PageDetector.getCurrentPage()] : (['all'] as PageType[]);

    const rule: CustomRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      selector,
      targetPages: pageScope,
      action,
      enabled: true,
      createdAt: Date.now(),
      previewUrl: window.location.pathname,
    };

    this.stop();
    if (this.onSaveCallback) {
      this.onSaveCallback(rule);
    }
  }

  private static cancel(): void {
    this.stop();
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
  }
}
