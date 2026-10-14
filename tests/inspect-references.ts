import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspect() {
  const homeDir = os.homedir();
  const ext1 = path.join(homeDir, '.config/vivaldi/Default/Extensions/bnomihfieiccainjcjblhegjgglakjdd/4.2081_0');
  const ext2 = path.join(homeDir, '.config/vivaldi/Default/Extensions/ponfpcnoihfmfllpaingbgckeeldkhle/3.0.19_0');
  const ext3 = path.join(homeDir, '.config/vivaldi/Default/Extensions/ogkoifddpkoabehfemkolflcjhklmkge/3.93.0_0');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/vivaldi',
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      `--disable-extensions-except=${ext1},${ext2},${ext3}`,
      `--load-extension=${ext1},${ext2},${ext3}`,
    ],
  });

  await new Promise((r) => setTimeout(r, 2000));
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  const results: any = {};

  // 1. Improve YouTube!
  try {
    console.log('\n--- 1. Inspecting Improve YouTube! (bnomihfieiccainjcjblhegjgglakjdd) ---');
    await page.goto('chrome-extension://bnomihfieiccainjcjblhegjgglakjdd/menu/index.html', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
    await new Promise((r) => setTimeout(r, 1000));
    const title = await page.title();
    const categories = await page.$$eval('.satus-button, button, .category', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean)
    );
    const switchesCount = await page.$$eval('.satus-switch, input[type="checkbox"]', (els) => els.length);
    const selectsCount = await page.$$eval('select, .satus-select', (els) => els.length);
    console.log('Title:', title);
    console.log('Buttons/Categories found:', categories);
    console.log('Switches count:', switchesCount, 'Selects count:', selectsCount);
    results.improveYouTube = { title, categories, switchesCount, selectsCount };
  } catch (err: any) {
    console.error('Improve YouTube inspection failed:', err.message);
  }

  // 2. Enhancer for YouTube
  try {
    console.log('\n--- 2. Inspecting Enhancer for YouTube (ponfpcnoihfmfllpaingbgckeeldkhle) ---');
    await page.goto('chrome-extension://ponfpcnoihfmfllpaingbgckeeldkhle/html/options.html', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
    await new Promise((r) => setTimeout(r, 1000));
    const title = await page.title();
    const tabs = await page.$$eval('aside li a', (els) =>
      els.map((e) => ({
        text: e.textContent?.trim(),
        target: e.getAttribute('data-target'),
      }))
    );
    const sections = await page.$$eval('fieldset legend', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean)
    );
    const fieldsetLabels = await page.$$eval('fieldset label', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean)
    );
    console.log('Title:', title);
    console.log('Sidebar tabs count:', tabs.length);
    console.log('Tabs:', tabs.slice(0, 10));
    console.log('Sections (legends):', sections);
    console.log('Sample settings labels (first 20):', fieldsetLabels.slice(0, 20));
    results.enhancer = { title, tabs, sections, sampleLabels: fieldsetLabels.slice(0, 30) };
  } catch (err: any) {
    console.error('Enhancer inspection failed:', err.message);
  }

  // 3. Tweaks for YouTube
  try {
    console.log('\n--- 3. Inspecting Tweaks for YouTube (ogkoifddpkoabehfemkolflcjhklmkge) ---');
    await page.goto('chrome-extension://ogkoifddpkoabehfemkolflcjhklmkge/options.html', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
    await new Promise((r) => setTimeout(r, 2000));
    const title = await page.title();
    const headers = await page.$$eval('h1, h2, h3, h4, h5, h6, [role="tab"], .MuiTab-root', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean)
    );
    const labels = await page.$$eval('label, .MuiFormControlLabel-label', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean)
    );
    console.log('Title:', title);
    console.log('Tabs / Headers found:', headers);
    console.log('Settings Labels (first 25):', labels.slice(0, 25));
    results.tweaks = { title, headers, labels: labels.slice(0, 35) };
  } catch (err: any) {
    console.error('Tweaks inspection failed:', err.message);
  }

  // Also inspect Tweaks popup.html
  try {
    console.log('\n--- 3b. Inspecting Tweaks popup (popup.html) ---');
    await page.goto('chrome-extension://ogkoifddpkoabehfemkolflcjhklmkge/popup.html', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
    await new Promise((r) => setTimeout(r, 1000));
    const popupText = await page.evaluate(() => document.body.innerText);
    const popupLabels = await page.$$eval('label, button, a', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean)
    );
    console.log('Tweaks popup text snippet:', popupText.replace(/\n+/g, ' ').slice(0, 200));
    console.log('Tweaks popup labels:', popupLabels.slice(0, 15));
    results.tweaksPopup = { popupLabels };
  } catch (err: any) {
    console.error('Tweaks popup inspection failed:', err.message);
  }

  fs.writeFileSync(path.resolve(__dirname, 'inspection-results.json'), JSON.stringify(results, null, 2));
  console.log('\n✅ Inspection data written to tests/inspection-results.json');

  await browser.close();
}

inspect();
