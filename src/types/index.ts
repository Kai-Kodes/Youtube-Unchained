/**
 * YouTube Unchained - Core Type Definitions
 */

export type PageType =
  | 'all'
  | 'home'
  | 'watch'
  | 'results'
  | 'channel'
  | 'subscriptions'
  | 'shorts'
  | 'playlist'
  | 'unknown';

export type RuleCategory =
  | 'visibility'
  | 'layout'
  | 'filter'
  | 'theme'
  | 'custom';

export type RuleAction =
  | 'hide'
  | 'css'
  | 'class'
  | 'attribute';

export interface DeclarativeRule {
  id: string;
  featureId: string;
  category: RuleCategory;
  targetPages: PageType[];
  selector: string;
  action: RuleAction;
  cssContent?: string;
  enabled: boolean;
  userFacingDescription: string;
  isBuiltin: boolean;
}

export interface CustomRule {
  id: string;
  name: string;
  selector: string;
  targetPages: PageType[];
  action: 'hide' | 'collapse' | 'custom-style';
  customCss?: string;
  enabled: boolean;
  createdAt: number;
  previewUrl?: string;
}

export interface ChannelFilterRule {
  id: string;
  channelName: string;
  matchType: 'exact' | 'contains';
  enabled: boolean;
}

export interface KeywordFilterRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  caseSensitive: boolean;
  enabled: boolean;
}

export interface DurationFilterSettings {
  enabled: boolean;
  minDurationSeconds: number; // 0 for no min
  maxDurationSeconds: number; // 0 for no max
}

export interface ContentFilterSettings {
  enabled: boolean;
  channels: ChannelFilterRule[];
  keywords: KeywordFilterRule[];
  duration: DurationFilterSettings;
  hideWatched: boolean;
  watchedDisplayMode: 'hide' | 'dim'; // 'hide' removes from DOM flow, 'dim' greys out & reduces opacity
  hideShortsFromFeed: boolean;
  cleanSearchResults: boolean; // strips 'People also watched', 'For you' from results
}

export interface VisibilitySettings {
  hideShortsNavAndShelves: boolean;
  hideHomeRecommendations: boolean;
  hideWatchRelatedVideos: boolean;
  hideComments: boolean;
  hideLiveChat: boolean;
  hideEndCardsAndOverlays: boolean;
  hideMerchAndShopping: boolean;
  hideGamingAndPlayables: boolean;
  hideTrendingAndExplore: boolean;
  hideCommunityPosts: boolean;
  hideNotificationBell: boolean;
  hideVoiceSearchButton: boolean;
  hideHeaderButtons: boolean;
  hideSidebarSections: boolean;
  hideAmbientLighting: boolean; // disables YouTube canvas ambient backlight / cinematics
  autoExpandDescription: boolean; // auto-expands video description box
  hideInterfaceAds: boolean; // hides home-feed ad cards, search ads, sponsored cards, promoted shelves
  blockPlayerAds: boolean; // auto-skips video player ads, fast-forwards ad video, mutes ad audio
}

export interface LayoutSettings {
  videoGridColumns: number; // 0 = default, 2, 3, 4, 5, 6
  compactSpacing: boolean;
  hideSidebarByDefault: boolean;
  sidebarWidthPx: number; // 0 = default
  distractionFreeMode: boolean;
  playerMaximized: boolean;
  cleanPlayerControls: boolean;
  defaultPlaybackSpeed: number; // 0.1x to 16.0x (default 1.0)
  enforcePlaybackSpeed: boolean; // continuously re-enforces speed if YouTube/ads attempt to override
  mouseWheelVolume: boolean; // mouse wheel on player adjusts volume
}

export interface ThemeSettings {
  customAccentColor: string; // e.g. '' (default red) or '#3b82f6'
  oledBlackMode: boolean;
  reducedMotion: boolean;
}

export interface PresetProfile {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  visibility: VisibilitySettings;
  layout: LayoutSettings;
  filters: ContentFilterSettings;
  theme: ThemeSettings;
}

export interface UserSettings {
  version: number;
  masterEnabled: boolean;
  activePresetId: string;
  presets: PresetProfile[];
  customRules: CustomRule[];
  diagnosticsEnabled: boolean;
  updatedAt: number;
}

export interface RuntimeMessage<T = any> {
  type:
    | 'GET_SETTINGS'
    | 'SAVE_SETTINGS'
    | 'SETTINGS_UPDATED'
    | 'ACTIVATE_ELEMENT_PICKER'
    | 'ELEMENT_PICKER_ACTION'
    | 'ELEMENT_PICKED'
    | 'CANCEL_ELEMENT_PICKER'
    | 'PAGE_NAVIGATED'
    | 'GET_PAGE_STATUS'
    | 'PAGE_STATUS_RESPONSE';
  payload?: T;
}

export interface PageStatus {
  pageType: PageType;
  pathname: string;
  url: string;
  rulesActiveCount: number;
  filteredCount: number;
}
