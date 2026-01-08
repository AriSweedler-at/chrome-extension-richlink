# Claude Development Guide

## Project Overview

Rich Link Chrome Extension is a Manifest V3 Chrome extension that copies rich links (HTML + plain text) from web pages using keyboard shortcuts. The extension supports multiple site-specific handlers that extract structured information from different platforms.

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Load in Chrome for testing
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select this directory
```

## Architecture

### Core Components

1. **background.js** - Service worker that listens for keyboard commands and coordinates content script injection
2. **content/** - Content scripts injected into web pages
   - **content.js** - Main coordinator, handles format cycling and handler selection
   - **clipboard.js** - Clipboard operations (HTML + plain text)
   - **notifications.js** - Toast notifications for user feedback
   - **handlers/** - Site-specific extraction logic

### Handler Pattern

All handlers extend the `Handler` base class and implement:

```javascript
class CustomHandler extends Handler {
  // Label shown in format picker
  getBaseLabel() {
    return 'Custom Label';
  }

  // Check if this handler should process the URL
  canHandle(url) {
    return url.includes('example.com');
  }

  // Extract title/header information from the page
  async extractInfo() {
    const titleText = document.querySelector('.title').textContent;
    const titleUrl = window.location.href;
    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }

  // Optional: Skip raw title handler if this handler already provides title
  skipRawTitleHandler() {
    return false;
  }
}
```

### Handler Selection Order

Handlers are checked in order in `content/content.js`:
1. GoogleDocsHandler
2. AtlassianHandler
3. AirtableHandler
4. GitHubHandler
5. SpinnakerHandler
6. RawTitleHandler (fallback - page title)
7. RawUrlHandler (fallback - raw URL)

## Key Concepts

### Format Cycling

- Users can press the keyboard shortcut multiple times within 1 second to cycle through formats
- Each page typically has 2-3 formats: base, with-header, raw URL
- Formats are cached in localStorage with a 1000ms TTL
- Format index is incremented on each press

### WebpageInfo Object

Central data structure that holds page information:

```javascript
new WebpageInfo({
  titleText: string,      // Main title
  titleUrl: string,       // URL for title link
  headerText: string?,    // Optional header/section
  headerUrl: string?,     // Optional URL for header link
  style: string?          // Optional style (e.g., 'spinnaker')
})
```

### Clipboard Format

The extension writes both formats to clipboard:
- **HTML**: `<a href="url">text</a>` - rich link
- **Plain text**: `[text](url)` - markdown format

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/handlers.test.js

# Run with coverage
npm test -- --coverage
```

### Test Structure

Tests use Jest with VM modules (experimental). Key test areas:

1. **Handler URL detection** - `canHandle()` method for each handler
2. **WebpageInfo** - Formatting, caching, format cycling
3. **Format generation** - Correct labels and link text/URLs

### TDD Approach

When adding new features or handlers:

1. Write failing test first (RED)
2. Run test and verify it fails for expected reason
3. Write minimal code to pass (GREEN)
4. Run test and verify it passes
5. Refactor if needed while keeping tests green

## Common Tasks

### Adding a New Handler

1. Create `content/handlers/new-site.js`:
```javascript
class NewSiteHandler extends Handler {
  getBaseLabel() { return 'Site Label'; }
  canHandle(url) { /* detection logic */ }
  async extractInfo() { /* extraction logic */ }
}
```

2. Update `content/content.js` - add handler to array
3. Update `background.js` - add to injected files
4. Add tests in `tests/handlers.test.js`
5. Update `README.md` supported sites list

### Modifying URL Detection

Example: GitHub handler supports PR URLs with any path suffix:

```javascript
canHandle(url) {
  // Matches: github.com/org/repo/pull/123[/changes|/files|etc]
  const parts = url.split('/');
  if (parts.length < 7) return false;

  return parts[2] === 'github.com' &&
         parts[5] === 'pull' &&
         /^\d+$/.test(parts[6]);
  // parts[7]+ can be anything (changes, files, commits, etc.)
}
```

### Debugging

1. Check Chrome DevTools console in content page
2. Check Service Worker console (chrome://extensions/ → "Inspect views: service worker")
3. Use `console.log` in handlers (output visible in page console)
4. Check localStorage for cached WebpageInfo

## File Structure

```
chrome-extension-richlinker/
├── manifest.json              # Extension configuration
├── background.js              # Service worker
├── package.json               # Dependencies and scripts
├── jest.config.js             # Test configuration
├── content/
│   ├── content.js            # Main content script coordinator
│   ├── clipboard.js          # Clipboard operations
│   ├── notifications.js      # Toast notifications
│   └── handlers/
│       ├── base.js           # Handler base class & WebpageInfo
│       ├── google-docs.js    # Google Docs handler
│       ├── atlassian.js      # Confluence handler
│       ├── airtable.js       # Airtable handler
│       ├── github.js         # GitHub PR handler
│       ├── spinnaker.js      # Spinnaker handler
│       ├── raw_title.js      # Fallback: page title
│       └── raw_url.js        # Fallback: raw URL
├── popup/
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic
│   └── popup.css             # Popup styles
├── shared/
│   ├── commands.js           # Command constants
│   └── execute.js            # Shared execution logic
├── tests/
│   ├── handlers.test.js      # Handler tests
│   └── setup.js              # Test setup
└── icons/                    # Extension icons

```

## Key Patterns to Remember

1. **Handler detection is order-dependent** - specific handlers before generic ones
2. **Handlers must be stateless** - each invocation should be independent
3. **Format cycling uses localStorage** - 1000ms TTL for same-page detection
4. **Manifest V3** - uses service worker, not background page
5. **Dynamic injection** - content scripts injected on-demand, not declaratively

## Gotchas

- **Service worker lifecycle**: Can stop/restart, don't maintain state there
- **Content script injection timing**: Must wait for handler files to load before using
- **localStorage timing**: Must handle expired cache gracefully
- **DOM selectors**: Different sites may change their DOM structure - make selectors resilient

## Chrome Web Store

Extension is configured for Chrome Web Store submission:
- Icons: 16x16, 48x48, 128x128 in `icons/`
- Store assets: Screenshots, promo images in `store-assets/`
- Privacy: No remote code, no analytics, no host_permissions needed

## Related Documentation

- README.md - User-facing documentation
- manifest.json - Extension configuration and permissions
- tests/ - Comprehensive test examples
