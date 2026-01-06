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
- **Double-press detection:**
  - On supported sites: Press twice within 1 second to include header/section
  - On other sites: First press copies rich link, second press copies raw URL only
- **Rich format:** Copies both HTML link and plain text
- **Toast notifications:** Visual feedback on copy success
- **Universal fallback:** Works on ANY website - automatically copies page title and URL

## Installation

### For Development

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension-richlinker` directory

### Usage

1. Navigate to any website
2. Press **Shift+Command+C** (or **Ctrl+Shift+C** on Windows/Linux)
3. The rich link is copied to your clipboard
4. Press again within 1 second:
   - **On supported sites:** Includes header/section info in the link
   - **On other sites:** Copies just the raw URL (no title)

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

## License

MIT
