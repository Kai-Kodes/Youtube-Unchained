import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerManager } from '../src/engine/PlayerManager';
import { DEFAULT_USER_SETTINGS } from '../src/shared/defaults';
import { UserSettings } from '../src/types';

describe('PlayerManager', () => {
  let videoEl: HTMLVideoElement;
  let playerContainer: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    playerContainer = document.createElement('div');
    playerContainer.id = 'movie_player';

    videoEl = document.createElement('video');
    videoEl.className = 'html5-main-video';
    videoEl.volume = 0.5;
    videoEl.playbackRate = 1.0;

    playerContainer.appendChild(videoEl);
    document.body.appendChild(playerContainer);
  });

  it('applies configured default playback speed to video element', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            defaultPlaybackSpeed: 1.75,
          },
        },
      ],
    };

    PlayerManager.init(settings);
    expect(videoEl.playbackRate).toBe(1.75);
  });

  it('does not alter playback speed when defaultPlaybackSpeed is 1.0', () => {
    videoEl.playbackRate = 1.25;
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            defaultPlaybackSpeed: 1.0,
          },
        },
      ],
    };

    PlayerManager.updateSettings(settings);
    expect(videoEl.playbackRate).toBe(1.25);
  });

  it('handles mouse wheel volume adjustment on player container', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            mouseWheelVolume: true,
          },
        },
      ],
    };

    PlayerManager.init(settings);

    // Initial volume is 0.5
    expect(videoEl.volume).toBe(0.5);

    // Scroll up (deltaY < 0 -> volume increases by 0.05)
    const wheelUp = new WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(wheelUp, 'preventDefault');

    videoEl.dispatchEvent(wheelUp);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(videoEl.volume).toBe(0.55);

    // Scroll down (deltaY > 0 -> volume decreases by 0.05)
    const wheelDown = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    videoEl.dispatchEvent(wheelDown);

    expect(videoEl.volume).toBe(0.5);
  });

  it('ignores mouse wheel events outside video player', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            mouseWheelVolume: true,
          },
        },
      ],
    };

    PlayerManager.init(settings);

    const outsideEl = document.createElement('div');
    outsideEl.id = 'comments';
    document.body.appendChild(outsideEl);

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');

    outsideEl.dispatchEvent(wheelEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(videoEl.volume).toBe(0.5);
  });

  it('clamps playback speed strictly between 0.1x and 16.0x', () => {
    expect(PlayerManager.clampSpeed(0.05)).toBe(0.1);
    expect(PlayerManager.clampSpeed(0.1)).toBe(0.1);
    expect(PlayerManager.clampSpeed(2.75)).toBe(2.75);
    expect(PlayerManager.clampSpeed(16.0)).toBe(16.0);
    expect(PlayerManager.clampSpeed(25.0)).toBe(16.0);
    expect(PlayerManager.clampSpeed('invalid')).toBe(1.0);
  });

  it('applies high playback speed up to 16.0x', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            defaultPlaybackSpeed: 16.0,
          },
        },
      ],
    };

    PlayerManager.init(settings);
    expect(videoEl.playbackRate).toBe(16.0);
  });

  it('respects manual player speed changes when enforcePlaybackSpeed is false', () => {
    PlayerManager.resetManualOverride();
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            defaultPlaybackSpeed: 1.5,
            enforcePlaybackSpeed: false,
          },
        },
      ],
    };

    PlayerManager.init(settings);
    expect(videoEl.playbackRate).toBe(1.5);

    // Simulate user manually changing speed in YouTube player
    videoEl.playbackRate = 2.0;
    videoEl.dispatchEvent(new Event('ratechange'));

    expect(PlayerManager.isManualOverrideActive()).toBe(true);

    // Calling applyPlaybackSpeed without force should NOT overwrite user's 2.0x
    PlayerManager.applyPlaybackSpeed(false);
    expect(videoEl.playbackRate).toBe(2.0);

    // Calling with force (e.g. On page navigation) resets and applies default
    PlayerManager.applyPlaybackSpeed(true);
    expect(videoEl.playbackRate).toBe(1.5);
  });

  it('strictly re-enforces configured speed when enforcePlaybackSpeed is true', () => {
    PlayerManager.resetManualOverride();
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            defaultPlaybackSpeed: 1.75,
            enforcePlaybackSpeed: true,
          },
        },
      ],
    };

    PlayerManager.init(settings);
    expect(videoEl.playbackRate).toBe(1.75);

    // When YouTube attempts to reset speed to 1.0, ratechange listener resets it back to 1.75
    videoEl.playbackRate = 1.0;
    videoEl.dispatchEvent(new Event('ratechange'));
    expect(videoEl.playbackRate).toBe(1.75);
  });

  it('handles player ads: clicks skip button, fast-forwards, mutes, and restores on ad finish', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: true,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          visibility: {
            ...DEFAULT_USER_SETTINGS.presets[0].visibility,
            blockPlayerAds: true,
          },
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            defaultPlaybackSpeed: 1.25,
          },
        },
      ],
    };

    PlayerManager.init(settings);
    videoEl.muted = false;
    videoEl.volume = 0.8;
    videoEl.playbackRate = 1.25;

    // Simulate ad banner and skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'ytp-ad-skip-button';
    const clickSpy = vi.spyOn(skipBtn, 'click');
    playerContainer.appendChild(skipBtn);

    // Mock duration & currentTime
    Object.defineProperty(videoEl, 'duration', { value: 15, configurable: true });
    videoEl.currentTime = 1;

    // Mark player as showing ad
    playerContainer.classList.add('ad-showing');

    // Trigger ad handler
    PlayerManager.handlePlayerAds();

    // Verify skip clicked, ad muted, playback accelerated
    expect(clickSpy).toHaveBeenCalled();
    expect(videoEl.muted).toBe(true);
    expect(videoEl.playbackRate).toBe(16.0);
    expect(videoEl.currentTime).toBe(15);

    // Simulate ad finish: ad-showing removed
    playerContainer.classList.remove('ad-showing');
    playerContainer.removeChild(skipBtn);

    // Trigger ad handler again (transition back to main video)
    PlayerManager.handlePlayerAds();

    // Original muted state restored and speed restored to defaultPlaybackSpeed
    expect(videoEl.muted).toBe(false);
    expect(videoEl.playbackRate).toBe(1.25);
  });
});

