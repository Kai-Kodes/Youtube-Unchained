import {
  UserSettings,
  PresetProfile,
  VisibilitySettings,
  LayoutSettings,
  ContentFilterSettings,
  ThemeSettings,
} from '../types';

export const CURRENT_SETTINGS_VERSION = 1;

/**
 * Validates and clamps playback speed strictly between 0.1x and 16.0x
 */
export function clampPlaybackSpeed(val: any): number {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || !isFinite(num) || num <= 0) return 1.0;
  return Math.max(0.1, Math.min(16.0, Math.round(num * 100) / 100));
}

export const DEFAULT_VISIBILITY: VisibilitySettings = {
  hideShortsNavAndShelves: false,
  hideHomeRecommendations: false,
  hideWatchRelatedVideos: false,
  hideComments: false,
  hideLiveChat: false,
  hideEndCardsAndOverlays: false,
  hideMerchAndShopping: false,
  hideGamingAndPlayables: false,
  hideTrendingAndExplore: false,
  hideCommunityPosts: false,
  hideNotificationBell: false,
  hideVoiceSearchButton: false,
  hideHeaderButtons: false,
  hideSidebarSections: false,
  hideAmbientLighting: false,
  autoExpandDescription: false,
  hideInterfaceAds: true,
  blockPlayerAds: true,
};

export const DEFAULT_LAYOUT: LayoutSettings = {
  videoGridColumns: 0,
  compactSpacing: false,
  hideSidebarByDefault: false,
  sidebarWidthPx: 0,
  distractionFreeMode: false,
  playerMaximized: false,
  cleanPlayerControls: false,
  defaultPlaybackSpeed: 1.0,
  enforcePlaybackSpeed: false,
  mouseWheelVolume: false,
};

export const DEFAULT_CONTENT_FILTERS: ContentFilterSettings = {
  enabled: true,
  channels: [],
  keywords: [],
  duration: {
    enabled: false,
    minDurationSeconds: 0,
    maxDurationSeconds: 0,
  },
  hideWatched: false,
  watchedDisplayMode: 'hide',
  hideShortsFromFeed: false,
  cleanSearchResults: true,
};

export const DEFAULT_THEME: ThemeSettings = {
  customAccentColor: '',
  oledBlackMode: false,
  reducedMotion: false,
};

export const BUILTIN_PRESETS: PresetProfile[] = [
  {
    id: 'preset-default',
    name: 'Default',
    description: 'Clean standard YouTube interface with safe defaults and zero interference.',
    isBuiltin: true,
    visibility: { ...DEFAULT_VISIBILITY },
    layout: { ...DEFAULT_LAYOUT },
    filters: { ...DEFAULT_CONTENT_FILTERS },
    theme: { ...DEFAULT_THEME },
  },
  {
    id: 'preset-study',
    name: 'Study Mode',
    description: 'Eliminates algorithmic rabbit holes, Shorts, gaming feeds, and comment distractions.',
    isBuiltin: true,
    visibility: {
      ...DEFAULT_VISIBILITY,
      hideShortsNavAndShelves: true,
      hideHomeRecommendations: true,
      hideWatchRelatedVideos: true,
      hideComments: true,
      hideLiveChat: true,
      hideGamingAndPlayables: true,
      hideTrendingAndExplore: true,
      hideNotificationBell: true,
    },
    layout: {
      ...DEFAULT_LAYOUT,
      compactSpacing: true,
      distractionFreeMode: false,
    },
    filters: {
      ...DEFAULT_CONTENT_FILTERS,
      hideShortsFromFeed: true,
      cleanSearchResults: true,
    },
    theme: { ...DEFAULT_THEME },
  },
  {
    id: 'preset-minimal',
    name: 'Minimal Mode',
    description: 'Stripped-down, fast UI with reduced visual noise, clean grids, and no promotions.',
    isBuiltin: true,
    visibility: {
      ...DEFAULT_VISIBILITY,
      hideShortsNavAndShelves: true,
      hideMerchAndShopping: true,
      hideGamingAndPlayables: true,
      hideTrendingAndExplore: true,
      hideVoiceSearchButton: true,
      hideCommunityPosts: true,
      hideEndCardsAndOverlays: true,
    },
    layout: {
      ...DEFAULT_LAYOUT,
      compactSpacing: true,
      videoGridColumns: 4,
    },
    filters: {
      ...DEFAULT_CONTENT_FILTERS,
      cleanSearchResults: true,
    },
    theme: { ...DEFAULT_THEME },
  },
  {
    id: 'preset-music',
    name: 'Music Mode',
    description: 'Optimized for listening and playlists: hides live chat, comments, and gaming promos.',
    isBuiltin: true,
    visibility: {
      ...DEFAULT_VISIBILITY,
      hideLiveChat: true,
      hideComments: true,
      hideGamingAndPlayables: true,
      hideMerchAndShopping: true,
      hideEndCardsAndOverlays: true,
    },
    layout: {
      ...DEFAULT_LAYOUT,
      cleanPlayerControls: true,
    },
    filters: {
      ...DEFAULT_CONTENT_FILTERS,
    },
    theme: {
      ...DEFAULT_THEME,
      oledBlackMode: true,
    },
  },
  {
    id: 'preset-subscriptions',
    name: 'Subscription Mode',
    description: 'Focuses entirely on channels you chose to follow, hiding homepage algorithmic recommendations.',
    isBuiltin: true,
    visibility: {
      ...DEFAULT_VISIBILITY,
      hideHomeRecommendations: true,
      hideShortsNavAndShelves: true,
      hideTrendingAndExplore: true,
    },
    layout: {
      ...DEFAULT_LAYOUT,
      compactSpacing: true,
    },
    filters: {
      ...DEFAULT_CONTENT_FILTERS,
      hideShortsFromFeed: true,
    },
    theme: { ...DEFAULT_THEME },
  },
  {
    id: 'preset-distraction-free',
    name: 'Distraction-Free',
    description: 'Pure focused viewing. No recommendations, no sidebars, no comments, no notifications.',
    isBuiltin: true,
    visibility: {
      ...DEFAULT_VISIBILITY,
      hideShortsNavAndShelves: true,
      hideHomeRecommendations: true,
      hideWatchRelatedVideos: true,
      hideComments: true,
      hideLiveChat: true,
      hideEndCardsAndOverlays: true,
      hideNotificationBell: true,
      hideTrendingAndExplore: true,
      hideGamingAndPlayables: true,
      hideMerchAndShopping: true,
    },
    layout: {
      ...DEFAULT_LAYOUT,
      distractionFreeMode: true,
      hideSidebarByDefault: true,
      compactSpacing: true,
    },
    filters: {
      ...DEFAULT_CONTENT_FILTERS,
      hideShortsFromFeed: true,
      cleanSearchResults: true,
    },
    theme: { ...DEFAULT_THEME },
  },
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  version: CURRENT_SETTINGS_VERSION,
  masterEnabled: true,
  activePresetId: 'preset-default',
  presets: BUILTIN_PRESETS,
  customRules: [],
  diagnosticsEnabled: false,
  updatedAt: Date.now(),
};
