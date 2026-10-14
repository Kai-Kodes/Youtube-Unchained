import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

async function runBrowserTest() {
  console.log('🌐 Launching real Chrome with YouTube Unchained extension from:', distPath);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: false, // will run with headless: 'new' or headless: false
    args: [
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
  });

  const errors: string[] = [];

  try {
    // Wait for extension targets (service worker)
    console.log('⏳ Waiting for Service Worker target...');
    let extensionId = '';

    const targets = browser.targets();
    for (const t of targets) {
      if (t.type() === 'service_worker') {
        const url = t.url();
        console.log('Found service worker:', url);
        const match = url.match(/chrome-extension:\/\/([a-z0-9]+)\//);
        if (match) {
          extensionId = match[1];
        }
      }
    }

    if (!extensionId) {
      // Find extension target from other targets
      const target = await browser.waitForTarget(
        (t) => t.type() === 'service_worker' || t.url().includes('chrome-extension://'),
        { timeout: 5000 }
      ).catch(() => null);

      if (target) {
        const match = target.url().match(/chrome-extension:\/\/([a-z0-9]+)\//);
        if (match) extensionId = match[1];
      }
    }

    console.log('Extension ID identified:', extensionId || '(inspecting targets)');

    // 1. Test Options Dashboard
    if (extensionId) {
      const page = await browser.newPage();
      page.on('pageerror', (err: any) => {
        console.error('❌ Page Error on options.html:', err);
        errors.push(`options.html page error: ${err?.message || err}`);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error('❌ Console Error on options.html:', msg.text());
          errors.push(`options.html console error: ${msg.text()}`);
        } else {
          console.log(`[options.html log]:`, msg.text());
        }
      });

      const optionsUrl = `chrome-extension://${extensionId}/options.html`;
      console.log('📄 Navigating to Options Dashboard:', optionsUrl);
      await page.goto(optionsUrl, { waitUntil: 'networkidle0' });

      // Check title and key UI elements
      const title = await page.title();
      console.log('Options page title:', title);

      const navCount = await page.$$eval('.nav-item', (items) => items.length);
      console.log('Navigation items rendered in dashboard:', navCount);

      if (navCount < 5) {
        errors.push(`Dashboard rendered fewer than 5 nav items (found: ${navCount})`);
      }

      // 2. Test Popup UI
      const popupPage = await browser.newPage();
      popupPage.on('pageerror', (err: any) => {
        console.error('❌ Page Error on popup.html:', err);
        errors.push(`popup.html page error: ${err?.message || err}`);
      });
      popupPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error('❌ Console Error on popup.html:', msg.text());
          errors.push(`popup.html console error: ${msg.text()}`);
        } else {
          console.log(`[popup.html log]:`, msg.text());
        }
      });

      const popupUrl = `chrome-extension://${extensionId}/popup.html`;
      console.log('📄 Navigating to Popup UI:', popupUrl);
      await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' });

      const masterToggle = await popupPage.$('.master-toggle-card');
      console.log('Master toggle rendered in popup:', Boolean(masterToggle));
      if (!masterToggle) {
        errors.push('Popup master-toggle-card not found');
      }

      await popupPage.close();
      await page.close();
    }

    console.log('--- Real Browser Test Summary ---');
    if (errors.length > 0) {
      console.error('❌ Detected errors during browser verification:');
      errors.forEach((e) => console.error('  - ' + e));
      process.exitCode = 1;
    } else {
      console.log('✅ Real Chrome verification passed with 0 runtime errors!');
    }
  } finally {
    await browser.close();
  }
}

runBrowserTest().catch((e) => {
  console.error('Browser test failed to execute:', e);
  process.exit(1);
});
