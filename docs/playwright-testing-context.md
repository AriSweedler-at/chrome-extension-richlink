# Playwright E2E Testing - What We Need

## Goal

Playwright tests that verify the Chrome extension popup works correctly.

**Success looks like:**
```bash
$ npm run test:e2e -- popup.spec.js -g "popup displays formats for generic page"

[test] Navigating to: http://localhost:52003/generic-page.html
[test] Content scripts loaded: true
[test] Success! Format count: 2

  ✓ popup displays formats for generic page (8s)
```

## The Problem

Test is failing with: `Could not establish connection. Receiving end does not exist.`

**Why:** Content scripts aren't loading when Chrome loads the extension in the test environment.

**Evidence:**
```javascript
// In test:
await page.evaluate(() => typeof WebpageInfo !== 'undefined');
// Returns: false (should be true)
```

The content scripts declared in `manifest.json` should auto-load on `http://localhost:{port}` pages, but they're not.

## Architecture (How Extension Should Work)

**Manifest declares content scripts:**
```json
"content_scripts": [{
  "matches": ["http://*/*", "https://*/*"],
  "js": [
    "content/notifications.js",
    "content/handlers/base.js",
    "content/handlers/google-docs.js",
    ...
    "content/content.js"
  ]
}]
```

**Popup → Content Script messaging:**
```javascript
// popup.js
const response = await chrome.tabs.sendMessage(tabId, { action: 'getFormats' });
// response.data = { formats: [...], handlerNames: [...] }

// content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFormats') {
    getFormats().then(result => {
      sendResponse({ success: true, data: result });
    });
    return true;
  }
});
```

## Test Setup

**Extension loading** (`tests/e2e/helpers/extension.js:loadExtension()`):

1. Start HTTP server on random port serving `tests/e2e/fixtures/`
2. Read `manifest.json` and modify to include `http://localhost/*` in `content_scripts.matches`
3. Copy all extension files to `.test-extension/` temp directory
4. Write modified manifest to `.test-extension/manifest.json`
5. Launch Chrome: `chromium.launchPersistentContext('.test-profile', { args: ['--load-extension=.test-extension'] })`
6. Return extensionId

**Test fixture URLs:**
- `http://localhost:{randomPort}/generic-page.html`
- `http://localhost:{randomPort}/github-pr.html`

**Test manifest adds localhost:**
```javascript
const testManifest = {
  ...originalManifest,
  content_scripts: originalManifest.content_scripts.map(cs => ({
    ...cs,
    matches: [...cs.matches, 'http://localhost/*', 'http://127.0.0.1/*']
  }))
};
```

## What Needs to Happen

Content scripts must load automatically when test navigates to `http://localhost:{port}/generic-page.html`.

After navigation:
- `typeof WebpageInfo` should be `'function'`
- `typeof RawTitleHandler` should be `'function'`
- `chrome.runtime.onMessage` listener should be registered
- Popup can send messages and get responses

## Quick Verification

To test if the refactor works outside of Playwright:

1. Load extension manually in Chrome (`chrome://extensions/` → Load unpacked)
2. Visit any real website (e.g., google.com)
3. Press Shift+Command+C
4. Should copy page title
5. Click extension icon
6. Should see formats in popup

If that works: problem is Playwright-specific.
If that fails: problem is in the code refactor.

## Key Commands

```bash
# Fast iteration - single test
npm run test:e2e -- popup.spec.js -g "popup displays formats for generic page"

# All popup tests
npm run test:e2e -- popup.spec.js

# All E2E tests
npm run test:e2e
```

Expected duration: 5-10 seconds per test.

## Files Involved

- `manifest.json:10-26` - Content scripts declaration
- `content/content.js:149-169` - Message listeners
- `popup/popup.js:17-19` - `chrome.tabs.sendMessage()` call
- `tests/e2e/helpers/extension.js:49-180` - Extension loading with manifest modification
- `tests/e2e/popup.spec.js:51-133` - Popup test
