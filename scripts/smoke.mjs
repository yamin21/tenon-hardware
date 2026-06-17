/**
 * Smoke tests — run against the local dev server before any deployment.
 * Checks that key pages load, critical elements are present, and no
 * uncaught JS errors fire on page load.
 *
 * Usage: node scripts/smoke.mjs
 * Exit code 0 = all pass, 1 = one or more failures.
 */

import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';
let passed = 0;
let failed = 0;

const browser = await puppeteer.launch({
  // In CI use puppeteer's bundled Chromium; locally use installed Chrome
  executablePath: process.env.CI
    ? undefined
    : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true,
});

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function loadPage(url, { location = 'male' } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  if (location) {
    await page.evaluateOnNewDocument(loc => {
      localStorage.setItem('tenon_location', loc);
    }, location);
  }

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  return { page, errors, status: response?.status() };
}

async function exists(page, selector) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
}

// ── Tests ─────────────────────────────────────────────────────────

console.log('\nSmoke tests\n');

// index.html
console.log('index.html');
await test('loads with 200', async () => {
  const { page, status } = await loadPage(`${BASE}/index.html`);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  await page.close();
});
await test('has header logo', async () => {
  const { page } = await loadPage(`${BASE}/index.html`);
  await exists(page, '.brand .logo');
  await page.close();
});
await test('has hero carousel', async () => {
  const { page } = await loadPage(`${BASE}/index.html`);
  await exists(page, '.hero-carousel');
  await page.close();
});
await test('has footer', async () => {
  const { page } = await loadPage(`${BASE}/index.html`);
  await exists(page, '.site-footer');
  await page.close();
});
await test('no uncaught JS errors', async () => {
  const { page, errors } = await loadPage(`${BASE}/index.html`);
  await page.close();
  if (errors.length) throw new Error(errors.join('; '));
});

// category.html
console.log('\ncategory.html');
await test('loads with 200', async () => {
  const { page, status } = await loadPage(`${BASE}/category.html`);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  await page.close();
});
await test('has product grid', async () => {
  const { page } = await loadPage(`${BASE}/category.html`);
  await exists(page, '#productGrid');
  await page.close();
});
await test('no uncaught JS errors', async () => {
  const { page, errors } = await loadPage(`${BASE}/category.html`);
  await page.close();
  if (errors.length) throw new Error(errors.join('; '));
});

// product.html
console.log('\nproduct.html');
await test('loads with 200', async () => {
  const { page, status } = await loadPage(`${BASE}/product.html`);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  await page.close();
});
await test('has header', async () => {
  const { page } = await loadPage(`${BASE}/product.html`);
  await exists(page, '.site-header');
  await page.close();
});

// login.html
console.log('\nlogin.html');
await test('loads with 200', async () => {
  const { page, status } = await loadPage(`${BASE}/login.html`, { location: null });
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  await page.close();
});
await test('has sign-in form', async () => {
  const { page } = await loadPage(`${BASE}/login.html`, { location: null });
  await exists(page, 'input[type="email"]');
  await exists(page, 'input[type="password"]');
  await exists(page, '.auth-submit');
  await page.close();
});

// signup.html
console.log('\nsignup.html');
await test('loads with 200', async () => {
  const { page, status } = await loadPage(`${BASE}/signup.html`, { location: null });
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  await page.close();
});
await test('has sign-up form', async () => {
  const { page } = await loadPage(`${BASE}/signup.html`, { location: null });
  await exists(page, 'input[id="email"]');
  await exists(page, '.auth-submit');
  await page.close();
});

// checkout.html
console.log('\ncheckout.html');
await test('loads with 200', async () => {
  const { page, status } = await loadPage(`${BASE}/checkout.html`);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  await page.close();
});

// ── Summary ───────────────────────────────────────────────────────
await browser.close();

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
