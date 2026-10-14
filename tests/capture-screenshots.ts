import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
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

  // 10. In-player speed controller screenshots
  const playerPage = await browser.newPage();
  await playerPage.setViewport({ width: 1280, height: 800 });
  await playerPage.setRequestInterception(true);
  playerPage.on('request', (req) => {
    try {
      if (req.url().startsWith('https://www.youtube.com')) {
        req.respond({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>YouTube Watch Demo</title>
  <style>
    body { margin: 0; background: #0f0f0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    #player-wrap { width: 960px; }
    #movie_player { position: relative; width: 960px; height: 540px; background: #1a1a1e; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.85); }
    video { width: 100%; height: 100%; object-fit: cover; background: #121215; }
    .ytp-chrome-bottom { position: absolute; bottom: 0; left: 0; width: 100%; height: 52px; background: linear-gradient(transparent, rgba(0,0,0,0.88)); display: flex; align-items: center; justify-content: flex-end; padding: 0 16px; box-sizing: border-box; }
    .ytp-right-controls { display: flex; align-items: center; gap: 8px; }
    .ytp-button { background: none; border: none; color: #fff; cursor: pointer; padding: 6px; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div id="player-wrap">
    <div id="movie_player" class="html5-video-player">
      <video class="html5-main-video"></video>
      <div class="ytp-chrome-bottom">
        <div class="ytp-right-controls">
          <button class="ytp-button ytp-settings-button" aria-label="Settings">⚙</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
        });
      } else {
        req.continue();
      }
    } catch {
      // ignored
    }
  });

  await playerPage.goto('https://www.youtube.com/watch?v=demo', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot with speed button visible in player
  await playerPage.screenshot({ path: path.join(outDir, 'in-player-speed-button.png') });
  console.log('Saved in-player-speed-button.png');

  // Open popover by clicking speed button
  await playerPage.evaluate(() => {
    const btn = document.querySelector('.ytp-unchained-speed-btn') as HTMLElement | null;
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 450));

  // Screenshot with acrylic popover slider open
  await playerPage.screenshot({ path: path.join(outDir, 'in-player-speed-popover.png') });
  console.log('Saved in-player-speed-popover.png');

  await playerPage.close();
  await browser.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

captureAll().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
