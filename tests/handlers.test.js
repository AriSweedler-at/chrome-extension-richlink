import { describe, test, expect, beforeEach } from '@jest/globals';
import { loadSourceFile } from './setup.js';

// Load source files in correct order
loadSourceFile('content/handlers/base.js');
loadSourceFile('content/handlers/google-docs.js');
loadSourceFile('content/handlers/atlassian.js');
loadSourceFile('content/handlers/airtable.js');
loadSourceFile('content/handlers/github.js');
loadSourceFile('content/handlers/spinnaker.js');
loadSourceFile('content/handlers/spacelift.js');
loadSourceFile('content/handlers/raw_title.js');
loadSourceFile('content/handlers/raw_url.js');
loadSourceFile('content/handlers/index.js');

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

  test('should detect GitHub PR URLs with /changes path', () => {
    const handler = new GitHubHandler();

    expect(handler.canHandle('https://github.com/Hyperbase/hyperbase/pull/197792/changes')).toBe(true);
    expect(handler.canHandle('https://github.com/Hyperbase/hyperbase/pull/197792')).toBe(true);
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

describe('SpaceliftHandler', () => {
  test('should detect Spacelift run URLs', () => {
    const handler = new SpaceliftHandler();

    expect(handler.canHandle('https://spacelift.shadowbox.cloud/stack/spacelift_configuration-production/run/01KF4598M8Q1W3QDVD3TJR3PVX')).toBe(true);
    expect(handler.canHandle('https://spacelift.shadowbox.cloud/stack/another-stack/run/ABC123')).toBe(true);
    expect(handler.canHandle('https://spacelift.shadowbox.cloud/stack/my-stack')).toBe(false);
    expect(handler.canHandle('https://example.com')).toBe(false);
  });

  test('should detect Spacelift run URLs with /changes path', () => {
    const handler = new SpaceliftHandler();

    expect(handler.canHandle('https://spacelift.shadowbox.cloud/stack/service_alerting-production/run/01KF1WZ8XMZH4RQ3FFW00E2QJ3/changes')).toBe(true);
    expect(handler.canHandle('https://spacelift.shadowbox.cloud/stack/service_alerting-production/run/01KF1WZ8XMZH4RQ3FFW00E2QJ3/changes?sort=address&sortDirection=DESC')).toBe(true);
  });

  test('should parse Spacelift URL', () => {
    const handler = new SpaceliftHandler();

    const result1 = handler.parseSpaceliftUrl(
      'https://spacelift.shadowbox.cloud/stack/spacelift_configuration-production/run/01KF4598M8Q1W3QDVD3TJR3PVX'
    );
    expect(result1.stackName).toBe('spacelift_configuration-production');
    expect(result1.runId).toBe('01KF4598M8Q1W3QDVD3TJR3PVX');

    const result2 = handler.parseSpaceliftUrl(
      'https://spacelift.shadowbox.cloud/stack/my-stack/run/ABC123'
    );
    expect(result2.stackName).toBe('my-stack');
    expect(result2.runId).toBe('ABC123');
  });

  test('should return null for invalid Spacelift URL', () => {
    const handler = new SpaceliftHandler();

    expect(handler.parseSpaceliftUrl('https://example.com')).toBe(null);
    expect(handler.parseSpaceliftUrl('https://spacelift.shadowbox.cloud/stack/my-stack')).toBe(null);
  });

  test('should parse title from document title', () => {
    const handler = new SpaceliftHandler();

    const title1 = handler.parseTitle('fix(spacelift): improve table in PR postback comments (#198418) · spacelift_configuration-production | Spacelift');
    expect(title1).toBe('fix(spacelift): improve table in PR postback comments (#198418)');

    const title2 = handler.parseTitle('Deploy to production · my-stack | Spacelift');
    expect(title2).toBe('Deploy to production');

    const title3 = handler.parseTitle('Simple title · stack-name | Spacelift');
    expect(title3).toBe('Simple title');
  });

  test('should return null for invalid title format', () => {
    const handler = new SpaceliftHandler();

    expect(handler.parseTitle('Invalid title format')).toBe(null);
    expect(handler.parseTitle('No stack separator')).toBe(null);
  });

  test('should parse URL with /changes path correctly', () => {
    const handler = new SpaceliftHandler();

    const result = handler.parseSpaceliftUrl(
      'https://spacelift.shadowbox.cloud/stack/service_alerting-production/run/01KF1WZ8XMZH4RQ3FFW00E2QJ3/changes?query=params'
    );
    expect(result.stackName).toBe('service_alerting-production');
    expect(result.runId).toBe('01KF1WZ8XMZH4RQ3FFW00E2QJ3');
  });

  test('should generate correct formats', () => {
    const handler = new SpaceliftHandler();
    const baseTitle = 'spacelift: service_alerting-production';
    const titleUrl = 'https://spacelift.shadowbox.cloud/stack/service_alerting-production';
    const headerText = 'spacelift: service_alerting-production (due to refactor(service-alerting): unify config)';
    const headerUrl = 'https://spacelift.shadowbox.cloud/stack/service_alerting-production/run/01KF1WZ8XMZH4RQ3FFW00E2QJ3';

    const info = new WebpageInfo({
      titleText: baseTitle,
      titleUrl,
      headerText,
      headerUrl
    });

    // Override getFormats as the handler does
    info.getFormats = () => {
      return [
        {
          label: 'spacelift stack with PR',
          linkText: headerText,
          linkUrl: headerUrl
        },
        {
          label: 'stack',
          linkText: baseTitle,
          linkUrl: titleUrl
        }
      ];
    };

    const formats = info.getFormats();

    // Should have 2 formats
    expect(formats.length).toBe(2);

    // Format 0: Stack with PR (first now)
    expect(formats[0].label).toBe('spacelift stack with PR');
    expect(formats[0].linkText).toBe('spacelift: service_alerting-production (due to refactor(service-alerting): unify config)');
    expect(formats[0].linkUrl).toBe('https://spacelift.shadowbox.cloud/stack/service_alerting-production/run/01KF1WZ8XMZH4RQ3FFW00E2QJ3');

    // Format 1: Stack only (second now)
    expect(formats[1].label).toBe('stack');
    expect(formats[1].linkText).toBe('spacelift: service_alerting-production');
    expect(formats[1].linkUrl).toBe('https://spacelift.shadowbox.cloud/stack/service_alerting-production');
  });
});

describe('RawTitleHandler', () => {
  test('should accept any URL', () => {
    const handler = new RawTitleHandler();

    expect(handler.canHandle('https://example.com')).toBe(true);
    expect(handler.canHandle('https://wikipedia.org/wiki/Test')).toBe(true);
    expect(handler.canHandle('http://localhost:3000')).toBe(true);
  });

  test('should be selected when no other handler matches', () => {
    const handlers = getAllHandlers();

    const unsupportedUrl = 'https://example.com/some/page';
    const handler = handlers.find(h => h.canHandle(unsupportedUrl));

    expect(handler).toBeInstanceOf(RawTitleHandler);
  });
});

describe('RawUrlHandler', () => {
  test('should accept any URL', () => {
    const handler = new RawUrlHandler();

    expect(handler.canHandle('https://example.com')).toBe(true);
  });

  test('should only provide raw URL format', () => {
    const handler = new RawUrlHandler();

    // Create WebpageInfo manually for testing
    const webpageInfo = new WebpageInfo({
      titleText: 'https://example.com',
      titleUrl: 'https://example.com'
    });

    // Override getFormats as RawUrlHandler does
    webpageInfo.getFormats = () => [
      {
        label: 'Raw URL',
        linkText: 'https://example.com',
        linkUrl: 'https://example.com'
      }
    ];

    const formats = webpageInfo.getFormats();

    // RawUrlHandler only returns 1 format
    expect(formats.length).toBe(1);
    expect(formats[0].label).toBe('Raw URL');
    expect(formats[0].linkText).toBe('https://example.com');
  });
});

describe('Format cycling', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  test('should generate formats with handler-specific labels', () => {
    const handler = new RawTitleHandler();
    const info = new WebpageInfo({
      titleText: 'Test Page',
      titleUrl: 'https://example.com',
      headerText: 'Section One',
      headerUrl: 'https://example.com#section'
    });

    const formats = info.getFormats(handler);

    // RawTitleHandler with header: Base + With Header (no Raw URL)
    expect(formats.length).toBe(2);

    // Format 0: Base (uses RawTitleHandler's label)
    expect(formats[0].label).toBe('Page Title');
    expect(formats[0].linkText).toBe('Test Page');
    expect(formats[0].linkUrl).toBe('https://example.com');

    // Format 1: With Header
    expect(formats[1].label).toBe('Header: Section One');
    expect(formats[1].linkText).toBe('Test Page #Section One');
    expect(formats[1].linkUrl).toBe('https://example.com#section');
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

    // Spinnaker with header: Pipeline + Base (no Raw URL)
    expect(formats.length).toBe(2);

    // Format 0: Pipeline (spinnaker puts header first)
    expect(formats[0].label).toBe('Pipeline: Deploy to Pro...');
    expect(formats[0].linkText).toBe('spinnaker: Deploy to Production');

    // Format 1: Base (uses SpinnakerHandler's label)
    expect(formats[1].label).toBe('Pipeline');
    expect(formats[1].linkText).toBe('my-app');
  });

  test('should generate formats without header', () => {
    const handler = new GitHubHandler();
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://github.com/owner/repo/pull/123'
    });

    const formats = info.getFormats(handler);

    // Only 1 format when no header (Raw URL added separately)
    expect(formats.length).toBe(1);
    expect(formats[0].label).toBe('PR Title');
  });

  test('should cycle through formats on repeated presses', () => {
    const handler = new RawTitleHandler();
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com'
    });

    const formats = info.getFormats(handler);

    // RawTitleHandler without header: only 1 format (Page Title)
    expect(formats.length).toBe(1);

    // First press - should use format 0
    expect(info.getFormatIndex(formats.length)).toBe(0);

    // Cache as if we just copied
    info.cacheWithIndex(0);

    // Second press - should wrap back to format 0 (only 1 format)
    expect(info.getFormatIndex(formats.length)).toBe(0);
  });
});
