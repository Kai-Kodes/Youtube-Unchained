import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultArtifactsDir = '/home/redsheronin/.gemini/antigravity-cli/brain/8088107f-dd2e-409b-ae4b-71886e712f8d';
const outDir = fs.existsSync(defaultArtifactsDir) ? defaultArtifactsDir : path.resolve(__dirname, '../dist/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function captureAll() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivaldi-shots-'));
  const browser = await puppeteer.launch({
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

  let extensionId = '';
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
  console.log('Ext ID:', extensionId);

  // 1. Popup screenshot (clean 350x620)
  const popupPage = await browser.newPage();
  await popupPage.setViewport({ width: 350, height: 620 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle0' });
  await popupPage.waitForSelector('.master-toggle-card');
  await new Promise(r => setTimeout(r, 400));
  await popupPage.screenshot({ path: path.join(outDir, 'apple-popup.png') });
  console.log('Saved apple-popup.png');
  await popupPage.close();

  // 2. Options Page helper
  const optPage = await browser.newPage();
  await optPage.setViewport({ width: 1280, height: 900 });
  await optPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  // Overview
  await optPage.screenshot({ path: path.join(outDir, 'apple-dashboard-overview.png') });
  console.log('Saved apple-dashboard-overview.png');

  // Helper to scroll to section
  async function shotSection(secId: string, filename: string) {
    await optPage.evaluate((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, secId);
    await new Promise(r => setTimeout(r, 350));
    await optPage.screenshot({ path: path.join(outDir, filename) });
    console.log(`Saved ${filename}`);
  }

  // 3. Visibility
  await shotSection('sec-visibility', 'apple-visibility.png');

  // 4. Content filtering
  await shotSection('sec-filters', 'apple-content-filtering.png');

  // 5. Player and speed
  await shotSection('sec-player', 'apple-player-speed.png');

  // 6. Ads and sponsored content
  await shotSection('sec-ads', 'apple-ads.png');

  // 7. Custom rules
  await shotSection('sec-custom-rules', 'apple-custom-rules.png');

  // 8. Presets & Backup
  await shotSection('sec-backup', 'apple-backup-diagnostics.png');

  // 9. Narrower viewport (800x900)
  await optPage.setViewport({ width: 800, height: 900 });
  await optPage.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 350));
  await optPage.screenshot({ path: path.join(outDir, 'apple-narrow-viewport.png') });
  console.log('Saved apple-narrow-viewport.png');

  await optPage.close();
  await browser.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

captureAll().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
