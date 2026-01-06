import { describe, test, expect, beforeEach } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock globals
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

global.NotificationSystem = {
  showSuccess: () => {},
  showError: () => {},
  showDebug: () => {},
};

global.Clipboard = {
  write: async () => true,
};

// Load source files
const fs = await import('fs');
const path = await import('path');

function loadSource(filepath) {
  const code = fs.readFileSync(path.join(process.cwd(), filepath), 'utf8');
  eval(code);
}

// Load base classes and handlers
loadSource('content/handlers/base.js');
loadSource('content/handlers/google-docs.js');
loadSource('content/handlers/atlassian.js');
loadSource('content/handlers/airtable.js');
loadSource('content/handlers/github.js');
loadSource('content/handlers/spinnaker.js');

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

    info.cache();
    const cached = WebpageInfo.getCached();

    expect(cached).not.toBe(null);
    expect(cached.titleText).toBe('Test');
    expect(cached.titleUrl).toBe('https://example.com');
  });

  test('should expire cached WebpageInfo after 1000ms', () => {
    const info = new WebpageInfo({
      titleText: 'Test',
      titleUrl: 'https://example.com'
    });

    info.cache();

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

  test('should extract document title', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head><title>My Doc - Google Docs</title></head><body></body></html>', {
      url: 'https://docs.google.com/document/d/123/edit'
    });
    global.document = dom.window.document;
    global.window = dom.window;

    const handler = new GoogleDocsHandler();
    const info = await handler.extractInfo();

    expect(info.titleText).toBe('My Doc');
    expect(info.titleUrl).toBe('https://docs.google.com/document/d/123/edit');
  });
});

describe('AtlassianHandler', () => {
  test('should detect Atlassian Confluence URLs', () => {
    const handler = new AtlassianHandler();

    expect(handler.canHandle('https://company.atlassian.net/wiki/spaces/TEAM/pages/123')).toBe(true);
    expect(handler.canHandle('https://example.com')).toBe(false);
  });

  test('should clean page title', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head><title>Page Title - Team Space - Confluence</title></head><body></body></html>', {
      url: 'https://company.atlassian.net/wiki/spaces/TEAM/pages/123'
    });
    global.document = dom.window.document;
    global.window = dom.window;

    const handler = new AtlassianHandler();
    const info = await handler.extractInfo();

    expect(info.titleText).toBe('Page Title');
    expect(info.headerText).toBe(null);
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

  test('should extract PR title', async () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1 class="gh-header-title">Fix bug in authentication</h1>
        </body>
      </html>
    `, {
      url: 'https://github.com/owner/repo/pull/123'
    });
    global.document = dom.window.document;
    global.window = dom.window;

    const handler = new GitHubHandler();
    const info = await handler.extractInfo();

    expect(info.titleText).toBe('Fix bug in authentication');
    expect(info.titleUrl).toBe('https://github.com/owner/repo/pull/123');
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

  test('should extract info for executions list page', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions'
    });
    global.document = dom.window.document;
    global.window = dom.window;

    const handler = new SpinnakerHandler();
    const info = await handler.extractInfo();

    expect(info.titleText).toBe('my-app');
    expect(info.titleUrl).toBe('https://spinnaker.k8s.prod.cloud/#/applications/my-app/executions');
    expect(info.headerText).toBe(null);
    expect(info.style).toBe('spinnaker');
  });
});
