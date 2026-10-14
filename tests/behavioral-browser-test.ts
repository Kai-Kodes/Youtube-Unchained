import puppeteer, { Browser, Page } from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { CustomRule, UserSettings } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

// Controlled deterministic HTML fixture matching modern YouTube Web Component DOM
const MOCK_YOUTUBE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>YouTube Mock Fixture</title>
  <style>
    body { margin: 0; background: #0f0f0f; color: #fff; font-family: Roboto, Arial, sans-serif; }
    ytd-app { display: block; }
    app-drawer#guide { width: 240px; display: block; }
    ytd-page-manager { margin-left: 240px; display: block; }
    ytd-rich-grid-renderer { --ytd-rich-grid-items-per-row: 4; display: block; }
    ytd-rich-grid-row #contents { display: flex; flex-wrap: wrap; }
    ytd-rich-item-renderer { width: 300px; margin: 16px; display: block; }
    #video-title { font-size: 1.6rem; line-height: 2.2rem; }
  </style>
</head>
<body>
  <ytd-app>
    <div id="masthead-container">
      <ytd-masthead>
        <button id="voice-search-button">Voice Search</button>
        <ytd-notification-topbar-button-renderer id="notif-bell">Notifications</ytd-notification-topbar-button-renderer>
      </ytd-masthead>
    </div>

    <app-drawer id="guide">
      <div id="guide-wrapper">
        <div id="sections">
          <ytd-guide-section-renderer id="guide-sec-main">
            <ytd-guide-entry-renderer id="guide-home"><a href="/">Home</a></ytd-guide-entry-renderer>
            <ytd-guide-entry-renderer id="guide-shorts"><a href="/shorts/test-1">Shorts</a></ytd-guide-entry-renderer>
            <ytd-guide-entry-renderer id="guide-subs"><a href="/feed/subscriptions">Subscriptions</a></ytd-guide-entry-renderer>
          </ytd-guide-section-renderer>
          <ytd-guide-section-renderer id="guide-sec-library">Library</ytd-guide-section-renderer>
          <ytd-guide-section-renderer id="guide-sec-explore">Explore & Trending</ytd-guide-section-renderer>
          <ytd-guide-section-renderer id="guide-sec-more">More from YouTube</ytd-guide-section-renderer>
        </div>
      </div>
    </app-drawer>

    <ytd-page-manager id="page-manager">
      <!-- 1. Home Browse View -->
      <ytd-browse page-subtype="home" id="home-view">
        <ytd-rich-section-renderer id="shorts-shelf-container">
          <ytd-rich-shelf-renderer is-shorts id="shorts-shelf-el">Shorts Carousel</ytd-rich-shelf-renderer>
        </ytd-rich-section-renderer>
        <ytd-reel-shelf-renderer id="reel-shelf-el">Reels</ytd-reel-shelf-renderer>

        <ytd-rich-grid-renderer id="video-grid">
          <div id="contents" class="ytd-rich-grid-renderer">
            <!-- Card 1: Normal Educational Video -->
            <ytd-rich-item-renderer id="card-innocent">
              <h3 id="video-title">Learn TypeScript in 50 Minutes</h3>
              <div class="ytd-channel-name"><a href="/@ts">TypeScript Academy</a></div>
              <span class="ytd-thumbnail-overlay-time-status-renderer">50:00</span>
            </ytd-rich-item-renderer>

            <!-- Card 2: Blocked Channel Video -->
            <ytd-rich-item-renderer id="card-blocked-channel">
              <h3 id="video-title">Top 10 Wild Stunts</h3>
              <div class="ytd-channel-name"><a href="/@spam">SpamNetwork Official</a></div>
              <span class="ytd-thumbnail-overlay-time-status-renderer">12:30</span>
            </ytd-rich-item-renderer>

            <!-- Card 3: Blocked Keyword Video -->
            <ytd-rich-item-renderer id="card-blocked-keyword">
              <h3 id="video-title">You will NOT believe this CLICKBAIT secret!</h3>
              <div class="ytd-channel-name"><a href="/@news">News Daily</a></div>
              <span class="ytd-thumbnail-overlay-time-status-renderer">15:00</span>
            </ytd-rich-item-renderer>

            <!-- Card 4: Short Duration Video (< 2 min) -->
            <ytd-rich-item-renderer id="card-short-duration">
              <h3 id="video-title">Quick Code Tip</h3>
              <div class="ytd-channel-name"><a href="/@quick">Quick Tips</a></div>
              <span class="ytd-thumbnail-overlay-time-status-renderer">0:45</span>
            </ytd-rich-item-renderer>

            <!-- Card 5: Watched Video with Progress Bar -->
            <ytd-rich-item-renderer id="card-watched">
              <h3 id="video-title">Already Completed Tutorial</h3>
              <div class="ytd-channel-name"><a href="/@teched">TechEd</a></div>
              <span class="ytd-thumbnail-overlay-time-status-renderer">25:00</span>
              <ytd-thumbnail-overlay-resume-playback-renderer>
                <div id="progress" class="ytd-thumbnail-overlay-resume-playback-renderer" style="width: 85%;"></div>
              </ytd-thumbnail-overlay-resume-playback-renderer>
            </ytd-rich-item-renderer>

            <!-- Card 6: Blocked by Handle or URL in modern Lit/Wiz view-model -->
            <yt-lockup-view-model id="card-blocked-handle">
              <div class="yt-lockup-metadata-view-model__title">Handle Block Target Video</div>
              <div class="yt-lockup-metadata-view-model__byline"><a href="/@veritasium">Veritasium</a></div>
              <span class="ytd-thumbnail-overlay-time-status-renderer">18:00</span>
            </yt-lockup-view-model>
          </div>
        </ytd-rich-grid-renderer>
      </ytd-browse>

      <!-- 2. Watch View (Flexy) -->
      <ytd-watch-flexy flexy id="watch-view" style="display: block;">
        <div id="cinematics">Cinematic Ambient Glow Canvas</div>
        <div id="description-inline-expander" collapsed>
          <div id="snippet">Snippet text overview</div>
          <div id="content" style="display: none;">Full description content</div>
          <button id="expand">...more</button>
        </div>
        <div id="columns" class="ytd-watch-flexy">
          <div id="primary" class="ytd-watch-flexy">
            <div id="player">
              <div id="movie_player" class="html5-video-player" style="position: relative; width: 640px; height: 360px;">
                <video class="html5-main-video" style="width: 640px; height: 360px;"></video>
                <div class="ytp-chrome-bottom" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 48px;">
                  <div class="ytp-right-controls" style="display: flex; justify-content: flex-end; align-items: center; height: 100%; padding-right: 12px;">
                    <button class="ytp-button ytp-settings-button" aria-label="Settings" style="width: 36px; height: 36px;">⚙</button>
                  </div>
                </div>
              </div>
            </div>
            <div id="comments" class="ytd-watch-flexy">Comments Section (1,420 Comments)</div>
          </div>
          <div id="secondary" class="ytd-watch-flexy">
            <div id="related" class="ytd-watch-flexy">Up Next / Related Videos</div>
            <div id="chat" class="ytd-watch-flexy">Live Chat Frame</div>
          </div>
        </div>
      </ytd-watch-flexy>

      <!-- 3. Search Results View -->
      <ytd-search id="search-view">
        <ytd-shelf-renderer id="search-shelf-also-watched">People Also Watched Shelf</ytd-shelf-renderer>
      </ytd-search>
    </ytd-page-manager>
  </ytd-app>
</body>
</html>`;

interface TestReportItem {
  name: string;
  category: string;
  expected: string;
  observed: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
}

const testResults: TestReportItem[] = [];

function recordTest(
  name: string,
  category: string,
  expected: string,
  observed: string,
  passed: boolean,
  durationMs: number
) {
  testResults.push({
    name,
    category,
    expected,
    observed,
    status: passed ? 'PASS' : 'FAIL',
    durationMs,
  });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${category}] ${name}: ${observed} (${durationMs}ms)`);
  if (!passed) {
    console.error(`     FAILED! Expected: ${expected}`);
  }
}

async function runRealBrowserBehavioralSuite() {
  console.log('================================================================');
  console.log('🧪 Starting YouTube Unchained Real-Browser Behavioral Test Suite');
  console.log('   Target Browser: Vivaldi 8.2 (Chromium-based) at /usr/bin/vivaldi');
  console.log('   Extension Path:', distPath);
  console.log('================================================================\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-unchained-behavioral-'));
  const browser: Browser = await puppeteer.launch({
    executablePath: '/usr/bin/vivaldi',
    headless: false,
    userDataDir: tmpDir,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  try {
    // 1. Identify Extension ID from service worker target
    console.log('📡 Step 1: Discovering extension service worker...');
    let extensionId = '';
    const startSw = Date.now();
    for (let i = 0; i < 30; i++) {
      const targets = browser.targets();
      for (const t of targets) {
        if (t.type() === 'service_worker' && t.url().endsWith('/background.js')) {
          const match = t.url().match(/chrome-extension:\/\/([a-z0-9]+)\//);
          if (match) {
            extensionId = match[1];
            break;
          }
        }
      }
      if (extensionId) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    recordTest(
      'Service Worker Discovery',
      'Core',
      'Service Worker spawned with chrome-extension ID',
      `Identified ID: ${extensionId || 'NONE'}`,
      Boolean(extensionId),
      Date.now() - startSw
    );

    // 2. Open Dedicated Extension Controller Page (options.html) for chrome.storage.local access
    console.log('\n📄 Step 2: Opening Extension Dashboard Controller...');
    const controllerPage: Page = await browser.newPage();
    const startOpt = Date.now();
    await controllerPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'networkidle0' });
    const tabCount = await controllerPage.$$eval('.nav-item', (items) => items.length);
    recordTest(
      'Options Dashboard 10-Section Navigation',
      'Options UI',
      '10 Navigation sections rendered in settings sidebar',
      `Found ${tabCount} sections`,
      tabCount === 10,
      Date.now() - startOpt
    );

    // Helpers to read/write storage cleanly via controllerPage
    async function getStorage(): Promise<UserSettings> {
      return controllerPage.evaluate(() => {
        return new Promise<UserSettings>((resolve) => {
          chrome.storage.local.get('yt_unchained_settings', (res) => {
            resolve(res.yt_unchained_settings as UserSettings);
          });
        });
      });
    }

    async function setStorage(s: UserSettings): Promise<void> {
      await controllerPage.evaluate((settingsObj) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set({ yt_unchained_settings: settingsObj }, () => resolve());
        });
      }, s as any);
      // Allow storage change event propagation
      await new Promise((r) => setTimeout(r, 250));
    }

    // 3. Setup Mock YouTube Fixture Page with Request Interception
    console.log('\n🌐 Step 3: Setting up deterministic YouTube fixture on https://www.youtube.com/...');
    const ytPage: Page = await browser.newPage();
    await ytPage.setRequestInterception(true);
    ytPage.on('request', (req) => {
      try {
        const url = req.url();
        if (url.startsWith('https://www.youtube.com')) {
          req.respond({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            body: MOCK_YOUTUBE_HTML,
          });
        } else {
          req.continue();
        }
      } catch {
        // already handled
      }
    });

    const startNav = Date.now();
    await ytPage.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 600));

    // Verify content script injection
    const initCheck = await ytPage.evaluate(() => {
      const active = document.documentElement.getAttribute('yt-unchained-active');
      const page = document.documentElement.getAttribute('yt-unchained-page');
      const style = document.getElementById('yt-unchained-styles');
      return {
        active,
        page,
        hasStyle: Boolean(style),
      };
    });

    recordTest(
      'Content Script Injection at document_start',
      'Core',
      'html[yt-unchained-active="true"] and <style id="yt-unchained-styles"> present',
      `active=${initCheck.active}, page=${initCheck.page}, hasStyle=${initCheck.hasStyle}`,
      initCheck.active === 'true' && initCheck.hasStyle,
      Date.now() - startNav
    );

    // 4. Test Initial Shorts Status (Visible in Default Preset)
    console.log('\n🩳 Step 4: Testing initial Shorts state in Default preset...');
    const startInitialShorts = Date.now();
    const initialShortsDisplay = await ytPage.evaluate(() => {
      const shelf = document.getElementById('shorts-shelf-el');
      return shelf ? window.getComputedStyle(shelf).display : 'null';
    });

    recordTest(
      'Default Preset Keeps Shorts Visible',
      'Visibility',
      'Shorts shelf display is not none initially',
      `display=${initialShortsDisplay}`,
      initialShortsDisplay !== 'none',
      Date.now() - startInitialShorts
    );

    // 5. Test Hiding Shorts when Setting Enabled
    console.log('\n🩳 Step 5: Testing Shorts hiding when setting enabled...');
    const startHideShorts = Date.now();
    const curSettings = await getStorage();
    const activePreset = curSettings.presets.find((p) => p.id === curSettings.activePresetId) || curSettings.presets[0];
    activePreset.visibility.hideShortsNavAndShelves = true;
    await setStorage(curSettings);

    const hiddenShortsDisplay = await ytPage.evaluate(() => {
      const shelf = document.getElementById('shorts-shelf-el');
      const reel = document.getElementById('reel-shelf-el');
      const navShorts = document.getElementById('guide-shorts');
      return {
        shelf: shelf ? window.getComputedStyle(shelf).display : 'null',
        reel: reel ? window.getComputedStyle(reel).display : 'null',
        nav: navShorts ? window.getComputedStyle(navShorts).display : 'null',
      };
    });

    recordTest(
      'Shorts Shelves & Navigation Hidden',
      'Visibility',
      'Computed display: none on shorts shelves and sidebar entry',
      `shelf=${hiddenShortsDisplay.shelf}, reel=${hiddenShortsDisplay.reel}, nav=${hiddenShortsDisplay.nav}`,
      hiddenShortsDisplay.shelf === 'none' && hiddenShortsDisplay.reel === 'none' && hiddenShortsDisplay.nav === 'none',
      Date.now() - startHideShorts
    );

    // 6. Test Restoring Shorts when Toggled Off
    console.log('\n🔄 Step 6: Testing Shorts restoration when toggled off...');
    const startRestoreShorts = Date.now();
    activePreset.visibility.hideShortsNavAndShelves = false;
    await setStorage(curSettings);

    const restoredShortsDisplay = await ytPage.evaluate(() => {
      const shelf = document.getElementById('shorts-shelf-el');
      return shelf ? window.getComputedStyle(shelf).display : 'null';
    });

    recordTest(
      'Shorts Restored when Setting Toggled Off',
      'Visibility',
      'Computed display: block on shorts shelf',
      `shelf=${restoredShortsDisplay}`,
      restoredShortsDisplay !== 'none',
      Date.now() - startRestoreShorts
    );

    // Re-enable shorts hiding for subsequent clean tests
    activePreset.visibility.hideShortsNavAndShelves = true;
    await setStorage(curSettings);

    // 7. Test Sidebar Customization & Navigation Clutter Hiding
    console.log('\n📑 Step 7: Testing Sidebar navigation clutter hiding...');
    const startSidebar = Date.now();
    activePreset.visibility.hideSidebarSections = true;
    activePreset.layout.hideSidebarByDefault = true;
    await setStorage(curSettings);

    const sidebarClutter = await ytPage.evaluate(() => {
      const explore = document.getElementById('guide-sec-explore');
      const more = document.getElementById('guide-sec-more');
      const guideDrawer = document.getElementById('guide');
      const pageManager = document.getElementById('page-manager');
      return {
        explore: explore ? window.getComputedStyle(explore).display : 'null',
        more: more ? window.getComputedStyle(more).display : 'null',
        guideDrawer: guideDrawer ? window.getComputedStyle(guideDrawer).display : 'null',
        pageManagerMargin: pageManager ? window.getComputedStyle(pageManager).marginLeft : 'null',
      };
    });

    recordTest(
      'Sidebar Sections and Persistent Drawer Hidden',
      'Visibility & Layout',
      'display: none for extra guide sections and persistent drawer; page margin 0px',
      `explore=${sidebarClutter.explore}, drawer=${sidebarClutter.guideDrawer}, margin=${sidebarClutter.pageManagerMargin}`,
      sidebarClutter.explore === 'none' && sidebarClutter.guideDrawer === 'none' && sidebarClutter.pageManagerMargin === '0px',
      Date.now() - startSidebar
    );

    // 8. Test Video Grid Custom Columns & Compact Spacing
    console.log('\n📐 Step 8: Testing Video Grid Column overrides & Compact Spacing...');
    const startGrid = Date.now();
    activePreset.layout.videoGridColumns = 5;
    activePreset.layout.compactSpacing = true;
    await setStorage(curSettings);

    const gridStyles = await ytPage.evaluate(() => {
      const grid = document.getElementById('video-grid');
      const title = document.getElementById('video-title');
      const compGrid = grid ? window.getComputedStyle(grid) : null;
      const compTitle = title ? window.getComputedStyle(title) : null;
      return {
        cols: compGrid?.getPropertyValue('--ytd-rich-grid-items-per-row').trim() || '',
        itemMargin: compGrid?.getPropertyValue('--ytd-rich-grid-item-margin').trim() || '',
        titleFontSize: compTitle?.fontSize || '',
      };
    });

    recordTest(
      'Video Grid Custom Columns Override',
      'Layout',
      '--ytd-rich-grid-items-per-row equals 5',
      `--ytd-rich-grid-items-per-row = ${gridStyles.cols}`,
      gridStyles.cols === '5',
      Date.now() - startGrid
    );

    recordTest(
      'Compact Spacing Variables Applied',
      'Layout',
      '--ytd-rich-grid-item-margin equals 8px',
      `--ytd-rich-grid-item-margin = ${gridStyles.itemMargin}`,
      gridStyles.itemMargin === '8px',
      Date.now() - startGrid
    );

    // 9. Test Keyword & Channel Content Filtering (DOMObserver & ContentFilter)
    console.log('\n🎯 Step 9: Testing Channel & Keyword Filtering...');
    const startFilter = Date.now();
    activePreset.filters = {
      ...activePreset.filters,
      enabled: true,
      channels: [
        { id: 'c1', channelName: 'SpamNetwork', matchType: 'contains', enabled: true },
        { id: 'c2', channelName: 'https://www.youtube.com/@veritasium', matchType: 'exact', enabled: true },
      ],
      keywords: [
        { id: 'k1', pattern: 'CLICKBAIT', isRegex: false, caseSensitive: false, enabled: true },
      ],
      duration: {
        enabled: true,
        minDurationSeconds: 120, // 2 mins
        maxDurationSeconds: 0,
      },
      hideWatched: true,
      cleanSearchResults: true,
    };
    await setStorage(curSettings);
    // Allow DOMObserver to scan and tag elements
    await new Promise((r) => setTimeout(r, 500));

    const cardStatuses = await ytPage.evaluate(() => {
      const innocent = document.getElementById('card-innocent');
      const blockedChannel = document.getElementById('card-blocked-channel');
      const blockedHandle = document.getElementById('card-blocked-handle');
      const blockedKeyword = document.getElementById('card-blocked-keyword');
      const shortDuration = document.getElementById('card-short-duration');
      const watched = document.getElementById('card-watched');

      return {
        innocent: {
          display: innocent ? window.getComputedStyle(innocent).display : 'none',
          filterAttr: innocent?.getAttribute('data-yt-unchained-filtered'),
        },
        blockedChannel: {
          display: blockedChannel ? window.getComputedStyle(blockedChannel).display : 'none',
          filterAttr: blockedChannel?.getAttribute('data-yt-unchained-filtered'),
        },
        blockedHandle: {
          display: blockedHandle ? window.getComputedStyle(blockedHandle).display : 'none',
          filterAttr: blockedHandle?.getAttribute('data-yt-unchained-filtered'),
        },
        blockedKeyword: {
          display: blockedKeyword ? window.getComputedStyle(blockedKeyword).display : 'none',
          filterAttr: blockedKeyword?.getAttribute('data-yt-unchained-filtered'),
        },
        shortDuration: {
          display: shortDuration ? window.getComputedStyle(shortDuration).display : 'none',
          filterAttr: shortDuration?.getAttribute('data-yt-unchained-filtered'),
        },
        watched: {
          display: watched ? window.getComputedStyle(watched).display : 'none',
          filterAttr: watched?.getAttribute('data-yt-unchained-filtered'),
        },
      };
    });

    recordTest(
      'Innocent Educational Card Preserved',
      'Filtering',
      'card-innocent has display !== none and no filter attribute',
      `display=${cardStatuses.innocent.display}, attr=${cardStatuses.innocent.filterAttr}`,
      cardStatuses.innocent.display !== 'none' && !cardStatuses.innocent.filterAttr,
      Date.now() - startFilter
    );

    recordTest(
      'Blocked Channel Card Filtered',
      'Filtering',
      'card-blocked-channel has display: none and data-yt-unchained-filtered="channel"',
      `display=${cardStatuses.blockedChannel.display}, attr=${cardStatuses.blockedChannel.filterAttr}`,
      cardStatuses.blockedChannel.display === 'none' && cardStatuses.blockedChannel.filterAttr === 'channel',
      Date.now() - startFilter
    );

    recordTest(
      'Channel Handle/URL Blocked on Modern View-Model Card',
      'Filtering',
      'card-blocked-handle has display: none and data-yt-unchained-filtered="channel"',
      `display=${cardStatuses.blockedHandle.display}, attr=${cardStatuses.blockedHandle.filterAttr}`,
      cardStatuses.blockedHandle.display === 'none' && cardStatuses.blockedHandle.filterAttr === 'channel',
      Date.now() - startFilter
    );

    recordTest(
      'Blocked Title Keyword Card Filtered',
      'Filtering',
      'card-blocked-keyword has display: none and data-yt-unchained-filtered="keyword"',
      `display=${cardStatuses.blockedKeyword.display}, attr=${cardStatuses.blockedKeyword.filterAttr}`,
      cardStatuses.blockedKeyword.display === 'none' && cardStatuses.blockedKeyword.filterAttr === 'keyword',
      Date.now() - startFilter
    );

    recordTest(
      'Short Duration Card (< 2 mins) Filtered',
      'Filtering',
      'card-short-duration (0:45) has display: none and attr="duration"',
      `display=${cardStatuses.shortDuration.display}, attr=${cardStatuses.shortDuration.filterAttr}`,
      cardStatuses.shortDuration.display === 'none' && cardStatuses.shortDuration.filterAttr === 'duration',
      Date.now() - startFilter
    );

    recordTest(
      'Watched Video Filtered',
      'Filtering',
      'card-watched has display: none and attr="watched"',
      `display=${cardStatuses.watched.display}, attr=${cardStatuses.watched.filterAttr}`,
      cardStatuses.watched.display === 'none' && cardStatuses.watched.filterAttr === 'watched',
      Date.now() - startFilter
    );

    // 10. Test Dynamic MutationObserver with Infinite Scroll Simulation
    console.log('\n⚡ Step 10: Testing dynamic MutationObserver batching (infinite scroll simulation)...');
    const startDyn = Date.now();
    await ytPage.evaluate(() => {
      const contents = document.querySelector('#video-grid #contents');
      if (contents) {
        // Append dynamically loaded spam card
        const dynBad = document.createElement('ytd-rich-item-renderer');
        dynBad.id = 'card-dynamic-spam';
        dynBad.innerHTML = `
          <h3 id="video-title">Dynamic Sponsored Video</h3>
          <div class="ytd-channel-name"><a href="/@spam">SpamNetwork Media</a></div>
          <span class="ytd-thumbnail-overlay-time-status-renderer">10:00</span>
        `;
        contents.appendChild(dynBad);

        // Append clean card
        const dynClean = document.createElement('ytd-rich-item-renderer');
        dynClean.id = 'card-dynamic-clean';
        dynClean.innerHTML = `
          <h3 id="video-title">Computer Science Lecture</h3>
          <div class="ytd-channel-name"><a href="/@mit">MIT OpenCourseWare</a></div>
          <span class="ytd-thumbnail-overlay-time-status-renderer">45:00</span>
        `;
        contents.appendChild(dynClean);
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    const dynResults = await ytPage.evaluate(() => {
      const bad = document.getElementById('card-dynamic-spam');
      const clean = document.getElementById('card-dynamic-clean');
      return {
        badDisplay: bad ? window.getComputedStyle(bad).display : null,
        badAttr: bad?.getAttribute('data-yt-unchained-filtered'),
        cleanDisplay: clean ? window.getComputedStyle(clean).display : null,
      };
    });

    recordTest(
      'Dynamic Infinite Scroll Card Catching',
      'Performance & Observer',
      'Dynamically appended spam card automatically filtered without manual scan',
      `badDisplay=${dynResults.badDisplay}, badAttr=${dynResults.badAttr}, cleanDisplay=${dynResults.cleanDisplay}`,
      dynResults.badDisplay === 'none' && dynResults.cleanDisplay !== 'none',
      Date.now() - startDyn
    );

    // 11. Test Preset Switching (Focus / Study Mode)
    console.log('\n🎯 Step 11: Testing Preset Switching (Study Mode / Distraction-Free)...');
    const startPreset = Date.now();
    curSettings.activePresetId = 'preset-study';
    await setStorage(curSettings);

    const studyStyles = await ytPage.evaluate(() => {
      const comments = document.getElementById('comments');
      const related = document.getElementById('related');
      return {
        comments: comments ? window.getComputedStyle(comments).display : 'null',
        related: related ? window.getComputedStyle(related).display : 'null',
      };
    });

    recordTest(
      'Preset Switching Activates Distraction-Free Styles',
      'Presets',
      'Comments and related videos hidden in Study Mode preset',
      `comments=${studyStyles.comments}, related=${studyStyles.related}`,
      studyStyles.comments === 'none' && studyStyles.related === 'none',
      Date.now() - startPreset
    );

    // Switch back to Default preset
    curSettings.activePresetId = 'preset-default';
    await setStorage(curSettings);

    // 12. Test Element Picker Full Lifecycle (Shadow DOM, HUD, Escape cancellation)
    console.log('\n🎯 Step 12: Testing Element Picker interactive lifecycle & Shadow DOM...');
    const startPicker = Date.now();

    // Send ACTIVATE_ELEMENT_PICKER message to ytPage from controllerPage
    await controllerPage.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      if (tabs[0]?.id) {
        await chrome.tabs.sendMessage(tabs[0].id, { type: 'ACTIVATE_ELEMENT_PICKER' });
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    // Verify picker host and shadow root mounted on ytPage
    const pickerState = await ytPage.evaluate(() => {
      const host = document.getElementById('yt-unchained-picker-root');
      if (!host) return { mounted: false, hasShadow: false, hasHud: false };
      const sr = host.shadowRoot;
      const hud = sr?.getElementById('hud');
      return {
        mounted: true,
        hasShadow: Boolean(sr),
        hasHud: Boolean(hud),
      };
    });

    recordTest(
      'Element Picker Shadow DOM & HUD Mounted',
      'Element Picker',
      '#yt-unchained-picker-root mounts with open shadow root and HUD',
      `mounted=${pickerState.mounted}, hasShadow=${pickerState.hasShadow}, hasHud=${pickerState.hasHud}`,
      pickerState.mounted && pickerState.hasShadow && pickerState.hasHud,
      Date.now() - startPicker
    );

    // Test Keyboard Escape Cancellation
    const startPickerCancel = Date.now();
    await ytPage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await new Promise((r) => setTimeout(r, 300));

    const pickerDismissed = await ytPage.evaluate(() => {
      const host = document.getElementById('yt-unchained-picker-root');
      return !host;
    });

    recordTest(
      'Element Picker Cancelled via Escape Key',
      'Element Picker',
      'HUD and overlay completely removed on Escape key press',
      `dismissed=${pickerDismissed}`,
      pickerDismissed,
      Date.now() - startPickerCancel
    );

    // 13. Test Custom Element Rule Persistence & Removal
    console.log('\n🛠️ Step 13: Testing Custom Element Rule Persistence & Removal...');
    const startRule = Date.now();
    const testCustomRule: CustomRule = {
      id: 'rule-test-video-title',
      name: 'Hide TS Tutorial Video Title',
      selector: '#card-innocent #video-title',
      targetPages: ['all'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    curSettings.customRules = [testCustomRule];
    await setStorage(curSettings);

    const customRuleApplied = await ytPage.evaluate(() => {
      const title = document.querySelector('#card-innocent #video-title');
      return title ? window.getComputedStyle(title).display : 'null';
    });

    recordTest(
      'Custom Element Rule Applies Successfully',
      'Custom Rules',
      'Target element (#card-innocent #video-title) hidden with display: none',
      `computed display: ${customRuleApplied}`,
      customRuleApplied === 'none',
      Date.now() - startRule
    );

    // Remove the custom rule and verify restoration
    const startRuleDelete = Date.now();
    curSettings.customRules = [];
    await setStorage(curSettings);

    const customRuleRestored = await ytPage.evaluate(() => {
      const title = document.querySelector('#card-innocent #video-title');
      return title ? window.getComputedStyle(title).display : 'null';
    });

    recordTest(
      'Custom Element Rule Removal Restores Element',
      'Custom Rules',
      'Target element display restored to non-none when rule is deleted',
      `computed display: ${customRuleRestored}`,
      customRuleRestored !== 'none',
      Date.now() - startRuleDelete
    );

    // 14. Test SPA Route Navigation Scoping
    console.log('\n🗺️ Step 14: Testing YouTube SPA Route-Scoped Rules...');
    const startSpa = Date.now();
    const watchOnlyRule: CustomRule = {
      id: 'rule-watch-only',
      name: 'Watch Page Only Rule',
      selector: '#player',
      targetPages: ['watch'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    curSettings.customRules = [watchOnlyRule];
    await setStorage(curSettings);

    // On home page, watch-only rule should NOT be in the stylesheet
    const onHomeCheck = await ytPage.evaluate(() => {
      const styleEl = document.getElementById('yt-unchained-styles');
      return styleEl?.textContent?.includes('Watch Page Only Rule') || false;
    });

    recordTest(
      'Watch-Scoped Rule Excluded on Home Page',
      'SPA Navigation',
      'Custom rule targeting watch page is NOT in stylesheet while on home',
      `includedOnHome = ${onHomeCheck}`,
      !onHomeCheck,
      Date.now() - startSpa
    );

    // Simulate SPA navigation to watch page: window dispatchEvent 'yt-navigate-finish'
    const startSpaNav = Date.now();
    await ytPage.evaluate(() => {
      window.history.pushState({}, '', '/watch?v=mock123');
      window.dispatchEvent(new CustomEvent('yt-navigate-finish'));
    });
    await new Promise((r) => setTimeout(r, 400));

    const onWatchCheck = await ytPage.evaluate(() => {
      const pageAttr = document.documentElement.getAttribute('yt-unchained-page');
      const styleEl = document.getElementById('yt-unchained-styles');
      const hasRule = styleEl?.textContent?.includes('Watch Page Only Rule') || false;
      return { pageAttr, hasRule };
    });

    recordTest(
      'SPA Navigation to /watch Applies Scoped Rule',
      'SPA Navigation',
      'yt-unchained-page="watch" and rule included in stylesheet',
      `page=${onWatchCheck.pageAttr}, hasRule=${onWatchCheck.hasRule}`,
      onWatchCheck.pageAttr === 'watch' && onWatchCheck.hasRule,
      Date.now() - startSpaNav
    );

    // 15. Test Master Disable & Full Interface Restoration
    console.log('\n🛑 Step 15: Testing Master Switch Disable & Full Interface Restoration...');
    const startMaster = Date.now();
    curSettings.masterEnabled = false;
    await setStorage(curSettings);

    const disabledState = await ytPage.evaluate(() => {
      const activeAttr = document.documentElement.getAttribute('yt-unchained-active');
      const styleEl = document.getElementById('yt-unchained-styles');
      const blockedChan = document.getElementById('card-blocked-channel');

      return {
        hasActiveAttr: Boolean(activeAttr),
        hasStyleElement: Boolean(styleEl),
        chanDisplay: blockedChan ? window.getComputedStyle(blockedChan).display : null,
        chanAttr: blockedChan?.hasAttribute('data-yt-unchained-filtered'),
      };
    });

    recordTest(
      'Master Disable Completely Restores DOM & Removes Styles',
      'Master Control',
      'active attribute removed, style element removed, and all filtered cards unhidden',
      `activeAttr=${disabledState.hasActiveAttr}, style=${disabledState.hasStyleElement}, chanDisplay=${disabledState.chanDisplay}`,
      !disabledState.hasActiveAttr &&
        !disabledState.hasStyleElement &&
        disabledState.chanDisplay !== 'none' &&
        !disabledState.chanAttr,
      Date.now() - startMaster
    );

    // Re-enable Master Switch and verify complete re-attachment
    const startReenable = Date.now();
    curSettings.masterEnabled = true;
    await setStorage(curSettings);

    const reenabledState = await ytPage.evaluate(() => {
      const activeAttr = document.documentElement.getAttribute('yt-unchained-active');
      const styleEl = document.getElementById('yt-unchained-styles');
      const blockedChan = document.getElementById('card-blocked-channel');
      return {
        active: activeAttr === 'true',
        hasStyle: Boolean(styleEl),
        chanHidden: blockedChan ? window.getComputedStyle(blockedChan).display === 'none' : false,
      };
    });

    recordTest(
      'Master Enable Re-attaches Observer & Styles Cleanly',
      'Master Control',
      'active=true, style restored, filtered items re-hidden',
      `active=${reenabledState.active}, style=${reenabledState.hasStyle}, chanHidden=${reenabledState.chanHidden}`,
      reenabledState.active && reenabledState.hasStyle && reenabledState.chanHidden,
      Date.now() - startReenable
    );

    // 16. Test Fault Tolerance with Malformed Selectors
    console.log('\n🛡️ Step 16: Testing Fault Tolerance with Malformed / Obsolete Selectors...');
    const startFault = Date.now();
    const badSelectorRule: CustomRule = {
      id: 'rule-bad-sel',
      name: 'Bad Selector',
      selector: ':::invalid>>[broken-syntax',
      targetPages: ['all'],
      action: 'hide',
      enabled: true,
      createdAt: Date.now(),
    };

    curSettings.customRules = [badSelectorRule];
    await setStorage(curSettings);

    const faultState = await ytPage.evaluate(() => {
      const style = document.getElementById('yt-unchained-styles');
      const hasBad = style?.textContent?.includes(':::invalid');
      const hasRoot = style?.textContent?.includes('yt-unchained-loaded');
      return { hasBad, hasRoot };
    });

    recordTest(
      'Malformed Selector Rejected Without Breaking Stylesheet',
      'Security & Reliability',
      'Bad selector excluded from style tag, baseline styles continue intact',
      `hasBad=${faultState.hasBad}, hasRoot=${faultState.hasRoot}`,
      !faultState.hasBad && Boolean(faultState.hasRoot),
      Date.now() - startFault
    );

    // 17. Test Watched Video Dimming Mode ('dim' vs 'hide')
    console.log("\n👁️ Step 17: Testing Watched Video Dimming Mode ('dim' vs 'hide')...");
    const startWatchedDim = Date.now();
    curSettings.presets[0].filters.hideWatched = true;
    curSettings.presets[0].filters.watchedDisplayMode = 'dim';
    await setStorage(curSettings);
    await new Promise((r) => setTimeout(r, 350));

    const dimState = await ytPage.evaluate(() => {
      const card = document.getElementById('card-watched');
      if (!card) return { found: false, display: 'none', opacity: '1', filter: 'none', attr: null };
      const comp = window.getComputedStyle(card);
      return {
        found: true,
        display: comp.display,
        opacity: comp.opacity,
        filter: comp.filter,
        attr: card.getAttribute('data-yt-unchained-filtered'),
      };
    });

    recordTest(
      'Watched Video Dimming Mode (Grayscale & Opacity)',
      'Filtering & Visual Feedback',
      'Watched card remains in layout flow (display != none), dimmed with opacity 0.35 and grayscale',
      `display=${dimState.display}, opacity=${dimState.opacity}, filter=${dimState.filter}, attr=${dimState.attr}`,
      dimState.found &&
        dimState.display !== 'none' &&
        dimState.opacity === '0.35' &&
        dimState.filter.includes('grayscale') &&
        dimState.attr === 'watched-dim',
      Date.now() - startWatchedDim
    );

    // 18. Test Ambient Lighting & Auto-Expand Description Rules
    console.log('\n💡 Step 18: Testing Ambient Lighting & Auto-Expand Description Rules...');
    const startAtmosphere = Date.now();
    curSettings.presets[0].visibility.hideAmbientLighting = true;
    curSettings.presets[0].visibility.autoExpandDescription = true;
    await setStorage(curSettings);
    await new Promise((r) => setTimeout(r, 350));

    const atmosphereState = await ytPage.evaluate(() => {
      const cinematics = document.getElementById('cinematics');
      const expanderContent = document.querySelector('#description-inline-expander[collapsed] #content');
      return {
        cinematicsDisplay: cinematics ? window.getComputedStyle(cinematics).display : 'null',
        contentDisplay: expanderContent ? window.getComputedStyle(expanderContent).display : 'null',
      };
    });

    recordTest(
      'Ambient Lighting Suppression & Auto-Expand Description',
      'Visibility & Watch Page',
      '#cinematics hidden (display=none) and #content displayed (display=block)',
      `cinematics=${atmosphereState.cinematicsDisplay}, content=${atmosphereState.contentDisplay}`,
      atmosphereState.cinematicsDisplay === 'none' && atmosphereState.contentDisplay === 'block',
      Date.now() - startAtmosphere
    );

    // 19. Test Options Dashboard Global Header Search
    console.log('\n🔍 Step 19: Testing Options Dashboard Global Header Search...');
    const startSearchTest = Date.now();
    await controllerPage.bringToFront();
    await controllerPage.waitForSelector('.global-search input');
    await controllerPage.type('.global-search input', 'ambient');
    await new Promise((r) => setTimeout(r, 350));

    const searchState = await controllerPage.evaluate(() => {
      const title = document.querySelector('.page-title')?.textContent || '';
      const rows = Array.from(document.querySelectorAll('.toggle-row')).map((r) => r.textContent || '');
      const hasAmbient = rows.some((t) => t.includes('Disable Ambient Lighting & Glow'));
      return { title, hasAmbient, count: rows.length };
    });

    // Clear search
    await controllerPage.click('.search-clear-btn');
    await new Promise((r) => setTimeout(r, 200));

    const clearedState = await controllerPage.evaluate(() => {
      const title = document.querySelector('.page-title')?.textContent || '';
      return { title };
    });

    recordTest(
      'Options Dashboard Global Search Filtering & Reset',
      'Options UI & Search',
      'Search displays Search Results tab with matching controls; clear button restores tab',
      `resultsTitle=${searchState.title}, hasAmbient=${searchState.hasAmbient}, count=${searchState.count}, restoredTitle=${clearedState.title}`,
      searchState.title.includes('Search Results') && searchState.hasAmbient && clearedState.title !== 'Search Results',
      Date.now() - startSearchTest
    );

    // 19B. Test Interface Ad Blocking & Full Playback Speed in Real Browser
    console.log('\n🛡️ Step 19B: Testing Interface Ad Blocking & Playback Speed...');
    const startAdSpeed = Date.now();
    curSettings.presets[0].visibility.hideInterfaceAds = true;
    curSettings.presets[0].layout.defaultPlaybackSpeed = 2.5;
    await setStorage(curSettings);
    await new Promise((r) => setTimeout(r, 400));

    const adSpeedState = await ytPage.evaluate(() => {
      // Append ad slot element
      let adSlot = document.getElementById('test-ad-slot');
      if (!adSlot) {
        adSlot = document.createElement('ytd-ad-slot-renderer');
        adSlot.id = 'test-ad-slot';
        adSlot.textContent = 'Sponsored Promotion';
        document.body.appendChild(adSlot);
      }
      const adDisplay = window.getComputedStyle(adSlot).display;

      // Video playback speed check
      const video = document.querySelector('video') as HTMLVideoElement | null;
      const rate = video ? video.playbackRate : null;

      return { adDisplay, rate };
    });

    recordTest(
      'Interface Ad Slot Hidden via Declarative CSS',
      'Ad Blocking',
      'ytd-ad-slot-renderer has display: none !important',
      `adDisplay=${adSpeedState.adDisplay}`,
      adSpeedState.adDisplay === 'none',
      Date.now() - startAdSpeed
    );

    recordTest(
      'Extended Playback Speed (2.5x) Applied to Video',
      'Playback Speed',
      'video element playbackRate automatically updated to 2.5',
      `playbackRate=${adSpeedState.rate}`,
      adSpeedState.rate === 2.5,
      Date.now() - startAdSpeed
    );

    // 19C. Test In-Player Speed Controller in Real Browser (Control Bar Button & Popover)
    console.log('\n🎛️ Step 19C: Testing In-Player Speed Controller (Control Bar & Popover Slider)...');
    const startInPlayerSpeed = Date.now();
    await ytPage.bringToFront();

    // 1. Check speed button injected into right controls
    const buttonState = await ytPage.evaluate(() => {
      const btn = document.querySelector('.ytp-right-controls .ytp-unchained-speed-btn') as HTMLButtonElement | null;
      const label = btn?.querySelector('.ytp-unchained-speed-label')?.textContent;
      const ariaLabel = btn?.getAttribute('aria-label');
      return {
        exists: Boolean(btn),
        label,
        ariaLabel,
      };
    });

    recordTest(
      'In-Player Speed Button Injected into Control Bar',
      'In-Player Speed Controller',
      'Speed button present in .ytp-right-controls with 2.5× label',
      `exists=${buttonState.exists}, label=${buttonState.label}`,
      buttonState.exists && buttonState.label === '2.5×',
      Date.now() - startInPlayerSpeed
    );

    // 2. Click speed button to open acrylic popover
    const startOpenPopover = Date.now();
    await ytPage.evaluate(() => {
      const btn = document.querySelector('.ytp-right-controls .ytp-unchained-speed-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 250));

    const popoverOpenState = await ytPage.evaluate(() => {
      const popover = document.querySelector('#movie_player .yt-unchained-speed-popover') as HTMLElement | null;
      const title = popover?.querySelector('.yt-unchained-popover-title')?.textContent;
      const badge = popover?.querySelector('.yt-unchained-speed-badge')?.textContent;
      const slider = popover?.querySelector('.yt-unchained-range-slider') as HTMLInputElement | null;
      const chips = popover?.querySelectorAll('.yt-unchained-chip').length;
      return {
        exists: Boolean(popover),
        title,
        badge,
        sliderVal: slider ? parseFloat(slider.value) : null,
        chipCount: chips || 0,
      };
    });

    recordTest(
      'In-Player Speed Popover Opens with Sliders and Preset Chips',
      'In-Player Speed Controller',
      'Popover rendered inside #movie_player with title, badge (2.5×), and 10 chips',
      `exists=${popoverOpenState.exists}, title=${popoverOpenState.title}, badge=${popoverOpenState.badge}, chips=${popoverOpenState.chipCount}`,
      popoverOpenState.exists && popoverOpenState.badge === '2.5×' && popoverOpenState.chipCount >= 10,
      Date.now() - startOpenPopover
    );

    // 3. Test Chip Selection: click 3.0× preset chip
    const startChipTest = Date.now();
    await ytPage.evaluate(() => {
      const chip3x = document.querySelector('.yt-unchained-chip[data-speed="3"]') as HTMLButtonElement | null;
      chip3x?.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const chipState = await ytPage.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      const badge = document.querySelector('.yt-unchained-speed-badge')?.textContent;
      const btnLabel = document.querySelector('.ytp-unchained-speed-label')?.textContent;
      const chip3x = document.querySelector('.yt-unchained-chip[data-speed="3"]');
      const isActive = chip3x?.classList.contains('active');
      return {
        videoRate: video ? video.playbackRate : null,
        badge,
        btnLabel,
        isActive,
      };
    });

    recordTest(
      'Preset Chip Real-Time Speed Application',
      'In-Player Speed Controller',
      'Clicking 3.0× chip updates video playbackRate to 3.0, badge to 3.0×, and button label to 3.0×',
      `rate=${chipState.videoRate}, badge=${chipState.badge}, btnLabel=${chipState.btnLabel}, active=${chipState.isActive}`,
      chipState.videoRate === 3.0 && chipState.badge === '3.0×' && chipState.btnLabel === '3.0×' && Boolean(chipState.isActive),
      Date.now() - startChipTest
    );

    // 4. Test Step Controls: click step decrement (−) then increment (+)
    const startStepTest = Date.now();
    await ytPage.evaluate(() => {
      const decBtn = document.querySelector('.yt-unchained-step-btn') as HTMLButtonElement | null;
      decBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 150));

    const stepDecState = await ytPage.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      return video ? video.playbackRate : null;
    });

    await ytPage.evaluate(() => {
      const btns = document.querySelectorAll('.yt-unchained-step-btn');
      const incBtn = btns[1] as HTMLButtonElement | null;
      incBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 150));

    const stepIncState = await ytPage.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      const badge = document.querySelector('.yt-unchained-speed-badge')?.textContent;
      return {
        rate: video ? video.playbackRate : null,
        badge,
      };
    });

    recordTest(
      'Step Controls Increment and Decrement Speed Accurately',
      'In-Player Speed Controller',
      'Decrements to 2.9, then increments back to 3.0',
      `decRate=${stepDecState}, incRate=${stepIncState.rate}, badge=${stepIncState.badge}`,
      stepDecState === 2.9 && stepIncState.rate === 3.0 && stepIncState.badge === '3.0×',
      Date.now() - startStepTest
    );

    // 5. Test Outside Click to Dismiss Popover
    const startDismiss = Date.now();
    await ytPage.evaluate(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 200));

    const dismissState = await ytPage.evaluate(() => {
      const popover = document.querySelector('.yt-unchained-speed-popover');
      return Boolean(popover);
    });

    recordTest(
      'Outside Click Dismisses Popover',
      'In-Player Speed Controller',
      'Clicking outside removes popover from player DOM',
      `popoverStillPresent=${dismissState}`,
      !dismissState,
      Date.now() - startDismiss
    );

    // 6. Test Keyboard Escape to Close Popover
    const startEscape = Date.now();
    await ytPage.bringToFront();
    await ytPage.evaluate(() => {
      const btn = document.querySelector('.ytp-right-controls .ytp-unchained-speed-btn') as HTMLButtonElement | null;
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    await ytPage.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    await new Promise((r) => setTimeout(r, 200));

    const escapeState = await ytPage.evaluate(() => {
      const popover = document.querySelector('.yt-unchained-speed-popover');
      const btn = document.querySelector('.ytp-right-controls .ytp-unchained-speed-btn');
      const isFocused = document.activeElement === btn;
      return {
        popoverOpen: Boolean(popover),
        btnFocused: isFocused,
      };
    });

    recordTest(
      'Escape Key Dismisses Popover and Restores Focus',
      'In-Player Speed Controller',
      'Escape key closes popover and focuses speed button',
      `popoverOpen=${escapeState.popoverOpen}, btnFocused=${escapeState.btnFocused}`,
      !escapeState.popoverOpen && escapeState.btnFocused,
      Date.now() - startEscape
    );

    // 20. Live YouTube Site Smoke Test
    console.log('\n🌐 Step 20: Testing against live YouTube (https://www.youtube.com)...');
    const startLive = Date.now();
    const livePage = await browser.newPage();
    let livePageSuccess = false;
    let livePageDetails = '';

    try {
      await livePage.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 12000 });
      await new Promise((r) => setTimeout(r, 2500));

      const liveCheck = await livePage.evaluate(() => {
        const active = document.documentElement.getAttribute('yt-unchained-active');
        const page = document.documentElement.getAttribute('yt-unchained-page');
        const style = document.getElementById('yt-unchained-styles');
        return {
          active,
          page,
          hasStyle: Boolean(style),
        };
      });

      livePageSuccess = liveCheck.active === 'true' && liveCheck.hasStyle;
      livePageDetails = `Live YouTube verified: active=${liveCheck.active}, page=${liveCheck.page}, stylesInjected=${liveCheck.hasStyle}`;
    } catch (err: any) {
      livePageSuccess = false;
      livePageDetails = `Live YouTube navigation skipped/offline: ${err.message}`;
    } finally {
      await livePage.close();
    }

    recordTest(
      'Live YouTube Content Script Initialization',
      'Live Site Integration',
      'Content script runs on live https://www.youtube.com',
      livePageDetails,
      livePageSuccess,
      Date.now() - startLive
    );

    await controllerPage.close();
    await ytPage.close();
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Generate Scorecard
  console.log('\n================================================================');
  console.log('📊 Real-Browser Behavioral Test Matrix Summary:');
  console.log('================================================================');
  const passedCount = testResults.filter((r) => r.status === 'PASS').length;
  const failedCount = testResults.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Behavioral Tests Executed: ${testResults.length}`);
  console.log(`Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('❌ Failures detected in behavioral verification:');
    testResults
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.error(`  - [${r.category}] ${r.name}: ${r.observed}`));
    process.exit(1);
  } else {
    console.log('🎉 All behavioral tests passed with 100% compliance in Vivaldi Chromium!');
  }
}

runRealBrowserBehavioralSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
