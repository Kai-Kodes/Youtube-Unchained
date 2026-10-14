import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../src/shared/storage';
import { BUILTIN_PRESETS } from '../src/shared/defaults';
import { CustomRule } from '../src/types';

describe('StorageManager & Migrations', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it('loads factory defaults when storage is empty', async () => {
    const loaded = await StorageManager.load();
    expect(loaded.masterEnabled).toBe(true);
    expect(loaded.activePresetId).toBe('preset-default');
    expect(loaded.presets.length).toBe(BUILTIN_PRESETS.length);
  });

  it('switches preset without destroying custom rules', async () => {
    await StorageManager.load();
    const customRule: CustomRule = {
      id: 'rule-test-1',
      name: 'Custom Rule',
      selector: '#custom-el',
      targetPages: ['all'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    await StorageManager.upsertCustomRule(customRule);

    // Switch preset
    const afterSwitch = await StorageManager.switchPreset('preset-minimal');
    expect(afterSwitch.activePresetId).toBe('preset-minimal');
    expect(afterSwitch.customRules.length).toBe(1);
    expect(afterSwitch.customRules[0].id).toBe('rule-test-1');
  });

  it('exports configuration to valid JSON', async () => {
    const settings = await StorageManager.load();
    const jsonStr = StorageManager.exportToJson(settings);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.app).toBe('youtube-unchained');
    expect(parsed.version).toBe(settings.version);
    expect(parsed.presets).toBeDefined();
  });

  it('imports valid JSON and validates schema', () => {
    const validJson = JSON.stringify({
      app: 'youtube-unchained',
      version: 1,
      masterEnabled: true,
      activePresetId: 'preset-study',
      presets: BUILTIN_PRESETS,
      customRules: [
        {
          id: 'imported-rule',
          name: 'Imported',
          selector: '.imported-class',
          targetPages: ['all'],
          action: 'hide',
          enabled: true,
          createdAt: Date.now(),
        },
      ],
    });

    const imported = StorageManager.importFromJson(validJson);
    expect(imported.activePresetId).toBe('preset-study');
    expect(imported.customRules.length).toBe(1);
    expect(imported.customRules[0].name).toBe('Imported');
  });

  it('throws descriptive error on malformed JSON import', () => {
    expect(() => {
      StorageManager.importFromJson('not a json');
    }).toThrow(/Invalid JSON format/);

    expect(() => {
      StorageManager.importFromJson('{"app": "other-extension"}');
    }).toThrow(/application identifier mismatch/);

    expect(() => {
      StorageManager.importFromJson(
        JSON.stringify({
          app: 'youtube-unchained',
          customRules: [{ id: '1', selector: '.foo { color: red; }', action: 'hide' }],
        })
      );
    }).toThrow(/prohibited characters in selector/);
  });

  it('resets active builtin preset to factory values', async () => {
    await StorageManager.load();
    // Modify default preset
    await StorageManager.updateActivePreset((p) => {
      p.visibility.hideComments = true;
    });

    let modified = await StorageManager.load();
    expect(modified.presets[0].visibility.hideComments).toBe(true);

    // Reset
    await StorageManager.resetActivePreset();
    let reset = await StorageManager.load();
    expect(reset.presets[0].visibility.hideComments).toBe(false);
  });

  it('safely migrates legacy settings lacking new reference-gap fields', () => {
    const legacyRaw = {
      version: 1,
      masterEnabled: true,
      activePresetId: 'preset-default',
      presets: [
        {
          id: 'preset-default',
          name: 'Default',
          visibility: {
            hideShortsNavAndShelves: true,
          },
          layout: {
            videoGridColumns: 3,
          },
          filters: {
            hideWatched: true,
          },
        },
      ],
    };

    const migrated = StorageManager.migrate(legacyRaw);
    const active = migrated.presets.find((p) => p.id === 'preset-default')!;
    expect(active.visibility.hideAmbientLighting).toBe(false);
    expect(active.visibility.autoExpandDescription).toBe(false);
    expect(active.visibility.hideInterfaceAds).toBe(true);
    expect(active.visibility.blockPlayerAds).toBe(true);
    expect(active.layout.defaultPlaybackSpeed).toBe(1.0);
    expect(active.layout.enforcePlaybackSpeed).toBe(false);
    expect(active.layout.mouseWheelVolume).toBe(false);
    expect(active.filters.watchedDisplayMode).toBe('hide');
    expect(active.visibility.hideShortsNavAndShelves).toBe(true);
    expect(active.layout.videoGridColumns).toBe(3);

    // Test out of bounds playback speed clamping during migration
    const legacyOutOfBounds = {
      ...legacyRaw,
      presets: [
        {
          ...legacyRaw.presets[0],
          layout: {
            defaultPlaybackSpeed: 99.0,
          },
        },
      ],
    };
    const migratedClamped = StorageManager.migrate(legacyOutOfBounds);
    expect(migratedClamped.presets[0].layout.defaultPlaybackSpeed).toBe(16.0);
  });
});

