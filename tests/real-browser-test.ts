import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

async function runRealVivaldiTest() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivaldi-test-'));
  console.log('🚀 Launching real Vivaldi with YouTube Unchained in:', tmpDir);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/vivaldi',
    headless: false,
    userDataDir: tmpDir,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
      '--no-sandbox',
    ],
  });

  const extId = 'ifbbkkfimegjppliafaccgdkepgagmla';
  const page = await browser.newPage();

  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', (err: any) => {
    pageErrors.push(err?.message || String(err));
    console.error('❌ [Browser PageError]:', err?.message || err);
  });

  console.log('\n📄 Step 1: Navigating to Options Dashboard (chrome-extension://' + extId + '/options.html)...');
  await page.goto(`chrome-extension://${extId}/options.html`, { waitUntil: 'networkidle0' });
  const title = await page.title();
  console.log('✅ Options Page Title:', title);

  const navItems = await page.$$eval('.nav-item', (els) => els.map((e) => e.textContent?.trim()));
  console.log('✅ Dashboard Navigation items rendered:', navItems);

  // Click through each section link in dashboard
  const tabNames = [
    'General & Master',
    'Interface & Shell',
    'Shorts & Recommendations',
    'Content Filters & Watched',
    'Video Player & Speed',
    'Controls & Density',
    'Ad Blocking & Sponsored',
    'Appearance & Themes',
    'Custom CSS Rules',
    'Presets & Backup',
  ];
  for (const tabName of tabNames) {
    const clicked = await page.evaluate((name) => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find((i) => i.textContent?.includes(name)) as HTMLButtonElement | undefined;
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, tabName);
    console.log(`  - Navigated to section "${tabName}":`, clicked ? 'OK' : 'NOT FOUND');
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\n📱 Step 2: Navigating to Popup UI (chrome-extension://' + extId + '/popup.html)...');
  const popupPage = await browser.newPage();
  popupPage.on('pageerror', (err: any) => {
    pageErrors.push(`popup: ${err?.message || err}`);
    console.error('❌ [Popup PageError]:', err?.message || err);
  });

  await popupPage.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: 'networkidle0' });
  const popupTitle = await popupPage.title();
  console.log('✅ Popup Page Title:', popupTitle);

  const masterToggleExists = await popupPage.$eval('.master-toggle-card', (el) => Boolean(el));
  console.log('✅ Master Toggle exists:', masterToggleExists);

  const quickButtons = await popupPage.$$eval('.quick-toggle-btn', (els) => els.map((e) => e.textContent?.trim()));
  console.log('✅ Quick Toggles rendered:', quickButtons);

  // Test toggling master switch in popup
  console.log('\n🔄 Step 3: Toggling Master Switch in Popup...');
  await popupPage.click('.master-toggle-card .slider');
  await new Promise((r) => setTimeout(r, 500));

  // Verify storage updated
  const storageState = await popupPage.evaluate(async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get('yt_unchained_settings', (res) => {
        resolve(res.yt_unchained_settings);
      });
    });
  });
  console.log('✅ Settings in chrome.storage.local after toggle: masterEnabled =', (storageState as any)?.masterEnabled);

  // Test toggling back on
  await popupPage.click('.master-toggle-card .slider');
  await new Promise((r) => setTimeout(r, 500));

  console.log('\n🌐 Step 4: Testing YouTube DOM Injection and Content Script...');
  // Navigate to YouTube in a tab
  const ytPage = await browser.newPage();
  ytPage.on('console', (msg) => {
    console.log('[YouTube Page Console]:', msg.type(), msg.text());
  });

  console.log('Navigating to https://www.youtube.com ...');
  try {
    await ytPage.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));

    const checkYt = await ytPage.evaluate(() => {
      const activeAttr = document.documentElement.getAttribute('yt-unchained-active');
      const pageAttr = document.documentElement.getAttribute('yt-unchained-page');
      const styleEl = document.getElementById('yt-unchained-styles');
      return {
        activeAttr,
        pageAttr,
        styleInjected: Boolean(styleEl),
        styleContentSnippet: styleEl?.textContent?.slice(0, 150),
      };
    });
    console.log('✅ YouTube content script execution result:', checkYt);
  } catch (err: any) {
    console.log('ℹ️ YouTube network load timed out or offline:', err.message);
  }

  await popupPage.close();
  await page.close();
  await ytPage.close();
  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n========================================');
  console.log('📊 Real Browser Test Summary:');
  console.log('  Total Page Errors:', pageErrors.length);
  if (pageErrors.length > 0) {
    pageErrors.forEach((e) => console.error('  - ' + e));
  } else {
    console.log('  🎉 All browser extension views rendered with 0 errors in Vivaldi!');
  }
  console.log('========================================');
}

runRealVivaldiTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
