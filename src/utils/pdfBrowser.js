import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { Browser, computeExecutablePath, detectBrowserPlatform, install } from '@puppeteer/browsers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PROJECT_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR || path.join(PROJECT_ROOT, '.cache', 'puppeteer');

function pathExists(candidate) {
  return Boolean(candidate && fs.existsSync(candidate));
}

function systemBrowserCandidates() {
  const candidates = [];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  }
  if (process.env.CHROME_PATH) {
    candidates.push(process.env.CHROME_PATH);
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    );
  } else if (process.platform === 'linux') {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  }

  return candidates;
}

function puppeteerBundledCandidates() {
  const candidates = [];

  try {
    candidates.push(puppeteer.executablePath());
  } catch (_) {
    /* not configured */
  }

  const platform = detectBrowserPlatform();
  const buildId = puppeteer.configuration?.chrome?.version;
  if (platform && buildId) {
    candidates.push(
      computeExecutablePath({
        browser: Browser.CHROME,
        buildId,
        cacheDir: PROJECT_CACHE_DIR,
        platform,
      })
    );
  }

  return candidates;
}

export function resolvePdfBrowserExecutable() {
  for (const candidate of [...systemBrowserCandidates(), ...puppeteerBundledCandidates()]) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function installBundledChrome() {
  const platform = detectBrowserPlatform();
  const buildId = puppeteer.configuration?.chrome?.version;
  if (!platform || !buildId) {
    throw new Error('Unable to determine Puppeteer Chrome build for this platform');
  }

  await install({
    browser: Browser.CHROME,
    buildId,
    cacheDir: PROJECT_CACHE_DIR,
    platform,
  });

  return computeExecutablePath({
    browser: Browser.CHROME,
    buildId,
    cacheDir: PROJECT_CACHE_DIR,
    platform,
  });
}

export async function launchPdfBrowser() {
  let executablePath = resolvePdfBrowserExecutable();

  if (!executablePath) {
    try {
      const installedPath = await installBundledChrome();
      if (pathExists(installedPath)) {
        executablePath = installedPath;
      }
    } catch (installErr) {
      console.warn('Puppeteer Chrome auto-install failed:', installErr.message);
    }
  }

  if (!executablePath) {
    const err = new Error(
      'PDF engine could not find Chrome or Edge. Install Google Chrome / Microsoft Edge, or run: npm run setup:pdf'
    );
    err.statusCode = 503;
    throw err;
  }

  return puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}
