import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../src/engine/RuleEngine';
import { DEFAULT_USER_SETTINGS, BUILTIN_PRESETS } from '../src/shared/defaults';
import { UserSettings, CustomRule } from '../src/types';

describe('RuleEngine', () => {
  it('returns disabled comment when masterEnabled is false', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      masterEnabled: false,
    };
    const css = RuleEngine.compileCss(settings);
    expect(css).toContain('YouTube Unchained is Disabled');
    expect(css).not.toContain('ytd-rich-shelf-renderer');
  });

  it('compiles base root attributes when enabled', () => {
    const css = RuleEngine.compileCss(DEFAULT_USER_SETTINGS);
    expect(css).toContain('html[yt-unchained-active="true"]');
    expect(css).toContain('--yt-unchained-loaded: 1');
  });

  it('generates visibility rules for Study Mode preset', () => {
    const studyPreset = BUILTIN_PRESETS.find((p) => p.id === 'preset-study')!;
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      activePresetId: 'preset-study',
      presets: [studyPreset],
    };

    const css = RuleEngine.compileCss(settings);
    // Should hide shorts
    expect(css).toContain('ytd-rich-shelf-renderer[is-shorts]');
    expect(css).toContain('ytd-shorts');
    // Should hide comments
    expect(css).toContain('ytd-comments#comments');
    // Should hide homepage recommendations
    expect(css).toContain('ytd-browse[page-subtype="home"]');
    // Should hide live chat
    expect(css).toContain('ytd-live-chat-frame#chat');
  });

  it('generates layout CSS for custom video grid columns', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            videoGridColumns: 4,
          },
        },
      ],
    };

    const css = RuleEngine.compileCss(settings);
    expect(css).toContain('--ytd-rich-grid-items-per-row: 4 !important');
  });

  it('generates distraction-free layout rules', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            distractionFreeMode: true,
          },
        },
      ],
    };

    const css = RuleEngine.compileCss(settings);
    expect(css).toContain('Distraction-Free Viewing Mode');
    expect(css).toContain('max-width: 1200px !important');
  });

  it('generates custom accent color and OLED black theme rules', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          theme: {
            customAccentColor: '#0284c7',
            oledBlackMode: true,
            reducedMotion: true,
          },
        },
      ],
    };

    const css = RuleEngine.compileCss(settings);
    expect(css).toContain('--yt-spec-call-to-action: #0284c7 !important');
    expect(css).toContain('background: #000000 !important');
    expect(css).toContain('animation-duration: 0.001s !important');
  });

  it('compiles user-defined custom rules scoped to page or all pages', () => {
    const customRuleAll: CustomRule = {
      id: 'rule-1',
      name: 'Hide Mini Guide',
      selector: 'ytd-mini-guide-renderer',
      targetPages: ['all'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    const customRuleWatchOnly: CustomRule = {
      id: 'rule-2',
      name: 'Collapse Player Header',
      selector: '#player-header',
      targetPages: ['watch'],
      action: 'collapse',
      enabled: true,
      createdAt: Date.now(),
    };

    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      customRules: [customRuleAll, customRuleWatchOnly],
    };

    // On watch page
    const watchCss = RuleEngine.compileCss(settings, 'watch');
    expect(watchCss).toContain('ytd-mini-guide-renderer { display: none !important; }');
    expect(watchCss).toContain('#player-header { visibility: hidden !important;');

    // On home page
    const homeCss = RuleEngine.compileCss(settings, 'home');
    expect(homeCss).toContain('ytd-mini-guide-renderer { display: none !important; }');
    expect(homeCss).not.toContain('#player-header');
  });

  it('sanitizes custom CSS and rejects invalid/injected selectors', () => {
    const maliciousRule: CustomRule = {
      id: 'rule-evil-1',
      name: 'Breakout Attempt',
      selector: '.innocent-class',
      targetPages: ['all'],
      action: 'custom-style',
      customCss: 'color: red; </style><script>alert("xss")</script>',
      enabled: true,
      createdAt: Date.now(),
    };

    const injectedSelectorRule: CustomRule = {
      id: 'rule-evil-2',
      name: 'Selector Injection',
      selector: '.bad { color: blue; } #injected',
      targetPages: ['all'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      customRules: [maliciousRule, injectedSelectorRule],
    };

    const compiled = RuleEngine.compileCss(settings, 'all');

    // Should neutralize </style and <script tags
    expect(compiled).not.toContain('</style><script>');
    expect(compiled).toContain('<\\/style');

    // Should completely reject selector with curly braces
    expect(compiled).not.toContain('#injected');
  });

  it('sanitizes theme customAccentColor against style breakout', () => {
    const maliciousThemeSettings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          theme: {
            ...DEFAULT_USER_SETTINGS.presets[0].theme,
            customAccentColor: '#ff0000; } </style><script>alert(1)</script>',
          },
        },
      ],
    };

    const compiled = RuleEngine.compileCss(maliciousThemeSettings);
    expect(compiled).not.toContain('</style>');
    expect(compiled).not.toContain('<script>');
    expect(compiled).not.toContain('alert(1)');
  });

  it('clamps invalid or extreme grid columns and sidebar widths to safe bounds', () => {
    const extremeSettings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          layout: {
            ...DEFAULT_USER_SETTINGS.presets[0].layout,
            videoGridColumns: 999 as any,
            sidebarWidthPx: 50000 as any,
          },
        },
      ],
    };

    const compiled = RuleEngine.compileCss(extremeSettings);
    expect(compiled).toContain('--ytd-rich-grid-items-per-row: 10 !important');
    expect(compiled).toContain('width: 800px !important');
  });

  it('ignores syntactically invalid selectors safely', () => {
    const invalidSelectorRule: CustomRule = {
      id: 'rule-invalid-syntax',
      name: 'Invalid Syntax Rule',
      selector: ':::invalid>>[unclosed',
      targetPages: ['all'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      customRules: [invalidSelectorRule],
    };

    const compiled = RuleEngine.compileCss(settings, 'all');
    expect(compiled).not.toContain(':::invalid>>[unclosed');
  });

  it('generates ambient lighting suppression and auto-expand description rules', () => {
    const settings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          visibility: {
            ...DEFAULT_USER_SETTINGS.presets[0].visibility,
            hideAmbientLighting: true,
            autoExpandDescription: true,
          },
        },
      ],
    };

    const compiled = RuleEngine.compileCss(settings);
    expect(compiled).toContain('#cinematics');
    expect(compiled).toContain('#ambient-canvas');
    expect(compiled).toContain('.ytp-ambient-lighting');
    expect(compiled).toContain('#description-inline-expander[collapsed] #content');
  });

  it('generates interface ad blocking CSS when hideInterfaceAds is enabled', () => {
    const settingsWithAds: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          visibility: {
            ...DEFAULT_USER_SETTINGS.presets[0].visibility,
            hideInterfaceAds: true,
          },
        },
      ],
    };

    const compiled = RuleEngine.compileCss(settingsWithAds);
    expect(compiled).toContain('ytd-ad-slot-renderer');
    expect(compiled).toContain('ytd-in-feed-ad-layout-renderer');
    expect(compiled).toContain('#masthead-ad');
    expect(compiled).toContain('.ytp-ad-overlay-container');

    const settingsWithoutAds: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      presets: [
        {
          ...DEFAULT_USER_SETTINGS.presets[0],
          visibility: {
            ...DEFAULT_USER_SETTINGS.presets[0].visibility,
            hideInterfaceAds: false,
          },
        },
      ],
    };

    const compiledOff = RuleEngine.compileCss(settingsWithoutAds);
    expect(compiledOff).not.toContain('ytd-in-feed-ad-layout-renderer');
    expect(compiledOff).not.toContain('#masthead-ad');
  });
});

