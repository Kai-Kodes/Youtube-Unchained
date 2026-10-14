import { UserSettings, PresetProfile } from '../types';
import { clampPlaybackSpeed } from '../shared/defaults';
import { StorageManager } from '../shared/storage';

/**
 * Format playback speed consistently (e.g. 1.0×, 1.25×, 2.0×, 16.0×)
 */
export function formatSpeed(speed: number): string {
  const clamped = clampPlaybackSpeed(speed);
  if (Math.abs(clamped - Math.round(clamped)) < 0.001) {
    return `${clamped.toFixed(1)}×`;
  }
  const rounded2 = Math.round(clamped * 100) / 100;
  const rounded1 = Math.round(clamped * 10) / 10;
  if (Math.abs(rounded2 - rounded1) > 0.001) {
    return `${rounded2.toFixed(2)}×`;
  }
  return `${rounded1.toFixed(1)}×`;
}

export class InPlayerSpeedController {
  private static speedBtn: HTMLButtonElement | null = null;
  private static popover: HTMLDivElement | null = null;
  private static isPopoverOpen = false;
  private static observer: MutationObserver | null = null;
  private static activePreset: PresetProfile | null = null;
  private static masterEnabled = true;
  private static currentSpeed = 1.0;
  private static styleEl: HTMLStyleElement | null = null;
  private static outsideClickListener: ((e: PointerEvent) => void) | null = null;
  private static outsideKeydownListener: ((e: KeyboardEvent) => void) | null = null;
  private static pollTimer: any = null;
  private static rafId: number | null = null;

  private static readonly PRESET_CHIPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 8.0, 16.0];

  /**
   * Initialize in-player speed controller
   */
  static init(settings: UserSettings): void {
    this.updateSettings(settings);
    this.injectStyles();
    this.setupObserver();
    this.ensureInjected();
  }

  /**
   * Update active settings configuration
   */
  static updateSettings(settings: UserSettings): void {
    this.masterEnabled = settings.masterEnabled;
    const preset =
      settings.presets.find((p) => p.id === settings.activePresetId) || settings.presets[0];
    this.activePreset = preset || null;

    if (!this.masterEnabled) {
      this.closePopover();
      this.removeButton();
      return;
    }

    if (this.activePreset?.layout?.defaultPlaybackSpeed) {
      this.currentSpeed = clampPlaybackSpeed(this.activePreset.layout.defaultPlaybackSpeed);
      this.updateButtonLabel();
      this.updatePopoverUi();
    }

    this.ensureInjected();
  }

  /**
   * Handle SPA page navigation
   */
  static onPageNavigate(): void {
    this.closePopover();
    this.ensureInjected();
  }

  /**
   * Synchronize UI with current video playbackRate
   */
  static syncSpeed(speed: number): void {
    const clamped = clampPlaybackSpeed(speed);
    if (Math.abs(this.currentSpeed - clamped) > 0.001) {
      this.currentSpeed = clamped;
      this.updateButtonLabel();
      this.updatePopoverUi();
    }
  }

  /**
   * Set playback speed in real-time and optionally persist to extension storage
   */
  static setSpeed(speed: number, persist = true): void {
    const clamped = clampPlaybackSpeed(speed);
    this.currentSpeed = clamped;

    const video =
      (document.querySelector('video.html5-main-video') as HTMLVideoElement | null) ||
      (document.querySelector('video') as HTMLVideoElement | null);

    if (video) {
      try {
        if (Math.abs(video.playbackRate - clamped) > 0.001) {
          video.playbackRate = clamped;
        }
      } catch {
        // Fallback: clamp to actual applied
        this.currentSpeed = clampPlaybackSpeed(video.playbackRate);
      }
    }

    this.updateButtonLabel();
    this.updatePopoverUi();

    if (persist && typeof window !== 'undefined') {
      this.persistSpeed(clamped);
    }
  }

  /**
   * Persist user-selected speed to active preset profile
   */
  private static async persistSpeed(speed: number): Promise<void> {
    try {
      const settings = await StorageManager.load();
      if (!settings) return;
      const active =
        settings.presets.find((p) => p.id === settings.activePresetId) || settings.presets[0];
      if (active) {
        active.layout.defaultPlaybackSpeed = speed;
        await StorageManager.save(settings);
      }
    } catch {
      // Storage write error ignored in sandbox
    }
  }

  /**
   * Injects CSS styles for speed button and popover into document head
   */
  private static injectStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('yt-unchained-in-player-speed-styles')) return;

    const style = document.createElement('style');
    style.id = 'yt-unchained-in-player-speed-styles';
    style.textContent = `
      /* Dedicated in-player speed button inside .ytp-right-controls */
      .ytp-button.ytp-unchained-speed-btn {
        width: auto !important;
        min-width: 44px !important;
        height: 100% !important;
        padding: 0 6px !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #f5f5f7 !important;
        text-align: center !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: top !important;
        opacity: 0.9 !important;
        transition: opacity 0.14s ease, color 0.14s ease, transform 0.1s ease !important;
        cursor: pointer !important;
        border: none !important;
        background: transparent !important;
        user-select: none !important;
        box-sizing: border-box !important;
      }
      .ytp-button.ytp-unchained-speed-btn:hover {
        opacity: 1 !important;
        color: #ff0000 !important;
      }
      .ytp-button.ytp-unchained-speed-btn.active {
        color: #ff0000 !important;
        opacity: 1 !important;
      }
      .ytp-unchained-speed-label {
        pointer-events: none !important;
        line-height: 1 !important;
        letter-spacing: -0.01em !important;
        white-space: nowrap !important;
      }

      /* Speed Slider Popover */
      .yt-unchained-speed-popover {
        position: absolute !important;
        z-index: 99999 !important;
        width: 290px !important;
        background: rgba(18, 20, 26, 0.94) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 12px !important;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.35) !important;
        color: #f5f5f7 !important;
        padding: 14px 16px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif !important;
        font-size: 13px !important;
        line-height: 1.4 !important;
        user-select: none !important;
        box-sizing: border-box !important;
        pointer-events: auto !important;
        animation: ytUnchainedPopoverIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      @keyframes ytUnchainedPopoverIn {
        from {
          opacity: 0;
          transform: translateY(6px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .yt-unchained-popover-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        padding-bottom: 8px !important;
      }
      .yt-unchained-popover-title {
        font-size: 13px !important;
        font-weight: 600 !important;
        letter-spacing: -0.01em !important;
        color: #f5f5f7 !important;
      }
      .yt-unchained-badge-group {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      .yt-unchained-speed-badge {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ff4d4d !important;
        background: rgba(255, 0, 0, 0.14) !important;
        border: 1px solid rgba(255, 0, 0, 0.32) !important;
        padding: 1px 7px !important;
        border-radius: 4px !important;
        line-height: 1.3 !important;
      }
      .yt-unchained-reset-btn {
        font-size: 11px !important;
        font-weight: 500 !important;
        color: rgba(235, 235, 245, 0.6) !important;
        background: rgba(255, 255, 255, 0.06) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        padding: 2px 7px !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        transition: background 0.12s ease, color 0.12s ease !important;
      }
      .yt-unchained-reset-btn:hover {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #f5f5f7 !important;
      }

      .yt-unchained-slider-row {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }
      .yt-unchained-step-btn {
        width: 24px !important;
        height: 24px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #f5f5f7 !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        line-height: 1 !important;
        padding: 0 !important;
        transition: background 0.12s ease, transform 0.08s ease !important;
      }
      .yt-unchained-step-btn:hover {
        background: rgba(255, 255, 255, 0.16) !important;
      }
      .yt-unchained-step-btn:active {
        transform: scale(0.92) !important;
      }
      .yt-unchained-range-slider {
        flex: 1 !important;
        height: 4px !important;
        background: rgba(255, 255, 255, 0.18) !important;
        border-radius: 9999px !important;
        outline: none !important;
        -webkit-appearance: none !important;
        cursor: pointer !important;
        accent-color: #ff0000 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .yt-unchained-range-slider:focus-visible {
        outline: 2px solid #ff0000 !important;
        outline-offset: 3px !important;
      }
      .yt-unchained-range-slider::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 50% !important;
        background: #ffffff !important;
        border: 2px solid #ff0000 !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
        cursor: pointer !important;
        transition: transform 0.14s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.14s ease !important;
      }
      .yt-unchained-range-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15) !important;
        box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
      }

      .yt-unchained-chips-grid {
        display: grid !important;
        grid-template-columns: repeat(5, 1fr) !important;
        gap: 4px !important;
      }
      .yt-unchained-chip {
        background: rgba(255, 255, 255, 0.06) !important;
        color: rgba(235, 235, 245, 0.8) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 5px !important;
        padding: 4px 2px !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        text-align: center !important;
        line-height: 1.2 !important;
        transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease, transform 0.08s ease !important;
      }
      .yt-unchained-chip:hover {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #f5f5f7 !important;
        border-color: rgba(255, 255, 255, 0.16) !important;
      }
      .yt-unchained-chip.active {
        background: #ff0000 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        border-color: #ff0000 !important;
        box-shadow: 0 1px 3px rgba(255, 0, 0, 0.35) !important;
      }
      .yt-unchained-chip:active {
        transform: scale(0.95) !important;
      }

      .yt-unchained-range-hint {
        font-size: 10px !important;
        color: rgba(235, 235, 245, 0.4) !important;
        text-align: center !important;
        margin-top: -2px !important;
        letter-spacing: 0.02em !important;
      }
    `;
    document.head.appendChild(style);
    this.styleEl = style;
  }

  /**
   * Schedules ensureInjected via requestAnimationFrame to avoid observer thrashing
   */
  private static scheduleEnsureInjected(): void {
    if (this.rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      this.ensureInjected();
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.ensureInjected();
    });
  }

  /**
   * Sets up MutationObserver to re-inject button when YouTube rerenders player controls
   */
  private static setupObserver(): void {
    if (this.observer || typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver(() => {
      this.scheduleEnsureInjected();
    });

    const target = document.querySelector('ytd-app') || document.body;
    if (target) {
      this.observer.observe(target, { childList: true, subtree: true });
    }

    // Periodic safety check
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        this.scheduleEnsureInjected();
      }, 2000);
    }
  }

  /**
   * Ensures the speed button is present in active player controls
   */
  static ensureInjected(): void {
    if (!this.masterEnabled || typeof document === 'undefined') return;

    const playerEl = document.querySelector('#movie_player, .html5-video-player') as HTMLElement | null;
    if (!playerEl) return;

    const rightControls = playerEl.querySelector('.ytp-right-controls') as HTMLElement | null;
    if (!rightControls) return;

    // Clean up any stale orphaned buttons outside rightControls if multiple buttons detected
    const allBtns = document.querySelectorAll('.ytp-unchained-speed-btn');
    if (allBtns.length > 1) {
      for (let i = 0; i < allBtns.length; i++) {
        if (!rightControls.contains(allBtns[i])) {
          allBtns[i].remove();
        }
      }
    }

    // Fast-path: If button already exists and is connected inside rightControls, nothing to do
    if (this.speedBtn && this.speedBtn.isConnected && rightControls.contains(this.speedBtn)) {
      return;
    }

    // If button already exists in DOM inside rightControls, adopt it
    const existing = rightControls.querySelector('.ytp-unchained-speed-btn') as HTMLButtonElement | null;
    if (existing) {
      this.speedBtn = existing;
      this.updateButtonLabel();
      return;
    }

    // Create and inject button
    const btn = document.createElement('button');
    btn.className = 'ytp-button ytp-unchained-speed-btn';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Playback speed (YouTube Unchained)');
    btn.setAttribute('title', 'Playback speed (YouTube Unchained)');

    const span = document.createElement('span');
    span.className = 'ytp-unchained-speed-label';
    span.textContent = formatSpeed(this.currentSpeed);
    btn.appendChild(span);

    // Click handler to toggle popover
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePopover();
    });

    // Prevent player click events on button
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('mousedown', (e) => e.stopPropagation());

    // Insert before native settings button if available, or prepend
    const settingsBtn = rightControls.querySelector('.ytp-settings-button');
    if (settingsBtn) {
      rightControls.insertBefore(btn, settingsBtn);
    } else {
      rightControls.prepend(btn);
    }

    this.speedBtn = btn;
  }

  /**
   * Updates text in player speed button
   */
  private static updateButtonLabel(): void {
    if (!this.speedBtn) return;
    const label = this.speedBtn.querySelector('.ytp-unchained-speed-label');
    if (label) {
      label.textContent = formatSpeed(this.currentSpeed);
    }
  }

  /**
   * Toggle speed slider popover
   */
  static togglePopover(): void {
    if (this.isPopoverOpen) {
      this.closePopover();
    } else {
      this.openPopover();
    }
  }

  /**
   * Open speed slider popover
   */
  static openPopover(): void {
    if (this.isPopoverOpen || typeof document === 'undefined') return;

    const playerEl =
      (document.querySelector('#movie_player, .html5-video-player') as HTMLElement | null) ||
      document.body;

    // Create popover element
    const popover = document.createElement('div');
    popover.id = 'yt-unchained-speed-popover';
    popover.className = 'yt-unchained-speed-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Playback speed slider');

    // Prevent player shortcuts and playback toggle
    const isolateEvents = (e: Event) => e.stopPropagation();
    popover.addEventListener('click', isolateEvents);
    popover.addEventListener('pointerdown', isolateEvents);
    popover.addEventListener('mousedown', isolateEvents);
    popover.addEventListener('mouseup', isolateEvents);
    popover.addEventListener('dblclick', isolateEvents);
    popover.addEventListener('contextmenu', isolateEvents);
    popover.addEventListener('keyup', isolateEvents);
    popover.addEventListener('keypress', isolateEvents);

    popover.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePopover();
        this.speedBtn?.focus();
      }
    });

    // 1. Header
    const header = document.createElement('div');
    header.className = 'yt-unchained-popover-header';

    const title = document.createElement('span');
    title.className = 'yt-unchained-popover-title';
    title.textContent = 'Playback speed';

    const badgeGroup = document.createElement('div');
    badgeGroup.className = 'yt-unchained-badge-group';

    const badge = document.createElement('span');
    badge.className = 'yt-unchained-speed-badge';
    badge.textContent = formatSpeed(this.currentSpeed);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'yt-unchained-reset-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.title = 'Reset speed to 1.0×';
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setSpeed(1.0, true);
    });

    badgeGroup.appendChild(badge);
    badgeGroup.appendChild(resetBtn);
    header.appendChild(title);
    header.appendChild(badgeGroup);
    popover.appendChild(header);

    // 2. Slider Row
    const sliderRow = document.createElement('div');
    sliderRow.className = 'yt-unchained-slider-row';

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'yt-unchained-step-btn';
    decBtn.textContent = '−';
    decBtn.title = 'Decrease speed 0.1×';
    decBtn.setAttribute('aria-label', 'Decrease speed');
    decBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = Math.max(0.1, Math.round((this.currentSpeed - 0.1) * 10) / 10);
      this.setSpeed(next, true);
    });

    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.className = 'yt-unchained-range-slider';
    rangeInput.min = '0.1';
    rangeInput.max = '16.0';
    rangeInput.step = '0.1';
    rangeInput.value = this.currentSpeed.toString();
    rangeInput.setAttribute('aria-label', 'Playback speed slider');

    rangeInput.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setSpeed(val, true);
    });

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'yt-unchained-step-btn';
    incBtn.textContent = '+';
    incBtn.title = 'Increase speed 0.1×';
    incBtn.setAttribute('aria-label', 'Increase speed');
    incBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = Math.min(16.0, Math.round((this.currentSpeed + 0.1) * 10) / 10);
      this.setSpeed(next, true);
    });

    sliderRow.appendChild(decBtn);
    sliderRow.appendChild(rangeInput);
    sliderRow.appendChild(incBtn);
    popover.appendChild(sliderRow);

    // 3. Quick Chips
    const chipsGrid = document.createElement('div');
    chipsGrid.className = 'yt-unchained-chips-grid';

    for (const val of this.PRESET_CHIPS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'yt-unchained-chip';
      chip.dataset.speed = val.toString();
      chip.textContent = `${val}×`;
      if (Math.abs(this.currentSpeed - val) < 0.01) {
        chip.classList.add('active');
      }

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setSpeed(val, true);
      });
      chipsGrid.appendChild(chip);
    }
    popover.appendChild(chipsGrid);

    // 4. Subtle Hint
    const hint = document.createElement('div');
    hint.className = 'yt-unchained-range-hint';
    hint.textContent = '0.1× • Standard • 16.0×';
    popover.appendChild(hint);

    // Position popover inside playerEl
    playerEl.appendChild(popover);
    this.popover = popover;
    this.isPopoverOpen = true;

    if (this.speedBtn) {
      this.speedBtn.classList.add('active');
      this.speedBtn.setAttribute('aria-expanded', 'true');
    }

    this.positionPopover(playerEl);

    // Outside click listener (pointerdown + mousedown for cross-environment compatibility)
    this.outsideClickListener = (e: Event) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (this.popover && !this.popover.contains(target) && !this.speedBtn?.contains(target)) {
        this.closePopover();
      }
    };
    document.addEventListener('pointerdown', this.outsideClickListener as any, true);
    document.addEventListener('mousedown', this.outsideClickListener as any, true);

    this.outsideKeydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isPopoverOpen) {
        e.preventDefault();
        e.stopPropagation();
        this.closePopover();
        this.speedBtn?.focus();
      }
    };
    document.addEventListener('keydown', this.outsideKeydownListener, true);

    // Focus range input for keyboard accessibility
    setTimeout(() => {
      rangeInput.focus();
    }, 50);
  }

  /**
   * Dynamically positions popover above speed button inside player
   */
  private static positionPopover(playerEl: HTMLElement): void {
    if (!this.popover || !this.speedBtn) return;

    const playerRect = playerEl.getBoundingClientRect();
    const btnRect = this.speedBtn.getBoundingClientRect();
    const popoverWidth = 290;

    let left = btnRect.left - playerRect.left + btnRect.width / 2 - popoverWidth / 2;
    left = Math.max(12, Math.min(playerRect.width - popoverWidth - 12, left));

    const bottom = Math.max(52, playerRect.bottom - btnRect.top + 8);

    this.popover.style.left = `${Math.round(left)}px`;
    this.popover.style.bottom = `${Math.round(bottom)}px`;
  }

  /**
   * Close speed slider popover
   */
  static closePopover(): void {
    if (!this.isPopoverOpen) return;

    if (this.popover) {
      this.popover.remove();
      this.popover = null;
    }

    if (this.outsideClickListener) {
      document.removeEventListener('pointerdown', this.outsideClickListener as any, true);
      document.removeEventListener('mousedown', this.outsideClickListener as any, true);
      this.outsideClickListener = null;
    }

    if (this.outsideKeydownListener) {
      document.removeEventListener('keydown', this.outsideKeydownListener, true);
      this.outsideKeydownListener = null;
    }

    if (this.speedBtn) {
      this.speedBtn.classList.remove('active');
      this.speedBtn.setAttribute('aria-expanded', 'false');
    }

    this.isPopoverOpen = false;
  }

  /**
   * Updates elements inside popover when speed changes
   */
  private static updatePopoverUi(): void {
    if (!this.popover) return;

    const badge = this.popover.querySelector('.yt-unchained-speed-badge');
    if (badge) {
      badge.textContent = formatSpeed(this.currentSpeed);
    }

    const slider = this.popover.querySelector('.yt-unchained-range-slider') as HTMLInputElement | null;
    if (slider && Math.abs(parseFloat(slider.value) - this.currentSpeed) > 0.05) {
      slider.value = this.currentSpeed.toString();
    }

    const chips = this.popover.querySelectorAll('.yt-unchained-chip');
    chips.forEach((c) => {
      const spd = parseFloat((c as HTMLElement).dataset.speed || '0');
      if (Math.abs(spd - this.currentSpeed) < 0.01) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  /**
   * Removes speed button from DOM
   */
  private static removeButton(): void {
    if (this.speedBtn) {
      this.speedBtn.remove();
      this.speedBtn = null;
    }
  }

  /**
   * Clean up observers, popovers, and DOM elements
   */
  static cleanup(): void {
    this.closePopover();
    this.removeButton();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }

  /**
   * Test inspection helper
   */
  static getButton(): HTMLButtonElement | null {
    return this.speedBtn;
  }

  /**
   * Test inspection helper
   */
  static getPopover(): HTMLDivElement | null {
    return this.popover;
  }

  /**
   * Test inspection helper
   */
  static isOpen(): boolean {
    return this.isPopoverOpen;
  }
}
