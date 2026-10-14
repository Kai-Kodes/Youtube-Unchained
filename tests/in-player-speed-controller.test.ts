import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InPlayerSpeedController, formatSpeed } from '../src/engine/InPlayerSpeedController';
import { DEFAULT_USER_SETTINGS } from '../src/shared/defaults';

describe('InPlayerSpeedController', () => {
  let playerContainer: HTMLElement;
  let rightControls: HTMLElement;
  let videoEl: HTMLVideoElement;

  beforeEach(() => {
    document.body.innerHTML = '';

    playerContainer = document.createElement('div');
    playerContainer.id = 'movie_player';
    playerContainer.className = 'html5-video-player';

    rightControls = document.createElement('div');
    rightControls.className = 'ytp-right-controls';

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'ytp-button ytp-settings-button';
    rightControls.appendChild(settingsBtn);

    videoEl = document.createElement('video');
    videoEl.className = 'html5-main-video';
    videoEl.playbackRate = 1.0;

    playerContainer.appendChild(videoEl);
    playerContainer.appendChild(rightControls);
    document.body.appendChild(playerContainer);
  });

  afterEach(() => {
    InPlayerSpeedController.cleanup();
  });

  describe('formatSpeed', () => {
    it('formats round and decimal speeds with multiplication symbol', () => {
      expect(formatSpeed(1)).toBe('1.0×');
      expect(formatSpeed(1.0)).toBe('1.0×');
      expect(formatSpeed(1.25)).toBe('1.25×');
      expect(formatSpeed(1.5)).toBe('1.5×');
      expect(formatSpeed(2)).toBe('2.0×');
      expect(formatSpeed(4)).toBe('4.0×');
      expect(formatSpeed(16)).toBe('16.0×');
      expect(formatSpeed(0.1)).toBe('0.1×');
    });

    it('clamps speeds beyond supported range', () => {
      expect(formatSpeed(0.01)).toBe('0.1×');
      expect(formatSpeed(99)).toBe('16.0×');
    });
  });

  describe('Button Injection & Duplicate Prevention', () => {
    it('injects dedicated speed button before native settings button', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);

      const btn = rightControls.querySelector('.ytp-unchained-speed-btn');
      expect(btn).not.toBeNull();
      expect(btn?.getAttribute('aria-label')).toContain('Playback speed');
      expect(btn?.textContent).toBe('1.0×');

      // Verified injected before settings button
      const settingsBtn = rightControls.querySelector('.ytp-settings-button');
      expect(btn?.nextElementSibling).toBe(settingsBtn);
    });

    it('prevents duplicate buttons when ensureInjected is called multiple times', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      InPlayerSpeedController.ensureInjected();
      InPlayerSpeedController.ensureInjected();

      const btns = document.querySelectorAll('.ytp-unchained-speed-btn');
      expect(btns.length).toBe(1);
    });

    it('removes stale orphaned button if controls are replaced', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);

      // Create a duplicate outside rightControls
      const orphanedBtn = document.createElement('button');
      orphanedBtn.className = 'ytp-button ytp-unchained-speed-btn';
      document.body.appendChild(orphanedBtn);

      InPlayerSpeedController.ensureInjected();

      const allBtns = document.querySelectorAll('.ytp-unchained-speed-btn');
      expect(allBtns.length).toBe(1);
      expect(rightControls.contains(allBtns[0])).toBe(true);
    });
  });

  describe('Popover Open/Close Interaction', () => {
    it('opens popover when speed button is clicked and closes when clicked again', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;
      expect(btn).not.toBeNull();
      expect(InPlayerSpeedController.isOpen()).toBe(false);

      // Click to open
      btn.click();
      expect(InPlayerSpeedController.isOpen()).toBe(true);

      const popover = InPlayerSpeedController.getPopover();
      expect(popover).not.toBeNull();
      expect(playerContainer.contains(popover)).toBe(true);
      expect(popover?.querySelector('.yt-unchained-popover-title')?.textContent).toBe('Playback speed');
      expect(popover?.querySelector('.yt-unchained-speed-badge')?.textContent).toBe('1.0×');

      // Click to close
      btn.click();
      expect(InPlayerSpeedController.isOpen()).toBe(false);
      expect(InPlayerSpeedController.getPopover()).toBeNull();
    });

    it('closes popover on Escape key press and restores focus to speed button', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;
      const focusSpy = vi.spyOn(btn, 'focus');

      btn.click();
      expect(InPlayerSpeedController.isOpen()).toBe(true);

      // Dispatch Escape keydown
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(escapeEvent);

      expect(InPlayerSpeedController.isOpen()).toBe(false);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('closes popover when user clicks outside', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;

      btn.click();
      expect(InPlayerSpeedController.isOpen()).toBe(true);

      // Click outside on document body
      const outsideEvent = new MouseEvent('mousedown', { bubbles: true });
      document.body.dispatchEvent(outsideEvent);

      expect(InPlayerSpeedController.isOpen()).toBe(false);
    });
  });

  describe('Slider & Real-Time Playback Updates', () => {
    it('updates video playbackRate immediately as slider moves without reloading or seeking', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;
      btn.click();

      const popover = InPlayerSpeedController.getPopover()!;
      const slider = popover.querySelector('.yt-unchained-range-slider') as HTMLInputElement;
      expect(slider).not.toBeNull();
      expect(slider.min).toBe('0.1');
      expect(slider.max).toBe('16.0');

      // Move slider to 2.5x
      slider.value = '2.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(videoEl.playbackRate).toBe(2.5);
      expect(popover.querySelector('.yt-unchained-speed-badge')?.textContent).toBe('2.5×');
      expect(btn.querySelector('.ytp-unchained-speed-label')?.textContent).toBe('2.5×');
    });

    it('supports step increment (+) and decrement (−) buttons', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      InPlayerSpeedController.setSpeed(1.0, false);
      const btn = InPlayerSpeedController.getButton()!;
      btn.click();

      const popover = InPlayerSpeedController.getPopover()!;
      const incBtn = popover.querySelector('.step-inc') || popover.querySelectorAll('.yt-unchained-step-btn')[1];
      const decBtn = popover.querySelector('.step-dec') || popover.querySelectorAll('.yt-unchained-step-btn')[0];

      // Increment by 0.1x
      (incBtn as HTMLElement).click();
      expect(videoEl.playbackRate).toBe(1.1);
      expect(popover.querySelector('.yt-unchained-speed-badge')?.textContent).toBe('1.1×');

      // Decrement by 0.1x
      (decBtn as HTMLElement).click();
      expect(videoEl.playbackRate).toBe(1.0);
      expect(popover.querySelector('.yt-unchained-speed-badge')?.textContent).toBe('1.0×');
    });

    it('clicking preset chips applies speed immediately', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;
      btn.click();

      const popover = InPlayerSpeedController.getPopover()!;
      const chip2x = popover.querySelector('button[data-speed="2"]') as HTMLElement;
      expect(chip2x).not.toBeNull();

      chip2x.click();
      expect(videoEl.playbackRate).toBe(2.0);
      expect(chip2x.classList.contains('active')).toBe(true);
      expect(popover.querySelector('.yt-unchained-speed-badge')?.textContent).toBe('2.0×');
      expect(btn.querySelector('.ytp-unchained-speed-label')?.textContent).toBe('2.0×');
    });

    it('reset button resets speed to 1.0x', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      InPlayerSpeedController.setSpeed(3.0, false);

      const btn = InPlayerSpeedController.getButton()!;
      btn.click();

      const popover = InPlayerSpeedController.getPopover()!;
      const resetBtn = popover.querySelector('.yt-unchained-reset-btn') as HTMLElement;
      expect(resetBtn).not.toBeNull();

      resetBtn.click();
      expect(videoEl.playbackRate).toBe(1.0);
      expect(btn.querySelector('.ytp-unchained-speed-label')?.textContent).toBe('1.0×');
    });
  });

  describe('Isolation & Event Propagation', () => {
    it('stops click and key events from bubbling to player container', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;
      btn.click();

      const popover = InPlayerSpeedController.getPopover()!;
      const playerClickSpy = vi.fn();
      playerContainer.addEventListener('click', playerClickSpy);

      // Click inside popover
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      popover.dispatchEvent(clickEvent);

      expect(playerClickSpy).not.toHaveBeenCalled();

      // Keyboard event inside popover (e.g. Space key for range slider or buttons)
      const playerKeySpy = vi.fn();
      playerContainer.addEventListener('keydown', playerKeySpy);

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      popover.dispatchEvent(spaceEvent);

      expect(playerKeySpy).not.toHaveBeenCalled();
    });
  });

  describe('External ratechange synchronization', () => {
    it('syncs button and popover when video rate changes externally', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      const btn = InPlayerSpeedController.getButton()!;
      btn.click();

      const popover = InPlayerSpeedController.getPopover()!;

      // Simulate native YouTube menu changing speed to 1.75x
      InPlayerSpeedController.syncSpeed(1.75);

      expect(btn.querySelector('.ytp-unchained-speed-label')?.textContent).toBe('1.75×');
      expect(popover.querySelector('.yt-unchained-speed-badge')?.textContent).toBe('1.75×');
      const slider = popover.querySelector('.yt-unchained-range-slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBe(1.75);
    });
  });

  describe('Disabled master switch', () => {
    it('removes speed button and closes popover if masterEnabled is false', () => {
      InPlayerSpeedController.init(DEFAULT_USER_SETTINGS);
      expect(InPlayerSpeedController.getButton()).not.toBeNull();

      InPlayerSpeedController.updateSettings({
        ...DEFAULT_USER_SETTINGS,
        masterEnabled: false,
      });

      expect(InPlayerSpeedController.getButton()).toBeNull();
      expect(InPlayerSpeedController.isOpen()).toBe(false);
    });
  });
});
