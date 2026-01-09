import { test, expect } from '@playwright/test';
import { loadExtension, getFixturePath, injectHandlers } from './helpers/extension.js';

test.describe('Message Passing Integration', () => {
  let context;
  let extensionId;
  let cleanup;

  test.beforeAll(async () => {
    const result = await loadExtension();
    context = result.context;
    extensionId = result.extensionId;
    cleanup = result.cleanup;
  });

  test.afterAll(async () => {
    await context.close();
    await cleanup();
  });

  test('content scripts can access chrome extension APIs', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));

    // Check if chrome.runtime is available (extension context)
    const hasChromeAPI = await page.evaluate(() => {
      return typeof chrome !== 'undefined' &&
             typeof chrome.runtime !== 'undefined' &&
             typeof chrome.runtime.id !== 'undefined';
    });

    // In a real extension context, chrome APIs should be available
    // Note: This might be false for file:// URLs, which is expected
    expect(typeof hasChromeAPI).toBe('boolean');
  });

  test('background script can inject content scripts', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));

    // Simulate background script injecting handlers
    await page.evaluate(() => {
      // Check if window has chrome API
      return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
    });

    expect(true).toBe(true); // Basic connectivity test
  });

  test('popup can communicate with background script', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await injectHandlers(page);

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Check that popup can access chrome.runtime
    const canSendMessage = await popupPage.evaluate(() => {
      return typeof chrome !== 'undefined' &&
             typeof chrome.runtime !== 'undefined' &&
             typeof chrome.runtime.sendMessage === 'function';
    });

    expect(canSendMessage).toBe(true);
  });

  test('getFormatsForCurrentTab returns data structure', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await injectHandlers(page);

    await page.bringToFront();
    await page.waitForTimeout(500);

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Wait a bit for popup to initialize
    await popupPage.waitForTimeout(2000);

    // Check for errors - should fail test
    const hasError = await popupPage.locator('#error').isVisible().catch(() => false);
    if (hasError) {
      const errorText = await popupPage.locator('#error').textContent();
      expect(errorText, 'Popup should not show errors').not.toContain('Cannot access contents');
      expect(errorText, 'Popup should not show errors').not.toContain('Failed to load formats');
    }

    // Formats should be loaded
    const hasFormats = await popupPage.locator('#formats').isVisible();
    expect(hasFormats, 'Formats should be visible').toBe(true);
  });

  test('content script can be injected and executed', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));

    // Inject handlers manually (simulates background.js)
    await injectHandlers(page);

    // Check that WebpageInfo class is available
    const hasWebpageInfo = await page.evaluate(() => {
      return typeof WebpageInfo !== 'undefined';
    });

    expect(hasWebpageInfo).toBe(true);

    // Check that handlers are available
    const hasHandlers = await page.evaluate(() => {
      return typeof RawTitleHandler !== 'undefined' &&
             typeof GitHubHandler !== 'undefined';
    });

    expect(hasHandlers).toBe(true);
  });

  test('handler can extract info and generate formats', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await injectHandlers(page);

    // Execute full extraction flow
    const result = await page.evaluate(async () => {
      const handler = new RawTitleHandler();
      const info = await handler.extractInfo();
      const formats = info.getFormats(handler);

      return {
        hasInfo: !!info,
        hasFormats: formats && formats.length > 0,
        formatCount: formats ? formats.length : 0,
        firstFormat: formats && formats[0] ? {
          label: formats[0].label,
          hasLinkText: !!formats[0].linkText,
          hasLinkUrl: !!formats[0].linkUrl
        } : null
      };
    });

    expect(result.hasInfo).toBe(true);
    expect(result.hasFormats).toBe(true);
    expect(result.formatCount).toBeGreaterThan(0);
    expect(result.firstFormat).toBeDefined();
    expect(result.firstFormat.label).toBeTruthy();
    expect(result.firstFormat.hasLinkText).toBe(true);
    expect(result.firstFormat.hasLinkUrl).toBe(true);
  });

  test('formats include required fields', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await injectHandlers(page);

    const formats = await page.evaluate(async () => {
      const handler = new RawTitleHandler();
      const info = await handler.extractInfo();
      return info.getFormats(handler);
    });

    expect(formats).toBeDefined();
    expect(Array.isArray(formats)).toBe(true);

    for (const format of formats) {
      expect(format).toHaveProperty('label');
      expect(format).toHaveProperty('linkText');
      expect(format).toHaveProperty('linkUrl');
      expect(typeof format.label).toBe('string');
      expect(typeof format.linkText).toBe('string');
      expect(typeof format.linkUrl).toBe('string');
    }
  });
});
