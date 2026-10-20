// Health endpoint for Octopus (polls GET /api/health every 5 min, no
// redirects, 10s timeout, >5s counts as degraded). Keep the catalogue
// check well under that — see CATALOGUE_TIMEOUT_MS.
//
// Reads the Supabase URL/anon key out of js/supabase-client.js (the same
// public config the browser already ships) instead of keeping a second
// copy here. That file assigns to `window`, so it can't be imported as a
// module — it's parsed as text.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = fileURLToPath(new URL('../js/supabase-client.js', import.meta.url));
const CATALOGUE_TIMEOUT_MS = 3000;

let cachedConfig;

async function getSupabaseConfig() {
  if (cachedConfig) return cachedConfig;
  const src = await readFile(CONFIG_PATH, 'utf8');
  const url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
  const key = src.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1];
  if (!url || !key) throw new Error('missing supabase config');
  cachedConfig = { url, key };
  return cachedConfig;
}

async function checkCatalogue() {
  try {
    const { url, key } = await getSupabaseConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CATALOGUE_TIMEOUT_MS);
    try {
      const res = await fetch(`${url}/rest/v1/stock_items?select=id&limit=1`, {
        method: 'HEAD',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

function environmentName() {
  return process.env.VERCEL_ENV || 'development';
}

function commitSha() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 12) : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end();
    return;
  }

  const catalogueOk = await checkCatalogue();

  res.statusCode = catalogueOk ? 200 : 503;
  res.end(JSON.stringify({
    status: catalogueOk ? 'ok' : 'down',
    environment: environmentName(),
    commit: commitSha(),
    checks: { catalogue: catalogueOk ? 'ok' : 'down' },
  }));
}
