import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const dir = './temporary screenshots';
mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));

// Probe 1: click "Add to Cart" on first flash deal, check cart sidebar opens
await page.click('.flash-section .product-add-btn');
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: `${dir}/probe-1-cart-open.png` });
console.log('Probe 1: cart sidebar after add-to-cart');

// Check cart count badge
const cartCount = await page.$eval('#cartCount', el => el.textContent);
console.log('Cart count:', cartCount);

// Check cart footer visible
const cartFooterVisible = await page.$eval('#cartFooter', el => el.style.display !== 'none');
console.log('Cart footer visible:', cartFooterVisible);

// Close cart
await page.click('.cart-overlay');
await new Promise(r => setTimeout(r, 400));

// Probe 2: hero carousel — click next
await page.click('.carousel-btn--next');
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: `${dir}/probe-2-slide-2.png` });
console.log('Probe 2: carousel slide 2');

// Probe 3: tab filter in featured products — click Electrical
await page.evaluate(() => document.querySelector('#products').scrollIntoView({ block: 'start' }));
await new Promise(r => setTimeout(r, 400));
await page.click('[data-filter="electrical"]');
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: `${dir}/probe-3-filter-electrical.png` });
console.log('Probe 3: tab filter electrical');

// Count visible cards
const visible = await page.$$eval('#featuredGrid .product-card', cards =>
  cards.filter(c => c.style.display !== 'none').length
);
console.log('Visible electrical products:', visible);

// Probe 4: search focus shows suggestions
await page.click('#searchInput');
await new Promise(r => setTimeout(r, 300));
const suggestionsVisible = await page.$eval('#searchSuggestions', el =>
  el.classList.contains('search-suggestions--visible')
);
console.log('Search suggestions visible:', suggestionsVisible);
await page.screenshot({ path: `${dir}/probe-4-search-suggestions.png` });

// Probe 5: scroll down to check scroll-to-top button appears
await page.evaluate(() => window.scrollTo(0, 3000));
await new Promise(r => setTimeout(r, 500));
const scrollBtnVisible = await page.$eval('#scrollTopBtn', el =>
  el.classList.contains('scroll-top-btn--visible')
);
console.log('Scroll-to-top visible:', scrollBtnVisible);

// Probe 6: countdown digits are set (not "NaN")
const countH = await page.$eval('#countH', el => el.textContent);
const countM = await page.$eval('#countM', el => el.textContent);
console.log('Countdown H/M:', countH, countM);

await browser.close();
