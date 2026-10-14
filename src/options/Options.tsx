import React, { useState, useEffect, useRef } from 'react';
import {
  UserSettings,
  PresetProfile,
  CustomRule,
  ChannelFilterRule,
  KeywordFilterRule,
} from '../types';
import { StorageManager } from '../shared/storage';
import { DEFAULT_USER_SETTINGS } from '../shared/defaults';
import { Toggle } from '../components/Toggle';
import {
  LucideIcon,
  Shield,
  Eye,
  Sliders,
  Filter,
  Palette,
  FileCode,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Search,
  X,
  Info,
  AlertTriangle,
  Terminal,
  Activity,
  PlayCircle,
  ShieldAlert,
  Compass,
  Crosshair,
} from 'lucide-react';

interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: NavSection[] = [
  { id: 'sec-general', label: 'General & Master', icon: Shield },
  { id: 'sec-visibility', label: 'Interface & Shell', icon: Eye },
  { id: 'sec-shorts', label: 'Shorts & Recommendations', icon: Compass },
  { id: 'sec-filters', label: 'Content Filters & Watched', icon: Filter },
  { id: 'sec-player', label: 'Video Player Controls', icon: PlayCircle },
  { id: 'sec-controls', label: 'Controls & Density', icon: Sliders },
  { id: 'sec-ads', label: 'Ad Blocking & Sponsored', icon: ShieldAlert },
  { id: 'sec-appearance', label: 'Appearance & Themes', icon: Palette },
  { id: 'sec-custom-rules', label: 'Custom CSS Rules', icon: FileCode },
  { id: 'sec-backup', label: 'Presets & Backup', icon: Download },
];

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeSection, setActiveSection] = useState<string>('sec-general');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // New rule form states
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelMatch, setNewChannelMatch] = useState<'exact' | 'contains'>('contains');
  const [newKeywordPattern, setNewKeywordPattern] = useState('');
  const [newKeywordIsRegex, setNewKeywordIsRegex] = useState(false);
  const [newCustomSelector, setNewCustomSelector] = useState('');
  const [newCustomName, setNewCustomName] = useState('');

  // Duration filter states
  const [minDurationInput, setMinDurationInput] = useState<number>(0);
  const [maxDurationInput, setMaxDurationInput] = useState<number>(0);

  // Observer reference for tracking visible sections
  const isScrollingRef = useRef(false);

  useEffect(() => {
    StorageManager.load().then((loaded) => {
      setSettings(loaded);
      const active = StorageManager.getActivePreset(loaded);
      setMinDurationInput(active.filters.duration?.minDurationSeconds || 0);
      setMaxDurationInput(active.filters.duration?.maxDurationSeconds || 0);
    });
  }, []);

  // Set up scroll tracking to highlight active sidebar section
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      const scrollPosition = window.scrollY + 120;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const sec = document.getElementById(SECTIONS[i].id);
        if (sec && sec.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    isScrollingRef.current = true;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  };

  /**
   * Save settings with optimistic UI update
   */
  const saveSettings = async (updated: UserSettings) => {
    const previous = settings;
    setSettings(updated);
    try {
      await StorageManager.save(updated);
      showStatus('Settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSettings(previous);
      showStatus('Failed to save settings');
    }
  };

  /**
   * Update active preset with optimistic UI update
   */
  const updateActivePreset = async (updater: (p: PresetProfile) => void) => {
    if (!settings) return;
    const previous = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const nextSettings = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const active = nextSettings.presets.find((p) => p.id === nextSettings.activePresetId);
    if (active) {
      updater(active);
    }
    setSettings(nextSettings);
    try {
      await StorageManager.updateActivePreset(updater);
      showStatus('Settings updated');
    } catch (err) {
      console.error('Failed to update preset:', err);
      setSettings(previous);
      showStatus('Failed to update preset');
    }
  };

  /**
   * Custom rule toggle
   */
  const handleCustomRuleToggle = async (rule: CustomRule, enabled: boolean) => {
    if (!settings) return;
    const previous = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const nextSettings = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const r = nextSettings.customRules.find((x) => x.id === rule.id);
    if (r) {
      r.enabled = enabled;
    }
    setSettings(nextSettings);
    try {
      const updated = await StorageManager.upsertCustomRule({
        ...rule,
        enabled,
      });
      setSettings({ ...updated });
    } catch (err) {
      console.error('Failed to update custom rule:', err);
      setSettings(previous);
    }
  };

  if (!settings) {
    return (
      <div className="loading-screen">
        <Activity size={24} className="spin-icon" />
        <span>Loading YouTube Unchained Dashboard...</span>
      </div>
    );
  }

  const activePreset = StorageManager.getActivePreset(settings);

  // Search items definition for global search
  const searchableItems = [
    {
      category: 'General',
      sectionId: 'sec-general',
      title: 'Master Customization Switch',
      description: 'Global master toggle to enable or bypass all YouTube Unchained rules and enhancements.',
      control: (
        <Toggle
          size="md"
          checked={settings.masterEnabled}
          onChange={(val) => saveSettings({ ...settings, masterEnabled: val })}
          ariaLabel="Master Customization Switch"
        />
      ),
    },
    {
      category: 'Visibility',
      sectionId: 'sec-visibility',
      title: 'Disable Ambient Lighting & Glow',
      description: 'Strips the ambient video canvas glow and cinematics backlight behind the player on dark mode.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideAmbientLighting}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideAmbientLighting = val;
            })
          }
          ariaLabel="Disable Ambient Lighting & Glow"
        />
      ),
    },
    {
      category: 'Visibility',
      sectionId: 'sec-visibility',
      title: 'Auto-Expand Video Description',
      description: 'Automatically expands the collapsed video description box on watch pages without having to click "...more".',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.autoExpandDescription}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.autoExpandDescription = val;
            })
          }
          ariaLabel="Auto-Expand Video Description"
        />
      ),
    },
    {
      category: 'Visibility',
      sectionId: 'sec-visibility',
      title: 'Hide Notification Bell',
      description: 'Hides topbar notification bell to eliminate attention interruptions.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideNotificationBell}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideNotificationBell = val;
            })
          }
          ariaLabel="Hide Notification Bell"
        />
      ),
    },
    {
      category: 'Visibility',
      sectionId: 'sec-visibility',
      title: 'Hide Voice Search Button',
      description: 'Hides microphone button in the top search bar.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideVoiceSearchButton}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideVoiceSearchButton = val;
            })
          }
          ariaLabel="Hide Voice Search Button"
        />
      ),
    },
    {
      category: 'Visibility',
      sectionId: 'sec-visibility',
      title: 'Hide Header Create Buttons',
      description: 'Hides Create (+) and extra upload buttons in the YouTube masthead.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideHeaderButtons}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideHeaderButtons = val;
            })
          }
          ariaLabel="Hide Header Create Buttons"
        />
      ),
    },
    {
      category: 'Visibility',
      sectionId: 'sec-visibility',
      title: 'Hide Left Sidebar Secondary Sections',
      description: 'Hides Explore & More From YouTube sections in the left guide.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideSidebarSections}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideSidebarSections = val;
            })
          }
          ariaLabel="Hide Left Sidebar Secondary Sections"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Shorts Everywhere',
      description: 'Removes Shorts from sidebar navigation, homepage shelves, and recommendations.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideShortsNavAndShelves}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideShortsNavAndShelves = val;
            })
          }
          ariaLabel="Hide Shorts Everywhere"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Homepage Recommendations Feed',
      description: 'Suppresses the algorithmic video grid and shelves on the homepage browse feed.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideHomeRecommendations}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideHomeRecommendations = val;
            })
          }
          ariaLabel="Hide Homepage Recommendations Feed"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Watch Page Related Videos',
      description: 'Removes the right-hand column and end recommendations on video pages.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideWatchRelatedVideos}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideWatchRelatedVideos = val;
            })
          }
          ariaLabel="Hide Watch Page Related Videos"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Comments Section',
      description: 'Eliminates comments below videos and live stream replays.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideComments}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideComments = val;
            })
          }
          ariaLabel="Hide Comments Section"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Live Chat Stream',
      description: 'Completely removes the real-time live chat dock on premieres and streams.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideLiveChat}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideLiveChat = val;
            })
          }
          ariaLabel="Hide Live Chat Stream"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Video End Screens & Hover Cards',
      description: 'Hides end cards and pop-up teasers covering the end of video playback.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideEndCardsAndOverlays}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideEndCardsAndOverlays = val;
            })
          }
          ariaLabel="Hide Video End Screens & Hover Cards"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Merchandise & Shopping Modules',
      description: 'Removes product carousels, ticket shelves, and shopping drawers.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideMerchAndShopping}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideMerchAndShopping = val;
            })
          }
          ariaLabel="Hide Merchandise & Shopping Modules"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Gaming & Playables Promotions',
      description: 'Hides YouTube Playables shelves and gaming promo banners.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideGamingAndPlayables}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideGamingAndPlayables = val;
            })
          }
          ariaLabel="Hide Gaming & Playables Promotions"
        />
      ),
    },
    {
      category: 'Shorts & Feeds',
      sectionId: 'sec-shorts',
      title: 'Hide Community Posts',
      description: 'Hides backstage community posts and text updates from feeds.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.visibility.hideCommunityPosts}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideCommunityPosts = val;
            })
          }
          ariaLabel="Hide Community Posts"
        />
      ),
    },
    {
      category: 'Filters',
      sectionId: 'sec-filters',
      title: 'Clean Search Results (Anti-Shelf)',
      description: 'Strips "People also watched", "For you", and related algorithmic shelves on search pages.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.filters.cleanSearchResults}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.filters.cleanSearchResults = val;
            })
          }
          ariaLabel="Clean Search Results"
        />
      ),
    },
    {
      category: 'Filters',
      sectionId: 'sec-filters',
      title: 'Hide Watched Videos',
      description: 'Hides or dims videos that have an active red progress bar in watch history.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.filters.hideWatched}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.filters.hideWatched = val;
            })
          }
          ariaLabel="Hide Watched Videos"
        />
      ),
    },
    {
      category: 'Video Player',
      sectionId: 'sec-player',
      title: 'Enforce Playback Speed',
      description: 'Strictly enforce default speed on every video and prevent YouTube from resetting it.',
      control: (
        <Toggle
          size="md"
          checked={Boolean(activePreset.layout.enforcePlaybackSpeed)}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.layout.enforcePlaybackSpeed = val;
            })
          }
          ariaLabel="Enforce Playback Speed"
        />
      ),
    },
    {
      category: 'Controls & Density',
      sectionId: 'sec-controls',
      title: 'Mouse Wheel Volume Control',
      description: 'Scroll up/down with mouse wheel over the video player to adjust volume seamlessly.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.layout.mouseWheelVolume}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.layout.mouseWheelVolume = val;
            })
          }
          ariaLabel="Mouse Wheel Volume Control"
        />
      ),
    },
    {
      category: 'Controls & Density',
      sectionId: 'sec-controls',
      title: 'Compact Spacing',
      description: 'Reduces grid margins and thumbnail paddings to display more items per screen.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.layout.compactSpacing}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.layout.compactSpacing = val;
            })
          }
          ariaLabel="Compact Spacing"
        />
      ),
    },
    {
      category: 'Controls & Density',
      sectionId: 'sec-controls',
      title: 'Hide Left Sidebar by Default',
      description: 'Collapses the left navigation guide to expand video viewing width.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.layout.hideSidebarByDefault}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.layout.hideSidebarByDefault = val;
            })
          }
          ariaLabel="Hide Left Sidebar by Default"
        />
      ),
    },
    {
      category: 'Controls & Density',
      sectionId: 'sec-controls',
      title: 'Distraction-Free Viewing Mode',
      description: 'Centers the player on watch page, hides sidebars, comments, and recommendations.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.layout.distractionFreeMode}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.layout.distractionFreeMode = val;
            })
          }
          ariaLabel="Distraction-Free Viewing Mode"
        />
      ),
    },
    {
      category: 'Controls & Density',
      sectionId: 'sec-controls',
      title: 'Clean Minimal Player Controls',
      description: 'Dims secondary player buttons (miniplayer, theater size, subtitles) until hovered.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.layout.cleanPlayerControls}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.layout.cleanPlayerControls = val;
            })
          }
          ariaLabel="Clean Minimal Player Controls"
        />
      ),
    },
    {
      category: 'Ad Blocking',
      sectionId: 'sec-ads',
      title: 'Hide Interface Advertisements',
      description: 'Declaratively hides promoted video cards, home banner ads, search result ads, and shopping shelves.',
      control: (
        <Toggle
          size="md"
          checked={Boolean(activePreset.visibility.hideInterfaceAds)}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.hideInterfaceAds = val;
            })
          }
          ariaLabel="Hide Interface Advertisements"
        />
      ),
    },
    {
      category: 'Ad Blocking',
      sectionId: 'sec-ads',
      title: 'Block Video Player Ads',
      description: 'Automatically clicks Skip Ad buttons, fast-forwards ads at 16x speed, and mutes ad audio.',
      control: (
        <Toggle
          size="md"
          checked={Boolean(activePreset.visibility.blockPlayerAds)}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.visibility.blockPlayerAds = val;
            })
          }
          ariaLabel="Block Video Player Ads"
        />
      ),
    },
    {
      category: 'Appearance',
      sectionId: 'sec-appearance',
      title: 'OLED Pure Black Mode',
      description: 'Forces true pure black (#000000) backgrounds across the entire YouTube interface.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.theme.oledBlackMode}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.theme.oledBlackMode = val;
            })
          }
          ariaLabel="OLED Pure Black Mode"
        />
      ),
    },
    {
      category: 'Appearance',
      sectionId: 'sec-appearance',
      title: 'Reduced Motion',
      description: 'Disables smooth animations and fast transitions across YouTube.',
      control: (
        <Toggle
          size="md"
          checked={activePreset.theme.reducedMotion}
          onChange={(val) =>
            updateActivePreset((p) => {
              p.theme.reducedMotion = val;
            })
          }
          ariaLabel="Reduced Motion"
        />
      ),
    },
  ];

  const filteredSearchItems = searchQuery.trim()
    ? searchableItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  return (
    <div className="dashboard-layout">
      {/* Sticky Left Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-title">YouTube Unchained</span>
          </div>
          <span className="version-tag">v1.0.0</span>
        </div>

        <nav className="sidebar-nav">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => scrollToSection(sec.id)}
                title={sec.label}
              >
                <Icon size={15} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-meta">
            <span className="footer-status-dot"></span>
            <span>Manifest V3 • Local Storage</span>
          </div>
          <span className="footer-subtext">Zero external network requests</span>
        </div>
      </aside>

      {/* Main Single-Page Content Area */}
      <main className="main-content">
        {statusMessage && (
          <div className="toast-notification">
            <Check size={14} /> <span>{statusMessage}</span>
          </div>
        )}

        {/* Global Dashboard Sticky Header with Search & Quick Controls */}
        <header className="dashboard-global-header">
          <div className="search-box global-search">
            <Search className="search-icon" size={14} />
            <input
              type="text"
              className="input-text"
              placeholder="Search all settings (e.g. ambient, speed, ads, watched, shorts, volume)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="header-quick-actions">
            <div className="header-preset-badge">
              <span className="header-label">Profile:</span>
              <select
                className="preset-select-compact"
                value={settings.activePresetId}
                onChange={(e) => {
                  StorageManager.switchPreset(e.target.value).then(setSettings);
                  showStatus('Profile switched');
                }}
              >
                {settings.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="header-master-toggle">
              <span className="header-label">Master:</span>
              <Toggle
                size="sm"
                checked={settings.masterEnabled}
                onChange={(val) => saveSettings({ ...settings, masterEnabled: val })}
                ariaLabel="Global master switch"
              />
            </div>
          </div>
        </header>

        {/* Global Search Results View when query is active */}
        {searchQuery.trim().length > 0 && (
          <div className="search-results-banner">
            <div className="content-header">
              <div>
                <h1 className="page-title">Search Results</h1>
                <p className="page-subtitle">
                  Showing settings matching &ldquo;{searchQuery}&rdquo; ({filteredSearchItems.length} found)
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            </div>

            <div className="card">
              {filteredSearchItems.length === 0 ? (
                <p className="card-description" style={{ padding: '16px 0', textAlign: 'center' }}>
                  No settings found matching &ldquo;{searchQuery}&rdquo;. Try searching for &ldquo;ambient&rdquo;, &ldquo;speed&rdquo;, &ldquo;ads&rdquo;, &ldquo;volume&rdquo;, or &ldquo;shorts&rdquo;.
                </p>
              ) : (
                filteredSearchItems.map((item, idx) => (
                  <div key={idx} className="toggle-row">
                    <div className="toggle-info">
                      <h4>
                        <span className="category-badge">{item.category}</span>
                        {item.title}
                      </h4>
                      <p>{item.description}</p>
                    </div>
                    {item.control}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: GENERAL & MASTER CONTROLS */}
        <section id="sec-general" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Shield size={16} className="section-icon" />
              <h2 className="section-title">General & Master Controls</h2>
            </div>
            <span className="section-tag">Core Engine</span>
          </div>

          <div className="settings-grid">
            {/* Master Switch Card */}
            <div className="card">
              <div className="master-card-inner">
                <div>
                  <h3 className="card-title">
                    <Shield size={18} color={settings.masterEnabled ? 'var(--success)' : 'var(--text-muted)'} />
                    Master Customization Switch
                  </h3>
                  <p className="card-description">
                    {settings.masterEnabled
                      ? 'YouTube Unchained is actively applying visibility, layout, and filter rules.'
                      : 'Extension is disabled. YouTube interface runs in native unmodified state.'}
                  </p>
                </div>
                <Toggle
                  size="md"
                  checked={settings.masterEnabled}
                  onChange={(val) => saveSettings({ ...settings, masterEnabled: val })}
                  ariaLabel="Master Customization Switch"
                />
              </div>
            </div>

            {/* Active Preset Summary */}
            <div className="card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Active Profile: {activePreset.name}</h3>
                  <p className="card-description">{activePreset.description}</p>
                </div>
                <span className="badge-pill">{activePreset.isBuiltin ? 'Built-in' : 'Custom'}</span>
              </div>
              <div className="preset-button-row">
                {settings.presets.map((p) => (
                  <button
                    key={p.id}
                    className={`btn ${p.id === settings.activePresetId ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      StorageManager.switchPreset(p.id).then(setSettings);
                      showStatus(`Switched to preset "${p.name}"`);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTERFACE & SHELL */}
        <section id="sec-visibility" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Eye size={16} className="section-icon" />
              <h2 className="section-title">YouTube Interface & Shell</h2>
            </div>
            <span className="section-tag">UI Elements</span>
          </div>

          <div className="settings-grid">
            {/* Atmosphere & Player Shell */}
            <div className="card">
              <h3 className="card-title">Atmosphere & Player Shell</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Disable Ambient Lighting & Glow</h4>
                  <p>Strips the ambient video canvas glow and cinematics backlight behind the player on dark mode.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideAmbientLighting}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideAmbientLighting = val;
                    })
                  }
                  ariaLabel="Disable Ambient Lighting & Glow"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Auto-Expand Video Description</h4>
                  <p>Automatically expands the collapsed video description box on watch pages without having to click "...more".</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.autoExpandDescription}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.autoExpandDescription = val;
                    })
                  }
                  ariaLabel="Auto-Expand Video Description"
                />
              </div>
            </div>

            {/* Navigation & Header Controls */}
            <div className="card">
              <h3 className="card-title">Header & Navigation Buttons</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Notification Bell</h4>
                  <p>Hides topbar notification bell to eliminate attention interruptions.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideNotificationBell}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideNotificationBell = val;
                    })
                  }
                  ariaLabel="Hide Notification Bell"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Voice Search Button</h4>
                  <p>Hides microphone button in the top search bar.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideVoiceSearchButton}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideVoiceSearchButton = val;
                    })
                  }
                  ariaLabel="Hide Voice Search Button"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Header Create (+) Buttons</h4>
                  <p>Hides Create (+) and extra upload buttons in the YouTube masthead.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideHeaderButtons}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideHeaderButtons = val;
                    })
                  }
                  ariaLabel="Hide Header Create Buttons"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Explore & More Guide Sections</h4>
                  <p>Hides secondary Explore and More From YouTube sections in the left guide.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideSidebarSections}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideSidebarSections = val;
                    })
                  }
                  ariaLabel="Hide Left Sidebar Secondary Sections"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: SHORTS & RECOMMENDATIONS */}
        <section id="sec-shorts" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Compass size={16} className="section-icon" />
              <h2 className="section-title">Shorts, Feeds & Recommendations</h2>
            </div>
            <span className="section-tag">Distraction Reduction</span>
          </div>

          <div className="settings-grid">
            {/* Feeds & Shorts */}
            <div className="card">
              <h3 className="card-title">Shorts & Feed Shelves</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Shorts Everywhere</h4>
                  <p>Removes Shorts from sidebar navigation, homepage shelves, and recommendations.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideShortsNavAndShelves}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideShortsNavAndShelves = val;
                    })
                  }
                  ariaLabel="Hide Shorts Everywhere"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Homepage Recommendations Feed</h4>
                  <p>Suppresses the algorithmic video grid and shelves on the homepage browse feed.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideHomeRecommendations}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideHomeRecommendations = val;
                    })
                  }
                  ariaLabel="Hide Homepage Recommendations Feed"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Watch Page Related Videos</h4>
                  <p>Removes the right-hand column and end recommendations on video pages.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideWatchRelatedVideos}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideWatchRelatedVideos = val;
                    })
                  }
                  ariaLabel="Hide Watch Page Related Videos"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Community Backstage Posts</h4>
                  <p>Hides backstage community posts and text updates from feeds.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideCommunityPosts}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideCommunityPosts = val;
                    })
                  }
                  ariaLabel="Hide Community Posts"
                />
              </div>
            </div>

            {/* Social & Clutter */}
            <div className="card">
              <h3 className="card-title">Social Interaction & Clutter</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Comments Section</h4>
                  <p>Eliminates comments below videos and live stream replays.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideComments}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideComments = val;
                    })
                  }
                  ariaLabel="Hide Comments Section"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Live Chat Stream</h4>
                  <p>Completely removes the real-time live chat dock on premieres and streams.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideLiveChat}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideLiveChat = val;
                    })
                  }
                  ariaLabel="Hide Live Chat Stream"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Video End Screens & Hover Cards</h4>
                  <p>Hides end cards and pop-up teasers covering the end of video playback.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideEndCardsAndOverlays}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideEndCardsAndOverlays = val;
                    })
                  }
                  ariaLabel="Hide Video End Screens & Hover Cards"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Merchandise & Shopping Modules</h4>
                  <p>Removes product carousels, ticket shelves, and shopping drawers.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideMerchAndShopping}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideMerchAndShopping = val;
                    })
                  }
                  ariaLabel="Hide Merchandise & Shopping Modules"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Gaming & Playables Promotions</h4>
                  <p>Hides YouTube Playables shelves and gaming promo banners.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.visibility.hideGamingAndPlayables}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideGamingAndPlayables = val;
                    })
                  }
                  ariaLabel="Hide Gaming & Playables Promotions"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: CONTENT FILTERS & WATCHED BEHAVIOR */}
        <section id="sec-filters" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Filter size={16} className="section-icon" />
              <h2 className="section-title">Content Filters & Watched Behavior</h2>
            </div>
            <span className="section-tag">Algorithmic Sanitation</span>
          </div>

          <div className="settings-grid">
            {/* Feed Sanitization & Watched Mode */}
            <div className="card">
              <h3 className="card-title">Feed Sanitization & Watched Videos</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Clean Search Results (Anti-Shelf)</h4>
                  <p>Strips "People also watched", "For you", and related algorithmic shelves on search pages.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.filters.cleanSearchResults}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.filters.cleanSearchResults = val;
                    })
                  }
                  ariaLabel="Clean Search Results"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Watched Videos</h4>
                  <p>Filters videos that have an active red progress bar in watch history.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.filters.hideWatched}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.filters.hideWatched = val;
                    })
                  }
                  ariaLabel="Hide Watched Videos"
                />
              </div>

              <div className="display-mode-box">
                <span className="input-label">Watched Video Display Mode</span>
                <p className="card-description" style={{ marginBottom: '8px' }}>
                  Choose whether watched videos are completely hidden from the feed layout or dimmed at 35% opacity with grayscale so row alignment is preserved.
                </p>
                <div className="pill-group">
                  {[
                    { label: 'Hide from feed (DOM removal)', val: 'hide' as const },
                    { label: 'Dim with grayscale (Keep grid intact)', val: 'dim' as const },
                  ].map((mode) => (
                    <button
                      key={mode.label}
                      className={`pill-btn ${activePreset.filters.watchedDisplayMode === mode.val ? 'active' : ''}`}
                      onClick={() =>
                        updateActivePreset((p) => {
                          p.filters.watchedDisplayMode = mode.val;
                        })
                      }
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Duration Filters */}
            <div className="card">
              <h3 className="card-title">Duration Thresholds</h3>
              <p className="card-description">Hide videos that are shorter or longer than desired bounds.</p>
              <div className="filter-inputs-row">
                <div className="input-group">
                  <label className="input-label">Min Duration (seconds, 0 = off)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-text"
                    value={minDurationInput}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setMinDurationInput(v);
                      updateActivePreset((p) => {
                        p.filters.duration.minDurationSeconds = v;
                        p.filters.duration.enabled = v > 0 || (p.filters.duration.maxDurationSeconds > 0);
                      });
                    }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Max Duration (seconds, 0 = off)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-text"
                    value={maxDurationInput}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0);
                      setMaxDurationInput(v);
                      updateActivePreset((p) => {
                        p.filters.duration.maxDurationSeconds = v;
                        p.filters.duration.enabled = (p.filters.duration.minDurationSeconds > 0) || v > 0;
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Blocked Channels Card */}
          <div className="card" style={{ marginTop: '16px' }}>
            <h3 className="card-title">Blocked Channels ({activePreset.filters.channels.length})</h3>
            <p className="card-description">Videos from these channels will be hidden from all feeds.</p>

            <form
              className="form-row"
              onSubmit={(e) => {
                e.preventDefault();
                const raw = newChannelName.trim();
                if (!raw) return;
                // Strip URL prefixes and query params for clean display
                let clean = raw.replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, '');
                clean = clean.replace(/[?#].*$/, '').replace(/\/+$/, '');
                if (clean.startsWith('c/') || clean.startsWith('user/')) {
                  clean = clean.replace(/^(c|user)\//, '');
                }
                const rule: ChannelFilterRule = {
                  id: `chan-${Date.now()}`,
                  channelName: clean || raw,
                  matchType: newChannelMatch,
                  enabled: true,
                };
                updateActivePreset((p) => {
                  p.filters.channels.push(rule);
                });
                setNewChannelName('');
              }}
            >
              <input
                type="text"
                className="input-text flex-1"
                placeholder="Channel name, @handle, or URL (e.g. @veritasium, MrBeast)..."
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
              <select
                className="select-input"
                value={newChannelMatch}
                onChange={(e) => setNewChannelMatch(e.target.value as any)}
              >
                <option value="contains">Contains Substring</option>
                <option value="exact">Exact Match</option>
              </select>
              <button type="submit" className="btn btn-primary">
                <Plus size={14} /> Add Channel
              </button>
            </form>

            {activePreset.filters.channels.length === 0 ? (
              <p className="empty-notice">No blocked channels in this profile.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Channel Name</th>
                      <th>Match Type</th>
                      <th>Status</th>
                      <th className="th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePreset.filters.channels.map((chan) => (
                      <tr key={chan.id}>
                        <td className="font-semibold">{chan.channelName}</td>
                        <td>
                          <span className="type-badge">{chan.matchType}</span>
                        </td>
                        <td>
                          <Toggle
                            size="sm"
                            checked={chan.enabled}
                            onChange={(val) =>
                              updateActivePreset((p) => {
                                const c = p.filters.channels.find((x) => x.id === chan.id);
                                if (c) c.enabled = val;
                              })
                            }
                            ariaLabel={`Toggle filter for ${chan.channelName}`}
                          />
                        </td>
                        <td>
                          <button
                            className="btn-icon-danger"
                            title="Delete rule"
                            onClick={() =>
                              updateActivePreset((p) => {
                                p.filters.channels = p.filters.channels.filter((x) => x.id !== chan.id);
                              })
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Title Keyword Filters Card */}
          <div className="card" style={{ marginTop: '16px' }}>
            <h3 className="card-title">Title Keyword Filters ({activePreset.filters.keywords.length})</h3>
            <p className="card-description">Hide videos whose titles match these keywords or regular expressions.</p>

            <form
              className="form-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newKeywordPattern.trim()) return;
                const rule: KeywordFilterRule = {
                  id: `kw-${Date.now()}`,
                  pattern: newKeywordPattern.trim(),
                  isRegex: newKeywordIsRegex,
                  caseSensitive: false,
                  enabled: true,
                };
                updateActivePreset((p) => {
                  p.filters.keywords.push(rule);
                });
                setNewKeywordPattern('');
              }}
            >
              <input
                type="text"
                className="input-text flex-1"
                placeholder="Keyword or regex pattern (e.g. clickbait, reaction, spoiler)..."
                value={newKeywordPattern}
                onChange={(e) => setNewKeywordPattern(e.target.value)}
              />
              <Toggle
                size="sm"
                label="Regex"
                checked={newKeywordIsRegex}
                onChange={setNewKeywordIsRegex}
                ariaLabel="Toggle Regex mode for keyword"
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={14} /> Add Keyword
              </button>
            </form>

            {activePreset.filters.keywords.length === 0 ? (
              <p className="empty-notice">No keywords filtered yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pattern</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePreset.filters.keywords.map((kw) => (
                      <tr key={kw.id}>
                        <td className="font-mono">{kw.pattern}</td>
                        <td>
                          <span className="type-badge">{kw.isRegex ? 'Regex' : 'Text'}</span>
                        </td>
                        <td>
                          <Toggle
                            size="sm"
                            checked={kw.enabled}
                            onChange={(val) =>
                              updateActivePreset((p) => {
                                const k = p.filters.keywords.find((x) => x.id === kw.id);
                                if (k) k.enabled = val;
                              })
                            }
                            ariaLabel={`Toggle filter for keyword ${kw.pattern}`}
                          />
                        </td>
                        <td>
                          <button
                            className="btn-icon-danger"
                            title="Delete rule"
                            onClick={() =>
                              updateActivePreset((p) => {
                                p.filters.keywords = p.filters.keywords.filter((x) => x.id !== kw.id);
                              })
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 5: VIDEO PLAYER CONTROLS */}
        <section id="sec-player" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <PlayCircle size={16} className="section-icon" />
              <h2 className="section-title">Video Player Controls</h2>
            </div>
            <span className="section-tag">Player Ergonomics</span>
          </div>

          <div className="card">
            <h3 className="card-title">In-Player Playback Speed Controller</h3>
            <p className="card-description">
              Playback speed is controlled directly inside the YouTube video player via the dedicated speed button on the control bar. Click the speed button (e.g. 1.0×) in any video to open the interactive slider and adjust speed from 0.1× to 16.0× in real time.
            </p>

            <div className="toggle-row" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div className="toggle-info">
                <h4>Remember & Enforce Playback Speed</h4>
                <p>
                  {activePreset.layout.enforcePlaybackSpeed
                    ? 'Strict enforcement active: Automatically applies your chosen speed when opening new videos and prevents YouTube from resetting it.'
                    : 'Standard mode: Remembers your selected speed for new videos while respecting manual changes during playback.'}
                </p>
              </div>
              <Toggle
                size="md"
                checked={Boolean(activePreset.layout.enforcePlaybackSpeed)}
                onChange={(val) =>
                  updateActivePreset((p) => {
                    p.layout.enforcePlaybackSpeed = val;
                  })
                }
                ariaLabel="Remember & enforce playback speed"
              />
            </div>
          </div>
        </section>

        {/* SECTION 6: CONTROLS, VOLUME & DENSITY */}
        <section id="sec-controls" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Sliders size={16} className="section-icon" />
              <h2 className="section-title">Controls, Volume & Density</h2>
            </div>
            <span className="section-tag">Ergonomics & Layout</span>
          </div>

          <div className="settings-grid">
            {/* Player Controls & Ergonomics */}
            <div className="card">
              <h3 className="card-title">Player Ergonomics & Controls</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Mouse Wheel Volume Control</h4>
                  <p>Scroll up/down with mouse wheel directly over the video player to adjust volume seamlessly in 5% increments.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.layout.mouseWheelVolume}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.layout.mouseWheelVolume = val;
                    })
                  }
                  ariaLabel="Mouse Wheel Volume Control"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Clean Minimal Player Controls</h4>
                  <p>Dims secondary player buttons (miniplayer, theater size, subtitles) until hovered.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.layout.cleanPlayerControls}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.layout.cleanPlayerControls = val;
                    })
                  }
                  ariaLabel="Clean Minimal Player Controls"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Distraction-Free Viewing Mode</h4>
                  <p>Centers the player on watch page, hides sidebars, comments, and recommendations.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.layout.distractionFreeMode}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.layout.distractionFreeMode = val;
                    })
                  }
                  ariaLabel="Distraction-Free Viewing Mode"
                />
              </div>
            </div>

            {/* Layout Density & Grid Columns */}
            <div className="card">
              <h3 className="card-title">Feed Density & Video Grid</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Compact Spacing</h4>
                  <p>Reduces grid margins and thumbnail paddings to display more items per screen.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.layout.compactSpacing}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.layout.compactSpacing = val;
                    })
                  }
                  ariaLabel="Compact Spacing"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Hide Left Sidebar by Default</h4>
                  <p>Collapses the left navigation guide to expand video viewing width.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.layout.hideSidebarByDefault}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.layout.hideSidebarByDefault = val;
                    })
                  }
                  ariaLabel="Hide Left Sidebar by Default"
                />
              </div>

              <div style={{ marginTop: '10px' }}>
                <span className="input-label">Video Grid Columns (Browse Feed)</span>
                <p className="card-description" style={{ marginBottom: '8px' }}>Override items per row on browse pages.</p>
                <div className="pill-group">
                  {[
                    { label: 'Default', val: 0 },
                    { label: '2 Cols', val: 2 },
                    { label: '3 Cols', val: 3 },
                    { label: '4 Cols', val: 4 },
                    { label: '5 Cols', val: 5 },
                    { label: '6 Cols', val: 6 },
                  ].map((col) => (
                    <button
                      key={col.label}
                      className={`pill-btn ${activePreset.layout.videoGridColumns === col.val ? 'active' : ''}`}
                      onClick={() =>
                        updateActivePreset((p) => {
                          p.layout.videoGridColumns = col.val;
                        })
                      }
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: AD BLOCKING & SPONSORED ELEMENTS */}
        <section id="sec-ads" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <ShieldAlert size={16} className="section-icon text-accent" />
              <h2 className="section-title">Ad Blocking & Sponsored Elements</h2>
            </div>
            <span className="section-tag">Layered Protection</span>
          </div>

          <div className="settings-grid">
            {/* Layer 1: Interface Ads */}
            <div className="card">
              <div className="card-header-flex">
                <h3 className="card-title">Layer 1: Interface Advertisements</h3>
                <span className="badge-pill">CSS Injected</span>
              </div>
              <p className="card-description">
                Declaratively hides interface ad elements at document_start before the page renders, eliminating visual flashes and layout shifting.
              </p>

              <div className="toggle-row" style={{ marginTop: '12px' }}>
                <div className="toggle-info">
                  <h4>Hide Interface Ads & Sponsored Slots</h4>
                  <p>Hides sponsored cards, homepage banner ads, search result ads, promoted channels, and merch shelves.</p>
                </div>
                <Toggle
                  size="md"
                  checked={Boolean(activePreset.visibility.hideInterfaceAds)}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.hideInterfaceAds = val;
                    })
                  }
                  ariaLabel="Hide Interface Advertisements"
                />
              </div>

              <div className="ad-detail-list">
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Home feed banner promotions & masthead ads</span>
                </div>
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Sponsored cards & in-feed ad layout renderers</span>
                </div>
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Search results promoted video ads</span>
                </div>
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Merchandise shelves & tickets carousels</span>
                </div>
              </div>
            </div>

            {/* Layer 2: Player Ads */}
            <div className="card">
              <div className="card-header-flex">
                <h3 className="card-title">Layer 2: Video Player Ads</h3>
                <span className="badge-pill">Dynamic Engine</span>
              </div>
              <p className="card-description">
                Dynamic DOM observer on the HTML5 video element that handles skippable and unskippable player video ads.
              </p>

              <div className="toggle-row" style={{ marginTop: '12px' }}>
                <div className="toggle-info">
                  <h4>Block Video Player Ads (Auto-Skip & Fast-Forward)</h4>
                  <p>Instantly clicks &ldquo;Skip Ad&rdquo; buttons, accelerates ad playback to 16.0x, and mutes ad audio until main video resumes.</p>
                </div>
                <Toggle
                  size="md"
                  checked={Boolean(activePreset.visibility.blockPlayerAds)}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.visibility.blockPlayerAds = val;
                    })
                  }
                  ariaLabel="Block Video Player Ads"
                />
              </div>

              <div className="ad-detail-list">
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Auto-clicks &ldquo;Skip Ad&rdquo; immediately when enabled</span>
                </div>
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Fast-forwards unskippable ads to completion at 16x speed</span>
                </div>
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Automatically mutes audio during ads and restores your volume</span>
                </div>
                <div className="ad-detail-item">
                  <Check size={12} className="ad-detail-check" />
                  <span>Restores your chosen playback speed when main content begins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Architectural Boundary Note */}
          <div className="audio-notice-callout" style={{ marginTop: '14px' }}>
            <Info size={14} className="audio-notice-icon" />
            <p>
              <b>Offline Privacy Architecture Note:</b> YouTube Unchained enforces a strict local offline boundary with zero external network requests.
              Interface ad hiding (Layer 1) and HTML5 player ad acceleration (Layer 2) operate entirely client-side.
              In-video creator sponsorship skipping (SponsorBlock-style) requires continuous third-party cloud database requests to external servers, which is intentionally excluded to preserve 100% offline local privacy.
            </p>
          </div>
        </section>

        {/* SECTION 8: APPEARANCE & THEMES */}
        <section id="sec-appearance" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Palette size={16} className="section-icon" />
              <h2 className="section-title">Appearance & Themes</h2>
            </div>
            <span className="section-tag">Aesthetics</span>
          </div>

          <div className="settings-grid">
            {/* Accent Color */}
            <div className="card">
              <h3 className="card-title">Custom Accent Color</h3>
              <p className="card-description">
                Overrides YouTube&rsquo;s standard red playback progress scrubber and call-to-action buttons.
              </p>
              <div className="swatch-row">
                {[
                  { name: 'YouTube Red', color: '', hex: '#ff0000' },
                  { name: 'Sky Cyan', color: '#0284c7', hex: '#0284c7' },
                  { name: 'Electric Violet', color: '#8b5cf6', hex: '#8b5cf6' },
                  { name: 'Emerald', color: '#10b981', hex: '#10b981' },
                  { name: 'Amber', color: '#f59e0b', hex: '#f59e0b' },
                  { name: 'Rose', color: '#f43f5e', hex: '#f43f5e' },
                ].map((swatch) => (
                  <button
                    key={swatch.name}
                    className={`swatch-btn ${
                      activePreset.theme.customAccentColor === swatch.color ? 'active' : ''
                    }`}
                    onClick={() =>
                      updateActivePreset((p) => {
                        p.theme.customAccentColor = swatch.color;
                      })
                    }
                  >
                    <span className="swatch-dot" style={{ backgroundColor: swatch.hex }}></span>
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Display & Motion */}
            <div className="card">
              <h3 className="card-title">Display & Motion Settings</h3>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>OLED Deep Black Mode</h4>
                  <p>Forces background to pure #000000 for OLED energy savings and true blacks.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.theme.oledBlackMode}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.theme.oledBlackMode = val;
                    })
                  }
                  ariaLabel="OLED Deep Black Mode"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <h4>Reduced Motion Mode</h4>
                  <p>Disables heavy animations and transition lags across the interface.</p>
                </div>
                <Toggle
                  size="md"
                  checked={activePreset.theme.reducedMotion}
                  onChange={(val) =>
                    updateActivePreset((p) => {
                      p.theme.reducedMotion = val;
                    })
                  }
                  ariaLabel="Reduced Motion Mode"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: CUSTOM CSS RULES & ELEMENT PICKER */}
        <section id="sec-custom-rules" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <FileCode size={16} className="section-icon" />
              <h2 className="section-title">Custom CSS Rules & Element Picker</h2>
            </div>
            <span className="section-tag">Granular DOM Overrides</span>
          </div>

          <div className="card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Point-and-Click Visual Element Picker</h3>
                <p className="card-description">
                  Click any element on YouTube to inspect its selector, preview hiding it, and generate a persistent rule.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
                    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
                    if (tabs[0]?.id) {
                      await chrome.tabs.sendMessage(tabs[0].id, { type: 'ACTIVATE_ELEMENT_PICKER' });
                      showStatus('Element Picker activated on YouTube tab!');
                    } else {
                      showStatus('Please open a YouTube tab first.');
                    }
                  } else {
                    showStatus('Element picker requires browser extension runtime.');
                  }
                }}
              >
                <Crosshair size={14} /> Launch Element Picker
              </button>
            </div>
          </div>

          {/* Add Manual CSS Rule */}
          <div className="card" style={{ marginTop: '16px' }}>
            <h3 className="card-title">Add Manual CSS Rule</h3>
            <form
              className="form-row-custom"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCustomSelector.trim()) return;
                const rule: CustomRule = {
                  id: `rule-${Date.now()}`,
                  name: newCustomName.trim() || 'Custom Rule',
                  selector: newCustomSelector.trim(),
                  targetPages: ['all'],
                  action: 'hide',
                  enabled: true,
                  createdAt: Date.now(),
                };
                const updated = await StorageManager.upsertCustomRule(rule);
                setSettings({ ...updated });
                setNewCustomName('');
                setNewCustomSelector('');
                showStatus('Custom rule added');
              }}
            >
              <input
                type="text"
                className="input-text"
                placeholder="Rule name (e.g. Hide Playlist Carousel)..."
                value={newCustomName}
                onChange={(e) => setNewCustomName(e.target.value)}
              />
              <input
                type="text"
                className="input-text font-mono"
                placeholder="CSS Selector (e.g. #secondary #related)..."
                value={newCustomSelector}
                onChange={(e) => setNewCustomSelector(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={14} /> Add Rule
              </button>
            </form>
          </div>

          {/* Active Custom Rules List */}
          <div className="card" style={{ marginTop: '16px' }}>
            <h3 className="card-title">Active Custom Rules ({settings.customRules.length})</h3>

            {settings.customRules.length === 0 ? (
              <div className="empty-state-box">
                <FileCode size={32} className="empty-state-icon" />
                <p className="empty-state-title">No custom element rules yet.</p>
                <p className="empty-state-sub">
                  Use the <b>Launch Element Picker</b> button or enter a CSS selector above to target any YouTube element!
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Target Selector</th>
                      <th>Page Scope</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th className="th-action">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.customRules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="font-semibold">{rule.name}</td>
                        <td className="font-mono text-accent">{rule.selector}</td>
                        <td>
                          <span className="scope-badge">{rule.targetPages.join(', ')}</span>
                        </td>
                        <td>
                          <span className="action-badge">{rule.action}</span>
                        </td>
                        <td>
                          <Toggle
                            size="sm"
                            checked={rule.enabled}
                            onChange={(val) => handleCustomRuleToggle(rule, val)}
                            ariaLabel={`Toggle custom rule ${rule.name}`}
                          />
                        </td>
                        <td>
                          <button
                            className="btn-icon-danger"
                            title="Delete rule"
                            onClick={async () => {
                              const updated = await StorageManager.deleteCustomRule(rule.id);
                              setSettings({ ...updated });
                              showStatus('Rule deleted');
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 10: PRESETS, BACKUP, IMPORT/EXPORT & DIAGNOSTICS */}
        <section id="sec-backup" className="settings-section">
          <div className="section-header">
            <div className="section-title-group">
              <Download size={16} className="section-icon" />
              <h2 className="section-title">Presets, Backup & Diagnostics</h2>
            </div>
            <span className="section-tag">Profiles & Data</span>
          </div>

          <div className="settings-grid">
            {/* Presets List */}
            <div className="card">
              <h3 className="card-title">Profiles & Presets</h3>
              <p className="card-description">
                Switch profiles or restore factory configurations for specific viewing environments.
              </p>
              <div className="presets-list-vertical" style={{ marginTop: '12px' }}>
                {settings.presets.map((preset) => {
                  const isActive = preset.id === settings.activePresetId;
                  return (
                    <div key={preset.id} className={`preset-card-compact ${isActive ? 'active' : ''}`}>
                      <div className="preset-card-info">
                        <div className="preset-header">
                          <span className="preset-card-title">{preset.name}</span>
                          <span className="badge-pill">{preset.isBuiltin ? 'Built-in' : 'Custom'}</span>
                        </div>
                        <p className="preset-card-desc">{preset.description}</p>
                      </div>
                      <div className="preset-card-actions">
                        {!isActive ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              StorageManager.switchPreset(preset.id).then(setSettings);
                              showStatus(`Activated preset "${preset.name}"`);
                            }}
                          >
                            Activate
                          </button>
                        ) : (
                          <span className="active-profile-pill">
                            <Check size={12} /> Active
                          </span>
                        )}
                        {preset.isBuiltin && (
                          <button
                            className="btn-icon"
                            title="Reset to default"
                            onClick={async () => {
                              const updated = await StorageManager.resetActivePreset();
                              setSettings({ ...updated });
                              showStatus(`Preset "${preset.name}" reset to factory default`);
                            }}
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Backup & Import */}
            <div className="card">
              <h3 className="card-title">Export / Import Settings</h3>
              <p className="card-description">
                Backup all configuration profiles, content filters, and custom CSS rules to JSON.
              </p>

              <div style={{ marginTop: '12px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const jsonStr = StorageManager.exportToJson(settings);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `youtube-unchained-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showStatus('Configuration exported to file');
                  }}
                >
                  <Download size={14} /> Download Backup JSON
                </button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label className="input-label">Import Configuration JSON:</label>
                <textarea
                  className="input-text code-textarea"
                  placeholder='{"app": "youtube-unchained", ...}'
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setImportError(null);
                  }}
                />

                {importError && (
                  <div className="error-banner">
                    <AlertTriangle size={14} /> <span>{importError}</span>
                  </div>
                )}

                <button
                  className="btn btn-secondary"
                  style={{ marginTop: '8px' }}
                  onClick={async () => {
                    if (!importJsonText.trim()) return;
                    try {
                      const imported = StorageManager.importFromJson(importJsonText);
                      await StorageManager.save(imported);
                      setSettings(imported);
                      setImportJsonText('');
                      setImportError(null);
                      showStatus('Configuration imported successfully!');
                    } catch (e: any) {
                      setImportError(e.message || 'Failed to parse JSON.');
                    }
                  }}
                >
                  <Upload size={14} /> Validate & Apply
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostics and Factory Reset */}
          <div className="settings-grid" style={{ marginTop: '16px' }}>
            <div className="card">
              <h3 className="card-title">
                <Terminal size={16} /> System Diagnostics
              </h3>
              <div className="diagnostics-grid">
                <div className="diagnostic-item">
                  <span className="diag-key">Extension Version:</span>
                  <span className="diag-val font-mono">1.0.0 (MV3)</span>
                </div>
                <div className="diagnostic-item">
                  <span className="diag-key">Target Environments:</span>
                  <span className="diag-val">Vivaldi / Chromium</span>
                </div>
                <div className="diagnostic-item">
                  <span className="diag-key">Active Preset ID:</span>
                  <span className="diag-val font-mono">{settings.activePresetId}</span>
                </div>
                <div className="diagnostic-item">
                  <span className="diag-key">Custom Rules Landed:</span>
                  <span className="diag-val font-mono">{settings.customRules.length}</span>
                </div>
                <div className="diagnostic-item">
                  <span className="diag-key">Storage Driver:</span>
                  <span className="diag-val">chrome.storage.local</span>
                </div>
              </div>
            </div>

            <div className="card danger-card">
              <h3 className="card-title text-danger">
                <AlertTriangle size={16} /> Reset to Factory Defaults
              </h3>
              <p className="card-description">
                Wipes all custom rules and resets all presets to initial installation defaults.
              </p>
              <button
                className="btn btn-danger"
                style={{ marginTop: '12px' }}
                onClick={async () => {
                  if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                    await StorageManager.save({ ...DEFAULT_USER_SETTINGS });
                    setSettings({ ...DEFAULT_USER_SETTINGS });
                    showStatus('Reset to factory defaults.');
                  }
                }}
              >
                Reset All Settings
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
