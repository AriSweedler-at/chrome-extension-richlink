import { test, expect } from '@playwright/test';
import { loadExtension, getFixturePath } from './helpers/extension.js';

test.describe('Keyboard Shortcut Flow', () => {
  let context;
  let cleanup;

  test.beforeAll(async () => {
    const result = await loadExtension();
    context = result.context;
    cleanup = result.cleanup;
  });

  test.afterAll(async () => {
    await context.close();
    await cleanup();
  });

  // Helper to wait for content scripts to be ready
  async function waitForContentScripts(page) {
    await page.waitForFunction(() => {
      return typeof execute === 'function' &&
             typeof Clipboard === 'object' &&
             typeof WebpageInfo === 'function';
    }, { timeout: 5000 });
  }

  test('execute function copies to clipboard', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));

    // Wait for content scripts to be auto-injected by Chrome
    await waitForContentScripts(page);

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Call execute() function (simulates Shift+Command+C)
    const result = await page.evaluate(async () => {
      try {
        await execute();
        const clipboardText = await navigator.clipboard.readText();
        return { success: true, clipboardText };
      } catch (error) {
        return { success: false, error: error.message, stack: error.stack };
      }
    });

    expect(result.success).toBe(true);
    expect(result.clipboardText).toBeTruthy();
    // Should be in format: "Title (URL)"
    expect(result.clipboardText).toMatch(/.*\(http/);
  });

  test('format cycling works on multiple execute() calls', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await waitForContentScripts(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // First press - should copy format 0
    const result1 = await page.evaluate(async () => {
      await execute();
      const clipboardText = await navigator.clipboard.readText();
      const cached = WebpageInfo.getCached();
      return {
        clipboardText,
        formatIndex: cached ? cached.formatIndex : null
      };
    });

    expect(result1.formatIndex).toBe(0);
    expect(result1.clipboardText).toBeTruthy();

    // Second press immediately (within 1000ms) - should cycle to format 1
    const result2 = await page.evaluate(async () => {
      await execute();
      const clipboardText = await navigator.clipboard.readText();
      const cached = WebpageInfo.getCached();
      return {
        clipboardText,
        formatIndex: cached ? cached.formatIndex : null
      };
    });

    expect(result2.formatIndex).toBe(1);
    // Clipboard text should have changed
    expect(result2.clipboardText).not.toBe(result1.clipboardText);
  });

  test('cache expires after 1 second', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await waitForContentScripts(page);

    // Cache a format
    await page.evaluate(async () => {
      const handler = new RawTitleHandler();
      const info = await handler.extractInfo();
      info.cache(1);
    });

    // Wait for cache to expire (1000ms TTL)
    await page.waitForTimeout(1100);

    // Check that cache is expired
    const result = await page.evaluate(() => {
      const cached = WebpageInfo.getCached();
      return { cached: cached };
    });

    expect(result.cached).toBeNull();
  });

  test('clipboard writes both HTML and plain text formats', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await waitForContentScripts(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const result = await page.evaluate(async () => {
      const testHtml = '<a href="https://example.com">Test Link</a>';
      const testText = 'Test Link (https://example.com)';

      const success = await Clipboard.write({
        html: testHtml,
        text: testText
      });

      // Read back from clipboard
      const clipboardText = await navigator.clipboard.readText();

      return {
        success,
        clipboardText
      };
    });

    expect(result.success).toBe(true);
    expect(result.clipboardText).toBe('Test Link (https://example.com)');
  });

  test('GitHub PR handler extracts correct format', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('github-pr.html'));
    await waitForContentScripts(page);

    const result = await page.evaluate(async () => {
      // Find the right handler
      const handlers = [
        new GoogleDocsHandler(),
        new AtlassianHandler(),
        new AirtableHandler(),
        new GitHubHandler(),
        new SpinnakerHandler(),
        new RawTitleHandler(),
        new RawUrlHandler()
      ];

      const currentUrl = window.location.href;
      const handler = handlers.find(h => h.canHandle(currentUrl));

      if (!handler) {
        return { error: 'No handler found' };
      }

      const info = await handler.extractInfo();
      const formats = info.getFormats(handler);

      return {
        handlerName: handler.constructor.name,
        formatCount: formats.length,
        firstFormat: formats[0] ? {
          label: formats[0].label,
          linkText: formats[0].linkText,
          linkUrl: formats[0].linkUrl
        } : null
      };
    });

    expect(result.handlerName).toBe('GitHubHandler');
    expect(result.formatCount).toBeGreaterThan(0);
    expect(result.firstFormat).toBeDefined();
    expect(result.firstFormat.label).toContain('GitHub');
  });

  test('raw URL format works correctly', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await waitForContentScripts(page);

    const result = await page.evaluate(async () => {
      const handler = new RawUrlHandler();
      const info = await handler.extractInfo();
      const formats = info.getFormats(handler);

      const format = formats[0];

      return {
        label: format.label,
        linkText: format.linkText,
        linkUrl: format.linkUrl,
        areEqual: format.linkText === format.linkUrl
      };
    });

    expect(result.label).toContain('Raw URL');
    expect(result.areEqual).toBe(true);
    expect(result.linkText).toMatch(/^http/);
  });

  test('format cycling resets after cache expiration', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));
    await waitForContentScripts(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // First execute - format 0
    await page.evaluate(async () => {
      await execute();
    });

    const cached1 = await page.evaluate(() => WebpageInfo.getCached());
    expect(cached1.formatIndex).toBe(0);

    // Wait for cache to expire
    await page.waitForTimeout(1100);

    // Execute again - should reset to format 0
    await page.evaluate(async () => {
      await execute();
    });

    const cached2 = await page.evaluate(() => WebpageInfo.getCached());
    expect(cached2.formatIndex).toBe(0);
  });
});
