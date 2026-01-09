import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import http from 'http';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple HTTP server for serving test fixtures
let fixtureServer = null;
let fixtureServerPort = 0;

function startFixtureServer() {
  return new Promise((resolve, reject) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    const server = http.createServer(async (req, res) => {
      const filePath = path.join(fixturesPath, req.url.slice(1));

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch (e) {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(0, () => {
      fixtureServerPort = server.address().port;
      fixtureServer = server;
      resolve(fixtureServerPort);
    });

    server.on('error', reject);
  });
}

/**
 * Load the Chrome extension in a new browser context with test permissions
 * @returns {Promise<{context: BrowserContext, extensionId: string, cleanup: Function}>}
 */
export async function loadExtension() {
  console.log('[loadExtension] Starting...');

  // Start HTTP server for fixtures
  if (!fixtureServer) {
    console.log('[loadExtension] Starting HTTP server...');
    await startFixtureServer();
    console.log(`[loadExtension] HTTP server started on port ${fixtureServerPort}`);
  }

  const pathToExtension = path.join(__dirname, '../../..');
  const manifestPath = path.join(pathToExtension, 'manifest.json');
  console.log('[loadExtension] Path to extension:', pathToExtension);

  // Read and parse original manifest
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);

  // Add e2e.test (fake hostname) for testing
  // Using a fake "real" hostname instead of localhost bypasses Chrome's special localhost security policies
  // Chrome will resolve e2e.test to 127.0.0.1 via --host-resolver-rules flag
  const testManifest = {
    ...manifest,
    host_permissions: ['http://e2e.test/*', 'http://*/*', 'https://*/*'],
    content_scripts: manifest.content_scripts.map(cs => ({
      ...cs,
      matches: [...cs.matches, 'http://e2e.test/*']
    }))
  };

  console.log('[loadExtension] Content script matches:', testManifest.content_scripts[0].matches);

  // Create temp directory for test extension (clean it first if it exists)
  const tempDir = path.join(__dirname, '../../../.test-extension');
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(tempDir, { recursive: true });

  // Write modified manifest
  await fs.writeFile(
    path.join(tempDir, 'manifest.json'),
    JSON.stringify(testManifest, null, 2)
  );
  console.log('[loadExtension] Manifest written to:', path.join(tempDir, 'manifest.json'));

  // Copy files (Chrome doesn't follow symlinks for content_scripts)
  console.log('[loadExtension] Copying extension files to temp dir...');
  const filesToCopy = ['background.js', 'content', 'popup', 'icons', 'shared'];
  for (const file of filesToCopy) {
    const src = path.join(pathToExtension, file);
    const dest = path.join(tempDir, file);
    await fs.cp(src, dest, { recursive: true });
    console.log(`[loadExtension] Copied ${file}`);
  }

  // Verify critical files exist
  const testFile = path.join(tempDir, 'content/notifications.js');
  const exists = await fs.access(testFile).then(() => true).catch(() => false);
  console.log(`[loadExtension] content/notifications.js exists: ${exists}`);

  // List content/handlers files
  try {
    const handlersPath = path.join(tempDir, 'content/handlers');
    const handlers = await fs.readdir(handlersPath);
    console.log(`[loadExtension] Handlers in temp dir:`, handlers);
  } catch (e) {
    console.log(`[loadExtension] Failed to list handlers:`, e.message);
  }

  // Use a fresh temp profile for each test run to force Chrome to re-read the modified manifest
  // This ensures content scripts properly inject into e2e.test URLs
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chrome-test-profile-'));

  console.log('[loadExtension] Launching Chrome with extension...');
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${tempDir}`,
      `--load-extension=${tempDir}`,
      '--host-resolver-rules=MAP e2e.test 127.0.0.1',
      '--no-sandbox',
      '--allow-file-access-from-files',
      '--disable-web-security',
    ],
    viewport: { width: 1280, height: 720 },
    timeout: 10000, // 10 second timeout
  });
  console.log('[loadExtension] Chrome launched');

  // Keep Chrome window active and focused during tests
  // The popup queries for "active tab in current window", so Chrome must stay frontmost

  // Wait for service worker to be ready
  console.log('[loadExtension] Waiting for service worker...');
  try {
    await context.waitForEvent('serviceworker', { timeout: 5000 });
    console.log('[loadExtension] Service worker event received');
  } catch (e) {
    console.log('[loadExtension] Service worker wait timed out, checking if any are already loaded...');
  }

  // Get extension ID from background page
  let background = context.serviceWorkers()[0];
  if (!background) {
    console.log('[loadExtension] No service worker found yet, trying to wait one more time...');
    try {
      background = await context.waitForEvent('serviceworker', { timeout: 5000 });
    } catch (e) {
      // Try getting from background pages instead
      console.log('[loadExtension] Still no service worker. Checking background pages...');
      const pages = context.backgroundPages();
      if (pages.length > 0) {
        const url = pages[0].url();
        const extensionId = url.split('/')[2];
        console.log('[loadExtension] Found extension ID from background page:', extensionId);
        return { context, extensionId, cleanup: async () => {} };
      }
      throw new Error('Could not find extension service worker or background page');
    }
  }

  const extensionId = background.url().split('/')[2];
  console.log('[loadExtension] Extension ID:', extensionId);

  // Set up service worker console logging to catch any errors
  background.on('console', msg => {
    console.log(`[Service Worker ${msg.type()}]`, msg.text());
  });

  // Try to read the manifest from the extension to verify it loaded correctly
  try {
    const manifestCheck = await background.evaluate(() => {
      return chrome.runtime.getManifest();
    });
    console.log('[loadExtension] Manifest loaded by Chrome:');
    console.log('  - content_scripts[0].matches:', manifestCheck.content_scripts?.[0]?.matches);
    console.log('  - host_permissions:', manifestCheck.host_permissions);
  } catch (e) {
    console.log('[loadExtension] Could not read manifest from service worker:', e.message);
  }

  // Cleanup function to remove temp directories and stop server
  const cleanup = async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      // Remove profile dir to ensure fresh state on next run
      await fs.rm(profileDir, { recursive: true, force: true });

      // Stop fixture server
      if (fixtureServer) {
        fixtureServer.close();
        fixtureServer = null;
      }
    } catch (e) {
      console.error('Failed to cleanup:', e);
    }
  };

  return { context, extensionId, cleanup };
}

/**
 * Get the URL to a fixture file (served via HTTP)
 * Uses e2e.test hostname which resolves to 127.0.0.1 via Chrome's host resolver rules
 * This bypasses Chrome's special localhost security policies
 * @param {string} filename - The fixture filename (e.g., 'github-pr.html')
 * @returns {string} - HTTP URL to fixture
 */
export function getFixturePath(filename) {
  return `http://e2e.test:${fixtureServerPort}/${filename}`;
}

/**
 * Inject all handler scripts into a page (simulates what background.js does)
 * @param {Page} page - Playwright page
 */
export async function injectHandlers(page) {
  const contentPath = path.join(__dirname, '../../../content');
  const handlersPath = path.join(contentPath, 'handlers');

  // Inject notifications.js first (required by handlers)
  await page.addScriptTag({ path: path.join(contentPath, 'notifications.js') });

  // Inject handlers in order (base.js must be first)
  const handlers = [
    'base.js',
    'google-docs.js',
    'atlassian.js',
    'airtable.js',
    'github.js',
    'spinnaker.js',
    'raw_title.js',
    'raw_url.js',
  ];

  for (const handler of handlers) {
    const handlerPath = path.join(handlersPath, handler);
    await page.addScriptTag({ path: handlerPath });
  }

  // Also inject content.js
  await page.addScriptTag({ path: path.join(contentPath, 'content.js') });
}
