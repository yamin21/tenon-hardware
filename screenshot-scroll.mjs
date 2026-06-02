import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join } from 'path';

const url = process.argv[2] || 'http://localhost:3000';
const dir = './temporary screenshots';
mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));

// Capture sections by scrolling to them
const sections = [
  { id: '#categories', label: 'categories' },
  { id: '.flash-section', label: 'flash-deals' },
  { id: '.new-arrivals-section', label: 'new-arrivals' },
  { id: '.brands-section', label: 'brands' },
  { id: '#products', label: 'featured' },
  { id: '.why-section', label: 'why' },
  { id: '.newsletter-section', label: 'newsletter' },
  { id: '.site-footer', label: 'footer' },
];

let n = 2;
for (const { id, label } of sections) {
  try {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await new Promise(r => setTimeout(r, 600));
    const path = join(dir, `screenshot-${n}-${label}.png`);
    await page.screenshot({ path, fullPage: false });
    console.log('Saved:', path);
    n++;
  } catch (e) {
    console.error('Failed', id, e.message);
  }
}

// Also a mobile view
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));
const mobilePath = join(dir, `screenshot-${n}-mobile.png`);
await page.screenshot({ path: mobilePath, fullPage: false });
console.log('Saved:', mobilePath);

await browser.close();
