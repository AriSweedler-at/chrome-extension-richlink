import { test, expect } from '@playwright/test';
import { loadExtension, getFixturePath, injectHandlers } from './helpers/extension.js';

test.describe('Handler Content Extraction', () => {
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

  test('GitHubHandler extracts PR title and number', async () => {
    const page = await context.newPage();

    // Block all script requests to prevent GitHub's JS from running
    await page.route('**/*.js', route => route.abort());

    await page.goto(getFixturePath('github-pr.html'), { waitUntil: 'domcontentloaded' });

    // Wait for the PR title element to be present
    await page.waitForSelector('.gh-header-title', { timeout: 5000 });

    // Unblock scripts so we can inject our handlers
    await page.unroute('**/*.js');

    // Inject handlers and content script
    await injectHandlers(page);

    // Execute handler logic
    const info = await page.evaluate(() => {
      const handler = new GitHubHandler();
      const testUrl = 'https://github.com/facebook/react/pull/31820';

      // Check if handler can detect GitHub PRs
      const canHandle = handler.canHandle(testUrl);
      if (!canHandle) {
        return { error: 'Handler does not recognize GitHub PR URL' };
      }

      // Extract info from the page
      return handler.extractInfo();
    });

    expect(info).toBeDefined();
    expect(info.error).toBeUndefined();
    expect(info.titleText).toBeTruthy();
    expect(info.titleUrl).toBeTruthy();
  });

  test('GoogleDocsHandler extracts document title', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('google-docs.html'));

    await injectHandlers(page);

    const info = await page.evaluate(() => {
      const handler = new GoogleDocsHandler();
      const testUrl = 'https://docs.google.com/document/d/test123/edit';

      const canHandle = handler.canHandle(testUrl);
      if (!canHandle) {
        return { error: 'Handler does not recognize Google Docs URL' };
      }

      return handler.extractInfo();
    });

    expect(info).toBeDefined();
    expect(info.error).toBeUndefined();
    expect(info.titleText).toBeTruthy();
  });

  test('AtlassianHandler extracts Confluence page title', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('confluence.html'));

    await injectHandlers(page);

    const info = await page.evaluate(() => {
      const handler = new AtlassianHandler();
      const testUrl = 'https://company.atlassian.net/wiki/spaces/TEAM/pages/123';

      const canHandle = handler.canHandle(testUrl);
      if (!canHandle) {
        return { error: 'Handler does not recognize Confluence URL' };
      }

      return handler.extractInfo();
    });

    expect(info).toBeDefined();
    expect(info.error).toBeUndefined();
    expect(info.titleText).toBeTruthy();
  });

  test('RawTitleHandler works as fallback for generic pages', async () => {
    const page = await context.newPage();
    await page.goto(getFixturePath('generic-page.html'));

    await injectHandlers(page);

    const info = await page.evaluate(() => {
      const handler = new RawTitleHandler();
      return handler.extractInfo();
    });

    expect(info).toBeDefined();
    expect(info.titleText).toBe('Test Page Title');
    expect(info.titleUrl).toBeTruthy();
  });

  test('Handlers generate correct format labels', async () => {
    const page = await context.newPage();

    // Use generic page instead of GitHub to avoid navigation issues
    await page.goto(getFixturePath('generic-page.html'), { waitUntil: 'domcontentloaded' });
    await injectHandlers(page);

    const formats = await page.evaluate(async () => {
      const handler = new RawTitleHandler();
      const info = await handler.extractInfo();
      return info.getFormats(handler);
    });

    expect(formats).toBeDefined();
    expect(formats.length).toBeGreaterThan(0);
    expect(formats[0].label).toBeTruthy();
    expect(formats[0].linkText).toBeTruthy();
    expect(formats[0].linkUrl).toBeTruthy();
  });
});
