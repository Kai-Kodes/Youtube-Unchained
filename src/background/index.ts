import { StorageManager } from '../shared/storage';

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[YouTube Unchained] Extension installed/updated:', details.reason);
  const settings = await StorageManager.load();
  updateBadge(settings.masterEnabled);

  // Setup context menu item safely removing any prior registration
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'yt-unchained-pick-element',
      title: 'Customize this element (YouTube Unchained)',
      contexts: ['page', 'frame', 'link', 'video'],
      documentUrlPatterns: ['*://*.youtube.com/*'],
    });
  });
});

chrome.runtime.onStartup?.addListener(async () => {
  const settings = await StorageManager.load();
  updateBadge(settings.masterEnabled);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'yt-unchained-pick-element' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_ELEMENT_PICKER' });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.yt_unchained_settings) {
    const newSettings = changes.yt_unchained_settings.newValue;
    if (newSettings) {
      updateBadge(newSettings.masterEnabled);
    }
  }
});

function updateBadge(enabled: boolean) {
  if (typeof chrome.action !== 'undefined') {
    if (enabled) {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#0284c7' });
    } else {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
    }
  }
}
