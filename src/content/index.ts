import { UserSettings, RuntimeMessage, PageStatus } from '../types';
import { StorageManager } from '../shared/storage';
import { StyleManager } from '../engine/StyleManager';
import { PageDetector } from '../engine/PageDetector';
import { DOMObserver } from '../engine/DOMObserver';
import { ElementPicker } from '../picker/ElementPicker';
import { PlayerManager } from '../engine/PlayerManager';

let currentSettings: UserSettings | null = null;

async function initContentScript() {
  try {
    // 1. Initial fast load of settings
    currentSettings = await StorageManager.load();

    // 2. Initial Page detection
    const initialPage = PageDetector.getPageType();

    // 3. Immediately apply stylesheet at document_start (Zero FOUC)
    StyleManager.apply(currentSettings, initialPage);

    // 4. Initialize Player ergonomics (volume wheel, speed, descriptions)
    PlayerManager.init(currentSettings);

    // 5. Hook SPA navigation
    PageDetector.init((newPage) => {
      if (currentSettings) {
        StyleManager.apply(currentSettings, newPage);
        DOMObserver.updateSettings(currentSettings, newPage);
        PlayerManager.onPageNavigate();
      }
    });

    // 6. Initialize DOM observer when DOM is interactive/loaded
    const onDomReady = () => {
      if (currentSettings) {
        DOMObserver.init(currentSettings, PageDetector.getCurrentPage());
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }

    // 7. Listen for storage changes from Popup or Options Dashboard
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.yt_unchained_settings) {
          currentSettings = changes.yt_unchained_settings.newValue;
          if (currentSettings) {
            const page = PageDetector.getCurrentPage();
            StyleManager.apply(currentSettings, page);
            DOMObserver.updateSettings(currentSettings, page);
            PlayerManager.updateSettings(currentSettings);
          }
        }
      });
    }

    // 7. Listen for messages from popup or options page
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
        if (message.type === 'ACTIVATE_ELEMENT_PICKER') {
          ElementPicker.start(
            async (newRule) => {
              if (currentSettings) {
                currentSettings = await StorageManager.upsertCustomRule(newRule);
                const page = PageDetector.getCurrentPage();
                StyleManager.apply(currentSettings, page);
              }
            },
            () => {
              // Picker cancelled
            }
          );
          sendResponse({ success: true });
        } else if (message.type === 'CANCEL_ELEMENT_PICKER') {
          ElementPicker.stop();
          sendResponse({ success: true });
        } else if (message.type === 'GET_PAGE_STATUS') {
          const status: PageStatus = {
            pageType: PageDetector.getCurrentPage(),
            pathname: PageDetector.getCurrentPathname(),
            url: window.location.href,
            rulesActiveCount: currentSettings?.masterEnabled ? 1 : 0,
            filteredCount: document.querySelectorAll('[data-yt-unchained-filtered]').length,
          };
          sendResponse(status);
        }
        return true;
      });
    }
  } catch (err) {
    console.error('[YouTube Unchained] Initialization error:', err);
  }
}

initContentScript();
