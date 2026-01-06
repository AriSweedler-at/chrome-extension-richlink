import { describe, test, expect, beforeEach } from '@jest/globals';
import { loadSourceFile } from './setup.js';

// Load source files in correct order
loadSourceFile('content/handlers/base.js');
loadSourceFile('content/handlers/google-docs.js');
loadSourceFile('content/handlers/atlassian.js');
loadSourceFile('content/handlers/airtable.js');
loadSourceFile('content/handlers/github.js');
loadSourceFile('content/handlers/spinnaker.js');
loadSourceFile('content/handlers/raw_url.js');

describe('WebpageInfo', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  test('should create instance with required fields', () => {
    const info = new WebpageInfo({
      titleText: 'Test Page',
      titleUrl: 'https://example.com'
    });

    expect(info.titleText).toBe('Test Page');
    expect(info.titleUrl).toBe('https://example.com');
    expect(info.headerText).toBe(null);
    expect(info.headerUrl).toBe(null);
    expect(info.style).toBe('normal');
  });

  test('should shorten long text with ellipsis', () => {
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com'
    });

    expect(info.shorty('Short', 30)).toBe('Short');
    expect(info.shorty('This is a very long text that exceeds the maximum length', 20))
      .toBe('This is a very lo...');
  });

  test('should generate preview without header', () => {
    const info = new WebpageInfo({
      titleText: 'My Document',
      titleUrl: 'https://example.com'
    });

    expect(info.preview(false)).toBe('* title: My Document');
  });

  test('should generate preview with header', () => {
    const info = new WebpageInfo({
      titleText: 'My Document',
      titleUrl: 'https://example.com',
      headerText: 'Section One'
    });

    expect(info.preview(true)).toBe('* title: My Document\n* header: Section One');
  });

  test('should detect same WebpageInfo', () => {
    const info1 = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com',
      headerText: 'Header',
      headerUrl: 'https://example.com#header'
    });

    const info2 = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com',
      headerText: 'Header',
      headerUrl: 'https://example.com#header'
    });

    const info3 = new WebpageInfo({
      titleText: 'Different',
      titleUrl: 'https://example.com',
      headerText: 'Header',
      headerUrl: 'https://example.com#header'
    });

    expect(info1.isSameAs(info2)).toBe(true);
    expect(info1.isSameAs(info3)).toBe(false);
  });

  test('should cache and retrieve WebpageInfo', () => {
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com',
      headerText: 'Header',
      headerUrl: 'https://example.com#header'
    });

    info.cacheWithIndex(0);
    const cached = WebpageInfo.getCached();

    expect(cached).not.toBe(null);
    expect(cached.titleText).toBe('Test');
    expect(cached.titleUrl).toBe('https://example.com');
    expect(cached.formatIndex).toBe(0);
  });

  test('should expire cached WebpageInfo after 1000ms', () => {
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com'
    });

    info.cacheWithIndex(0);

    // Mock Date.now to simulate time passing
    const originalNow = Date.now;
    Date.now = () => originalNow() + 1001;

    const cached = WebpageInfo.getCached();
    expect(cached).toBe(null);

    Date.now = originalNow;
  });

  test('should format normal style link without header', () => {
    const info = new WebpageInfo({
      titleText: 'My Doc',
      titleUrl: 'https://example.com',
      headerText: 'Section',
      headerUrl: 'https://example.com#section'
    });

    const { linkText, linkUrl } = info.getLinkTextAndUrl(false);
    expect(linkText).toBe('My Doc');
    expect(linkUrl).toBe('https://example.com');
  });

  test('should format normal style link with header', () => {
    const info = new WebpageInfo({
      titleText: 'My Doc',
      titleUrl: 'https://example.com',
      headerText: 'Section',
      headerUrl: 'https://example.com#section'
    });

    const { linkText, linkUrl } = info.getLinkTextAndUrl(true);
    expect(linkText).toBe('My Doc #Section');
    expect(linkUrl).toBe('https://example.com#section');
  });

  test('should format spinnaker style link (inverted)', () => {
    const info = new WebpageInfo({
      titleText: 'my-app',
      titleUrl: 'https://spinnaker.example.com/executions',
      headerText: 'Deploy Pipeline',
      headerUrl: 'https://spinnaker.example.com/executions/123',
      style: 'spinnaker'
    });

    // First press (includeHeader=false) should show header in spinnaker style
    const first = info.getLinkTextAndUrl(false);
    expect(first.linkText).toBe('spinnaker: Deploy Pipeline');
    expect(first.linkUrl).toBe('https://spinnaker.example.com/executions/123');

    // Second press (includeHeader=true) should show base
    const second = info.getLinkTextAndUrl(true);
    expect(second.linkText).toBe('my-app');
    expect(second.linkUrl).toBe('https://spinnaker.example.com/executions');
  });
});

describe('GoogleDocsHandler', () => {
  test('should detect Google Docs URLs', () => {
    const handler = new GoogleDocsHandler();

    expect(handler.canHandle('https://docs.google.com/document/d/123/edit')).toBe(true);
    expect(handler.canHandle('https://example.com')).toBe(false);
  });
});

describe('AtlassianHandler', () => {
  test('should detect Atlassian Confluence URLs', () => {
    const handler = new AtlassianHandler();

    expect(handler.canHandle('https://company.atlassian.net/wiki/spaces/TEAM/pages/123')).toBe(true);
    expect(handler.canHandle('https://example.com')).toBe(false);
  });
});

describe('GitHubHandler', () => {
  test('should detect GitHub PR URLs', () => {
    const handler = new GitHubHandler();

    expect(handler.canHandle('https://github.com/owner/repo/pull/123')).toBe(true);
    expect(handler.canHandle('https://github.com/owner/repo/pull/456/files')).toBe(true);
    expect(handler.canHandle('https://github.com/owner/repo')).toBe(false);
    expect(handler.canHandle('https://github.com/owner/repo/issues/123')).toBe(false);
  });
});

describe('AirtableHandler', () => {
  test('should detect known Airtable URLs', () => {
    const handler = new AirtableHandler();

    expect(handler.canHandle('https://airtable.com/apptivTqaoebkrmV1/pagYS8GHSAS9swLLI/rec123')).toBe(true);
    expect(handler.canHandle('https://airtable.com/appWh5G6JXbHDKC2b/paguOM7Eb387ZUnRE/rec456')).toBe(true);
    expect(handler.canHandle('https://airtable.com/unknown/page')).toBe(false);
  });
});

describe('SpinnakerHandler', () => {
  test('should detect Spinnaker URLs', () => {
    const handler = new SpinnakerHandler();

    expect(handler.canHandle('https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions')).toBe(true);
    expect(handler.canHandle('https://spinnaker.k8s.staging.cloud/#/applications/test-app/executions/abc123')).toBe(true);
    expect(handler.canHandle('https://example.com')).toBe(false);
  });

  test('should parse Spinnaker URL', () => {
    const handler = new SpinnakerHandler();

    const result1 = handler.parseSpinnakerUrl(
      'https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions'
    );
    expect(result1.applicationName).toBe('my-app');
    expect(result1.executionId).toBe(null);

    const result2 = handler.parseSpinnakerUrl(
      'https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions/abc123'
    );
    expect(result2.applicationName).toBe('my-app');
    expect(result2.executionId).toBe('abc123');
  });

  test('should return null for invalid Spinnaker URL', () => {
    const handler = new SpinnakerHandler();

    expect(handler.parseSpinnakerUrl('https://example.com')).toBe(null);
    expect(handler.parseSpinnakerUrl('https://spinnaker.k8s.prod.cloud')).toBe(null);
  });
});

describe('RawUrlHandler', () => {
  test('should accept any URL', () => {
    const handler = new RawUrlHandler();

    expect(handler.canHandle('https://example.com')).toBe(true);
    expect(handler.canHandle('https://wikipedia.org/wiki/Test')).toBe(true);
    expect(handler.canHandle('http://localhost:3000')).toBe(true);
  });

  test('should be selected when no other handler matches', () => {
    const handlers = [
      new GoogleDocsHandler(),
      new AtlassianHandler(),
      new AirtableHandler(),
      new GitHubHandler(),
      new SpinnakerHandler(),
      new RawUrlHandler(),
    ];

    const unsupportedUrl = 'https://example.com/some/page';
    const handler = handlers.find(h => h.canHandle(unsupportedUrl));

    expect(handler).toBeInstanceOf(RawUrlHandler);
  });
});

describe('Format cycling', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  test('should generate formats with handler-specific labels', () => {
    const handler = new RawUrlHandler();
    const info = new WebpageInfo({
      titleText: 'Test Page',
      titleUrl: 'https://example.com',
      headerText: 'Section One',
      headerUrl: 'https://example.com#section'
    });

    const formats = info.getFormats(handler);

    expect(formats.length).toBe(3);

    // Format 0: Base (uses RawUrlHandler's label)
    expect(formats[0].label).toBe('Page Title');
    expect(formats[0].linkText).toBe('Test Page');
    expect(formats[0].linkUrl).toBe('https://example.com');

    // Format 1: With Header
    expect(formats[1].label).toBe('Header: Section One');
    expect(formats[1].linkText).toBe('Test Page #Section One');
    expect(formats[1].linkUrl).toBe('https://example.com#section');

    // Format 2: Raw URL
    expect(formats[2].label).toBe('Raw URL');
    expect(formats[2].linkText).toBe('https://example.com');
    expect(formats[2].linkUrl).toBe('https://example.com');
  });

  test('should truncate long header text in labels', () => {
    const handler = new GoogleDocsHandler();
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://docs.google.com/document/d/123',
      headerText: 'This is a very long header that exceeds sixteen characters',
      headerUrl: 'https://docs.google.com/document/d/123#header'
    });

    const formats = info.getFormats(handler);

    // Header label should be truncated to 16 chars
    expect(formats[1].label).toBe('Header: This is a ver...');
    expect(formats[1].label.length).toBeLessThanOrEqual(24); // "Header: " + 16 chars + "..."
  });

  test('should generate formats for Spinnaker style with pipeline label', () => {
    const handler = new SpinnakerHandler();
    const info = new WebpageInfo({
      titleText: 'my-app',
      titleUrl: 'https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions',
      headerText: 'Deploy to Production',
      headerUrl: 'https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions/123',
      style: 'spinnaker'
    });

    const formats = info.getFormats(handler);

    expect(formats.length).toBe(3);

    // Format 0: Pipeline (spinnaker puts header first)
    expect(formats[0].label).toBe('Pipeline: Deploy to Pro...');
    expect(formats[0].linkText).toBe('spinnaker: Deploy to Production');

    // Format 1: Base (uses SpinnakerHandler's label)
    expect(formats[1].label).toBe('Pipeline');
    expect(formats[1].linkText).toBe('my-app');

    // Format 2: Raw URL
    expect(formats[2].label).toBe('Raw URL');
  });

  test('should generate formats without header', () => {
    const handler = new GitHubHandler();
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://github.com/owner/repo/pull/123'
    });

    const formats = info.getFormats(handler);

    // Only 2 formats when no header
    expect(formats.length).toBe(2);
    expect(formats[0].label).toBe('PR Title');
    expect(formats[1].label).toBe('Raw URL');
  });

  test('should cycle through formats on repeated presses', () => {
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com'
    });

    const formats = info.getFormats();

    // First press - should use format 0
    expect(info.getFormatIndex(formats.length)).toBe(0);

    // Cache as if we just copied
    info.cacheWithIndex(0);

    // Second press (same page) - should use format 1
    expect(info.getFormatIndex(formats.length)).toBe(1);

    // Cache format 1
    info.cacheWithIndex(1);

    // Third press - should wrap back to format 0 (2 formats total)
    expect(info.getFormatIndex(formats.length)).toBe(0);
  });
});
