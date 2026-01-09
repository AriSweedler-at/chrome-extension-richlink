# Rich Link Chrome Extension

Copy rich links (HTML + plain text) from web pages using the **Shift+Command+C** keyboard shortcut.

## Supported Sites

- **Google Docs** - Copies document title and current heading
- **Atlassian Confluence** - Copies page title
- **Airtable** - Copies record title (specific applications)
- **GitHub PRs** - Copies PR title
- **Spinnaker** - Copies application and pipeline name
- **Any website** - Fallback: copies page title and URL

## Features

- **Keyboard shortcut:** Shift+Command+C (Mac) / Ctrl+Shift+C (Windows/Linux)
  - Repeatedly press to cycle through all available formats
  - Each page has 2-3 formats (base, with-header, raw URL)
- **Popup menu:** Click the extension icon to see all formats and click to copy
- **Format cycling:** Press within 1 second to cycle to next format
- **Rich format:** Copies both HTML link and plain text
- **Toast notifications:** Visual feedback on copy success with format indicator [N/Total]
- **Universal fallback:** Works on ANY website - automatically copies page title and URL

## Installation

### For Development

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension-richlinker` directory

### Usage

**Method 1: Keyboard Shortcut (Quick)**
1. Navigate to any website
2. Press **Shift+Command+C** (or **Ctrl+Shift+C** on Windows/Linux)
3. Press repeatedly to cycle through formats (e.g., base → with-header → raw URL)

**Method 2: Popup Menu (Visual)**
1. Navigate to any website
2. Click the extension icon in your toolbar
3. See all available formats for the current page
4. Click any format to copy it

## Architecture

- **Manifest V3** Chrome extension
- **Service worker** background script listens for keyboard command
- **Dynamic injection** content scripts injected on-demand
- **Handler pattern** each site has dedicated extraction logic
- **Double-press detection** using localStorage caching (1000ms window)

## File Structure

```
chrome-extension-richlinker/
├── manifest.json
├── background.js
├── content/
│   ├── content.js
│   ├── notifications.js
│   ├── clipboard.js
│   └── handlers/
│       ├── base.js
│       ├── google-docs.js
│       ├── atlassian.js
│       ├── airtable.js
│       ├── github.js
│       └── spinnaker.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

To add support for a new site:

1. Create new handler in `content/handlers/your-site.js`
2. Extend `Handler` base class
3. Implement `canHandle(url)` and `extractInfo()` methods
4. Register handler in `content/content.js`
5. Update `background.js` to inject new handler file

### Testing

#### Unit Tests

Run unit tests with Jest:

```bash
npm install
npm test
```

Run specific test file:

```bash
npm test tests/handlers.test.js
```

Unit tests cover:
- Handler URL detection logic
- WebpageInfo formatting and cycling
- Format generation for different handlers

#### E2E Browser Tests

Run end-to-end browser tests with Playwright:

```bash
# Run all e2e tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with debugger
npm run test:e2e:debug
```

E2E tests cover:
- **Popup UI** - Loading states, format display, clipboard copying
- **Content Extraction** - Handler extraction from mock pages
- **Message Passing** - Background ↔ Content ↔ Popup communication

**Note:** E2E tests run in non-headless Chrome (required for extensions) and use mock HTML fixtures in `tests/e2e/fixtures/`. To update fixtures, visit the actual sites and save the HTML source.

## License

MIT
