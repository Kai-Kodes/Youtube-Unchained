import {
  UserSettings,
  PresetProfile,
  CustomRule,
} from '../types';
import {
  DEFAULT_USER_SETTINGS,
  CURRENT_SETTINGS_VERSION,
  BUILTIN_PRESETS,
  clampPlaybackSpeed,
} from './defaults';

const STORAGE_KEY = 'yt_unchained_settings';

export class StorageManager {
  /**
   * Load user settings from chrome.storage.local
   */
  static async load(): Promise<UserSettings> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        return { ...DEFAULT_USER_SETTINGS };
      }

      const result = await chrome.storage.local.get(STORAGE_KEY);
      const raw = result[STORAGE_KEY];

      if (!raw) {
        await this.save(DEFAULT_USER_SETTINGS);
        return { ...DEFAULT_USER_SETTINGS };
      }

      const migrated = this.migrate(raw);
      return migrated;
    } catch (err) {
      console.error('[YouTube Unchained] Failed to load settings from storage:', err);
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  /**
   * Save user settings to chrome.storage.local
   */
  static async save(settings: UserSettings): Promise<void> {
    try {
      settings.updatedAt = Date.now();
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
      }
    } catch (err) {
      console.error('[YouTube Unchained] Failed to save settings to storage:', err);
      throw err;
    }
  }

  /**
   * Migration engine for future schema versions
   */
  static migrate(raw: any): UserSettings {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_USER_SETTINGS };
    }

    let settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      ...raw,
    };

    // Ensure all built-in presets exist
    const presetsMap = new Map<string, PresetProfile>();
    // First seed with builtin defaults
    for (const p of BUILTIN_PRESETS) {
      presetsMap.set(p.id, { ...p });
    }
    // Then merge user-defined or modified presets
    if (Array.isArray(raw.presets)) {
      for (const p of raw.presets) {
        if (p && typeof p.id === 'string') {
          const builtin = BUILTIN_PRESETS.find((bp) => bp.id === p.id);
          presetsMap.set(p.id, {
            id: p.id,
            name: typeof p.name === 'string' ? p.name : (builtin?.name || 'Custom'),
            description: typeof p.description === 'string' ? p.description : '',
            isBuiltin: Boolean(builtin),
            visibility: {
              ...(builtin?.visibility || DEFAULT_USER_SETTINGS.presets[0].visibility),
              hideAmbientLighting: false,
              autoExpandDescription: false,
              hideInterfaceAds: true,
              blockPlayerAds: true,
              ...p.visibility,
            },
            layout: {
              ...(builtin?.layout || DEFAULT_USER_SETTINGS.presets[0].layout),
              enforcePlaybackSpeed: false,
              mouseWheelVolume: false,
              ...p.layout,
              defaultPlaybackSpeed: clampPlaybackSpeed(p.layout?.defaultPlaybackSpeed ?? 1.0),
            },
            filters: {
              ...(builtin?.filters || DEFAULT_USER_SETTINGS.presets[0].filters),
              watchedDisplayMode: 'hide',
              ...p.filters,
              duration: {
                ...(builtin?.filters.duration || DEFAULT_USER_SETTINGS.presets[0].filters.duration),
                ...(p.filters?.duration || {}),
              },
              channels: Array.isArray(p.filters?.channels) ? p.filters.channels : [],
              keywords: Array.isArray(p.filters?.keywords) ? p.filters.keywords : [],
            },
            theme: { ...(builtin?.theme || DEFAULT_USER_SETTINGS.presets[0].theme), ...p.theme },
          });
        }
      }
    }
    settings.presets = Array.from(presetsMap.values());

    // Validate activePresetId
    if (!settings.presets.some((p) => p.id === settings.activePresetId)) {
      settings.activePresetId = 'preset-default';
    }

    // Ensure customRules is an array
    if (!Array.isArray(settings.customRules)) {
      settings.customRules = [];
    }

    settings.version = CURRENT_SETTINGS_VERSION;
    return settings;
  }

  /**
   * Get active preset object
   */
  static getActivePreset(settings: UserSettings): PresetProfile {
    const found = settings.presets.find((p) => p.id === settings.activePresetId);
    return found || settings.presets[0] || BUILTIN_PRESETS[0];
  }

  /**
   * Switch active preset without destroying custom rules
   */
  static async switchPreset(presetId: string): Promise<UserSettings> {
    const settings = await this.load();
    if (settings.presets.some((p) => p.id === presetId)) {
      settings.activePresetId = presetId;
      await this.save(settings);
    }
    return settings;
  }

  /**
   * Update active preset partially
   */
  static async updateActivePreset(
    updater: (preset: PresetProfile) => void
  ): Promise<UserSettings> {
    const settings = await this.load();
    const active = settings.presets.find((p) => p.id === settings.activePresetId);
    if (active) {
      updater(active);
      await this.save(settings);
    }
    return settings;
  }

  /**
   * Reset active preset to factory defaults if it is a builtin preset
   */
  static async resetActivePreset(): Promise<UserSettings> {
    const settings = await this.load();
    const builtin = BUILTIN_PRESETS.find((p) => p.id === settings.activePresetId);
    if (builtin) {
      const idx = settings.presets.findIndex((p) => p.id === settings.activePresetId);
      if (idx !== -1) {
        settings.presets[idx] = JSON.parse(JSON.stringify(builtin));
        await this.save(settings);
      }
    }
    return settings;
  }

  /**
   * Add or update a custom rule
   */
  static async upsertCustomRule(rule: CustomRule): Promise<UserSettings> {
    const settings = await this.load();
    const idx = settings.customRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      settings.customRules[idx] = rule;
    } else {
      settings.customRules.push(rule);
    }
    await this.save(settings);
    return settings;
  }

  /**
   * Delete a custom rule by ID
   */
  static async deleteCustomRule(ruleId: string): Promise<UserSettings> {
    const settings = await this.load();
    settings.customRules = settings.customRules.filter((r) => r.id !== ruleId);
    await this.save(settings);
    return settings;
  }

  /**
   * Export settings to formatted JSON string
   */
  static exportToJson(settings: UserSettings): string {
    const payload = {
      app: 'youtube-unchained',
      exportedAt: new Date().toISOString(),
      version: settings.version,
      masterEnabled: settings.masterEnabled,
      activePresetId: settings.activePresetId,
      presets: settings.presets,
      customRules: settings.customRules,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Validate and import settings from JSON string
   */
  static importFromJson(jsonString: string): UserSettings {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      throw new Error(`Invalid JSON format: ${e.message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Imported data must be a valid JSON object.');
    }

    if (parsed.app && parsed.app !== 'youtube-unchained') {
      throw new Error('Unsupported configuration file: application identifier mismatch.');
    }

    // Validate custom rules if present
    if (Array.isArray(parsed.customRules)) {
      for (const rule of parsed.customRules) {
        if (!rule.selector || typeof rule.selector !== 'string') {
          throw new Error('Custom rule contains invalid selector.');
        }
        if (/[<>{};]/.test(rule.selector) || /<\/style/i.test(rule.selector)) {
          throw new Error('Custom rule contains prohibited characters in selector.');
        }
        // Safety check selector syntax
        if (typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function') {
          try {
            document.createDocumentFragment().querySelector(rule.selector);
          } catch {
            throw new Error(`Invalid CSS selector syntax: "${rule.selector}"`);
          }
        }
      }
    }

    const migrated = this.migrate(parsed);
    return migrated;
  }
}
