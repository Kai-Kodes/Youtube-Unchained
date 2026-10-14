import React, { useEffect, useState } from 'react';
import { UserSettings, PageStatus } from '../types';
import { StorageManager } from '../shared/storage';
import { clampPlaybackSpeed } from '../shared/defaults';
import { Toggle } from '../components/Toggle';
import { Crosshair, Sliders, Settings, CheckCircle2, XCircle } from 'lucide-react';

const POPUP_SPEED_PILLS = [1.0, 1.25, 1.5, 1.75, 2.0, 3.0];

export const Popup: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus | null>(null);
  const [isYouTubeTab, setIsYouTubeTab] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const loaded = await StorageManager.load();
        setSettings(loaded);

        if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const currentTab = tabs[0];
          if (currentTab && currentTab.url && currentTab.url.includes('youtube.com')) {
            setIsYouTubeTab(true);
            try {
              const res = await chrome.tabs.sendMessage(currentTab.id!, {
                type: 'GET_PAGE_STATUS',
              });
              if (res) {
                setPageStatus(res);
              }
            } catch {
              // Content script may still be loading or tab not ready
            }
          }
        }
      } catch (err) {
        console.error('Failed to load popup state:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMasterToggle = async () => {
    if (!settings) return;
    const previous = { ...settings };
    const nextMaster = !settings.masterEnabled;
    const updated = { ...settings, masterEnabled: nextMaster };
    setSettings(updated);
    try {
      await StorageManager.save(updated);
    } catch (err) {
      console.error('Failed to save master toggle:', err);
      setSettings(previous);
    }
  };

  const handlePresetChange = async (presetId: string) => {
    if (!settings) return;
    const previous = { ...settings };
    setSettings({ ...settings, activePresetId: presetId });
    try {
      const updated = await StorageManager.switchPreset(presetId);
      setSettings({ ...updated });
    } catch (err) {
      console.error('Failed to switch preset:', err);
      setSettings(previous);
    }
  };

  const toggleVisibilitySetting = async (key: keyof UserSettings['presets'][0]['visibility']) => {
    if (!settings) return;
    const previous = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const nextSettings = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const active = nextSettings.presets.find((p) => p.id === nextSettings.activePresetId);
    if (!active) return;
    active.visibility[key] = !active.visibility[key];
    setSettings(nextSettings);
    try {
      await StorageManager.updateActivePreset((p) => {
        p.visibility[key] = active.visibility[key];
      });
    } catch (err) {
      console.error('Failed to update visibility setting:', err);
      setSettings(previous);
    }
  };

  const toggleAdBlocking = async () => {
    if (!settings) return;
    const previous = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const nextSettings = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const active = nextSettings.presets.find((p) => p.id === nextSettings.activePresetId);
    if (!active) return;
    const nextVal = !(active.visibility.hideInterfaceAds || active.visibility.blockPlayerAds);
    active.visibility.hideInterfaceAds = nextVal;
    active.visibility.blockPlayerAds = nextVal;
    setSettings(nextSettings);
    try {
      await StorageManager.updateActivePreset((p) => {
        p.visibility.hideInterfaceAds = nextVal;
        p.visibility.blockPlayerAds = nextVal;
      });
    } catch (err) {
      console.error('Failed to update ad blocking:', err);
      setSettings(previous);
    }
  };

  const setPlaybackSpeed = async (speed: number) => {
    if (!settings) return;
    const clamped = clampPlaybackSpeed(speed);
    const previous = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const nextSettings = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const active = nextSettings.presets.find((p) => p.id === nextSettings.activePresetId);
    if (!active) return;
    active.layout.defaultPlaybackSpeed = clamped;
    setSettings(nextSettings);
    try {
      await StorageManager.updateActivePreset((p) => {
        p.layout.defaultPlaybackSpeed = clamped;
      });
    } catch (err) {
      console.error('Failed to update playback speed:', err);
      setSettings(previous);
    }
  };

  const toggleLayoutSetting = async (
    key: 'compactSpacing' | 'hideSidebarByDefault' | 'distractionFreeMode' | 'cleanPlayerControls'
  ) => {
    if (!settings) return;
    const previous = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const nextSettings = JSON.parse(JSON.stringify(settings)) as UserSettings;
    const active = nextSettings.presets.find((p) => p.id === nextSettings.activePresetId);
    if (!active) return;
    active.layout[key] = !active.layout[key];
    setSettings(nextSettings);
    try {
      await StorageManager.updateActivePreset((p) => {
        p.layout[key] = active.layout[key];
      });
    } catch (err) {
      console.error('Failed to update layout setting:', err);
      setSettings(previous);
    }
  };

  const handleStartPicker = async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ACTIVATE_ELEMENT_PICKER',
        });
        window.close();
      }
    }
  };

  const handleOpenOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html');
    }
  };

  if (loading || !settings) {
    return (
      <div className="popup-container">
        <div className="status-bar">Loading YouTube Unchained...</div>
      </div>
    );
  }

  const activePreset = StorageManager.getActivePreset(settings);
  const adsBlocked = Boolean(activePreset.visibility.hideInterfaceAds && activePreset.visibility.blockPlayerAds);

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="header">
        <div className="logo-group">
          <h1 className="title">YouTube Unchained</h1>
          <span className="version-pill">v1.0.0</span>
        </div>
        <button
          className="btn-icon"
          onClick={handleOpenOptions}
          title="Open Full Dashboard"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Master Enable Card */}
      <div className={`master-toggle-card ${settings.masterEnabled ? 'active' : ''}`}>
        <div className="master-info">
          <div className="master-title-row">
            {settings.masterEnabled ? (
              <CheckCircle2 size={14} className="status-icon-active" />
            ) : (
              <XCircle size={14} className="status-icon-inactive" />
            )}
            <h4>Customizations {settings.masterEnabled ? 'Active' : 'Bypassed'}</h4>
          </div>
          <p>
            {settings.masterEnabled
              ? 'Applying profile rules & element filters'
              : 'YouTube interface running unaltered'}
          </p>
        </div>
        <Toggle
          size="md"
          checked={settings.masterEnabled}
          onChange={handleMasterToggle}
          ariaLabel="Toggle master extension switch"
        />
      </div>

      {/* Active Preset Picker */}
      <div className="preset-section">
        <div className="section-label-row">
          <label className="section-label">Active Profile</label>
          <span className="preset-count">{settings.presets.length} profiles</span>
        </div>
        <div className="select-wrapper">
          <select
            className="preset-select"
            value={settings.activePresetId}
            disabled={!settings.masterEnabled}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {settings.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} {preset.isBuiltin ? '' : '(Custom)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Playback Speed */}
      <div className="preset-section">
        <div className="section-label-row">
          <label className="section-label">Playback Speed</label>
          <span className="font-mono speed-tag">
            {(activePreset.layout.defaultPlaybackSpeed ?? 1.0).toFixed(2)}x
          </span>
        </div>
        <div className="popup-speed-pills">
          {POPUP_SPEED_PILLS.map((spd) => {
            const isSel = Math.abs((activePreset.layout.defaultPlaybackSpeed ?? 1.0) - spd) < 0.01;
            return (
              <button
                key={spd}
                className={`speed-pill-btn ${isSel ? 'active' : ''}`}
                disabled={!settings.masterEnabled}
                onClick={() => setPlaybackSpeed(spd)}
              >
                {spd}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Toggles */}
      <div className="preset-section">
        <label className="section-label">Quick Feature Toggles</label>
        <div className="quick-toggles-grid">
          {/* Ad Blocking Toggle */}
          <div
            className={`quick-toggle-btn ${adsBlocked ? 'active' : ''}`}
            onClick={() => {
              if (settings.masterEnabled) {
                toggleAdBlocking();
              }
            }}
          >
            <div className="quick-toggle-meta">
              <span className="name">Ad Blocker</span>
              <span className="status">{adsBlocked ? 'Active' : 'Off'}</span>
            </div>
            <Toggle
              size="sm"
              checked={adsBlocked}
              disabled={!settings.masterEnabled}
              onChange={toggleAdBlocking}
              ariaLabel="Toggle Ad Blocking"
            />
          </div>

          {/* Ambient Lighting Toggle */}
          <div
            className={`quick-toggle-btn ${activePreset.visibility.hideAmbientLighting ? 'active' : ''}`}
            onClick={() => {
              if (settings.masterEnabled) {
                toggleVisibilitySetting('hideAmbientLighting');
              }
            }}
          >
            <div className="quick-toggle-meta">
              <span className="name">Ambient Glow</span>
              <span className="status">{activePreset.visibility.hideAmbientLighting ? 'Disabled' : 'Active'}</span>
            </div>
            <Toggle
              size="sm"
              checked={activePreset.visibility.hideAmbientLighting}
              disabled={!settings.masterEnabled}
              onChange={() => toggleVisibilitySetting('hideAmbientLighting')}
              ariaLabel="Toggle Ambient Lighting"
            />
          </div>

          {/* Shorts Toggle */}
          <div
            className={`quick-toggle-btn ${
              activePreset.visibility.hideShortsNavAndShelves ? 'active' : ''
            }`}
            onClick={() => {
              if (settings.masterEnabled) {
                toggleVisibilitySetting('hideShortsNavAndShelves');
              }
            }}
          >
            <div className="quick-toggle-meta">
              <span className="name">Shorts</span>
              <span className="status">
                {activePreset.visibility.hideShortsNavAndShelves ? 'Hidden' : 'Visible'}
              </span>
            </div>
            <Toggle
              size="sm"
              checked={activePreset.visibility.hideShortsNavAndShelves}
              disabled={!settings.masterEnabled}
              onChange={() => toggleVisibilitySetting('hideShortsNavAndShelves')}
              ariaLabel="Toggle Shorts visibility"
            />
          </div>

          {/* Comments Toggle */}
          <div
            className={`quick-toggle-btn ${activePreset.visibility.hideComments ? 'active' : ''}`}
            onClick={() => {
              if (settings.masterEnabled) {
                toggleVisibilitySetting('hideComments');
              }
            }}
          >
            <div className="quick-toggle-meta">
              <span className="name">Comments</span>
              <span className="status">
                {activePreset.visibility.hideComments ? 'Hidden' : 'Visible'}
              </span>
            </div>
            <Toggle
              size="sm"
              checked={activePreset.visibility.hideComments}
              disabled={!settings.masterEnabled}
              onChange={() => toggleVisibilitySetting('hideComments')}
              ariaLabel="Toggle Comments visibility"
            />
          </div>

          {/* Home Feed Toggle */}
          <div
            className={`quick-toggle-btn ${
              activePreset.visibility.hideHomeRecommendations ? 'active' : ''
            }`}
            onClick={() => {
              if (settings.masterEnabled) {
                toggleVisibilitySetting('hideHomeRecommendations');
              }
            }}
          >
            <div className="quick-toggle-meta">
              <span className="name">Home Feed</span>
              <span className="status">
                {activePreset.visibility.hideHomeRecommendations ? 'Hidden' : 'Visible'}
              </span>
            </div>
            <Toggle
              size="sm"
              checked={activePreset.visibility.hideHomeRecommendations}
              disabled={!settings.masterEnabled}
              onChange={() => toggleVisibilitySetting('hideHomeRecommendations')}
              ariaLabel="Toggle Home Feed visibility"
            />
          </div>

          {/* Focus Mode Toggle */}
          <div
            className={`quick-toggle-btn ${
              activePreset.layout.distractionFreeMode ? 'active' : ''
            }`}
            onClick={() => {
              if (settings.masterEnabled) {
                toggleLayoutSetting('distractionFreeMode');
              }
            }}
          >
            <div className="quick-toggle-meta">
              <span className="name">Focus Mode</span>
              <span className="status">
                {activePreset.layout.distractionFreeMode ? 'Enabled' : 'Off'}
              </span>
            </div>
            <Toggle
              size="sm"
              checked={activePreset.layout.distractionFreeMode}
              disabled={!settings.masterEnabled}
              onChange={() => toggleLayoutSetting('distractionFreeMode')}
              ariaLabel="Toggle Focus Mode"
            />
          </div>
        </div>
      </div>

      {/* Page Context Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span
            className={`status-indicator ${
              settings.masterEnabled && isYouTubeTab ? 'online' : 'offline'
            }`}
          ></span>
          <span className="status-route">
            {isYouTubeTab ? `ROUTE: ${pageStatus?.pageType?.toUpperCase() || 'YOUTUBE'}` : 'STANDBY'}
          </span>
        </div>
        {pageStatus?.filteredCount !== undefined && pageStatus.filteredCount > 0 ? (
          <span className="filtered-counter">{pageStatus.filteredCount} filtered</span>
        ) : (
          <span className="filtered-counter-zero">0 filtered</span>
        )}
      </div>

      {/* Actions */}
      <div className="actions">
        <button
          className="btn-primary"
          disabled={!settings.masterEnabled || !isYouTubeTab}
          onClick={handleStartPicker}
          title="Pick & Hide Element on Page"
        >
          <Crosshair size={13} />
          <span>Pick Element</span>
        </button>

        <button className="btn-secondary" onClick={handleOpenOptions} title="Open Settings Dashboard">
          <Sliders size={13} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};
