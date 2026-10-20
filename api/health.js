// Health endpoint for Octopus (polls GET /api/health every 5 min, no
// redirects, 10s timeout, >5s counts as degraded). Keep each check well
// under that — see *_TIMEOUT_MS below.
//
// Checks what the shop actually depends on:
//  - catalogue: the ERP API (js/api.js) that category/product data comes
//    from.
//  - auth: Supabase (js/supabase-client.js), used only for sign-in.
//
// Both configs are parsed as text out of the real frontend files instead
// of duplicating the values here. Neither file can be imported as a
// module — api.js has top-level await'd browser calls and
// supabase-client.js assigns to `window`.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API_CONFIG_PATH = fileURLToPath(new URL('../js/api.js', import.meta.url));
const SUPABASE_CONFIG_PATH = fileURLToPath(new URL('../js/supabase-client.js', import.meta.url));
const CHECK_TIMEOUT_MS = 3000;

let cachedApiConfig;
let cachedSupabaseConfig;

async function getApiConfig() {
  if (cachedApiConfig) return cachedApiConfig;
  const src = await readFile(API_CONFIG_PATH, 'utf8');
  const base = src.match(/API_BASE\s*=\s*'([^']+)'/)?.[1];
  const key = src.match(/API_KEY\s*=\s*'([^']+)'/)?.[1];
  if (!base || !key) throw new Error('missing api config');
  cachedApiConfig = { base, key };
  return cachedApiConfig;
}

async function getSupabaseConfig() {
  if (cachedSupabaseConfig) return cachedSupabaseConfig;
  const src = await readFile(SUPABASE_CONFIG_PATH, 'utf8');
  const url = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
  const key = src.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1];
  if (!url || !key) throw new Error('missing supabase config');
  cachedSupabaseConfig = { url, key };
  return cachedSupabaseConfig;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkCatalogue() {
  try {
    const { base, key } = await getApiConfig();
    const res = await fetchWithTimeout(`${base}/categories`, {
      headers: { 'x-api-key': key },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function checkAuth() {
  try {
    const { url, key } = await getSupabaseConfig();
    const res = await fetchWithTimeout(`${url}/auth/v1/health`, {
      headers: { apikey: key },
    });
    return res.status === 200;
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

  const [catalogueOk, authOk] = await Promise.all([checkCatalogue(), checkAuth()]);
  const allOk = catalogueOk && authOk;

  res.statusCode = allOk ? 200 : 503;
  res.end(JSON.stringify({
    status: allOk ? 'ok' : 'down',
    environment: environmentName(),
    commit: commitSha(),
    checks: {
      catalogue: catalogueOk ? 'ok' : 'down',
      auth: authOk ? 'ok' : 'down',
    },
  }));
}
