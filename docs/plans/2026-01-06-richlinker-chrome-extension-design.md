# Rich Link Chrome Extension - Design Document

**Date:** 2026-01-06
**Purpose:** Replace bookmarklet system with native Chrome extension that copies rich links via keyboard shortcut

## Overview

A Chrome extension that captures rich link information from various web pages and copies it to the clipboard in both HTML and plain text formats. Triggered by Shift+Command+C keyboard shortcut.

## Core Features

### Keyboard Shortcut
- **Shortcut:** Shift+Command+C (Mac) / Ctrl+Shift+C (Windows/Linux)
- **Action:** Copy current page as rich link
- **Double-press detection:** Press twice within 1 second to include header/section information

### Supported Sites
1. **Google Docs** - Copies document title and current heading
2. **Atlassian Confluence** - Copies page title (cleaned)
3. **Airtable** - Copies record title from specific applications
4. **GitHub PRs** - Copies PR title
5. **Spinnaker** - Copies application/pipeline name (with inverted double-press behavior)

### Visual Feedback
- Toast notification appears for 1-2 seconds
- Shows "Copied rich link to clipboard"
- Includes abbreviated preview of what was copied

## Architecture

### File Structure
```
chrome-extension-richlinker/
├── manifest.json
├── background.js (service worker)
├── content/
│   ├── content.js (main handler logic)
│   ├── notifications.js (toast UI)
│   ├── clipboard.js (clipboard utilities)
│   └── handlers/
│       ├── base.js (Handler abstract class + WebpageInfo)
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

### Component Responsibilities

**manifest.json**
- Defines extension metadata
- Registers keyboard command (Shift+Command+C)
- Declares permissions: `activeTab`, `scripting`, `clipboardWrite`

**background.js (Service Worker)**
- Listens for keyboard command events
- Identifies active tab
- Injects content scripts dynamically when shortcut is pressed

**content.js**
- Main entry point for injected scripts
- Detects current URL
- Finds appropriate handler
- Orchestrates extraction and clipboard operations

**handlers/base.js**
- `Handler` abstract class with `canHandle(url)` and `extractInfo()` methods
- `WebpageInfo` class with:
  - Properties: `titleText`, `titleUrl`, `headerText`, `headerUrl`, `style`
  - `toClipboard()` method
  - `getCached()` / `cache()` for double-press detection
  - `preview()` for notification text

**handlers/[site].js**
- Site-specific extraction logic
- Extends `Handler` base class
- Implements `canHandle()` and `extractInfo()`

**notifications.js**
- Toast notification UI system
- Shows success/error/debug messages
- Auto-dismisses after 1-2 seconds

**clipboard.js**
- Clipboard API wrapper
- Writes both HTML and plain text formats
- HTML: `<a href="URL">Link Text</a>`
- Plain text: `Link Text (URL)`

## Execution Flow

1. User presses Shift+Command+C
2. Chrome commands API triggers background service worker
3. Background worker injects content scripts into active tab
4. Content script executes:
   - Gets current URL
   - Iterates through handlers to find match
   - Handler extracts page information
   - Creates `WebpageInfo` object
   - Checks localStorage for recent copy (within 1000ms)
   - If same page copied recently → include header
   - Writes rich HTML + plain text to clipboard
   - Caches copy info to localStorage
   - Shows toast notification with preview
5. Scripts complete and unload

## Double-Press Behavior

**Normal style (most sites):**
- First press: copies base link (title + base URL)
- Second press (within 1s): copies with header (title + header + header URL)

**Spinnaker style (inverted):**
- First press: copies header link ("spinnaker: Pipeline Name" + execution URL)
- Second press (within 1s): copies base link (application name + executions list URL)

**Implementation:**
- Uses `localStorage` with timestamp
- Cache expires after 1000ms
- Compares current page info with cached info
- If same → `includeHeader = true`

## Permissions

- **activeTab:** Access current tab content when command is triggered
- **scripting:** Dynamically inject content scripts
- **clipboardWrite:** Write to system clipboard

## Content Script Injection

**Strategy:** Dynamic injection on-demand
- Scripts only injected when keyboard shortcut is pressed
- Minimal memory footprint (no always-running content scripts)
- All dependencies injected together

## Error Handling

| Scenario | User Feedback |
|----------|---------------|
| No handler matches URL | "No handler found for this page" |
| Handler extraction fails | "Failed to extract page information" |
| Clipboard write fails | "Failed to copy to clipboard" |

All errors logged to console for debugging.

## Testing Strategy

**Per-site testing:**
- Verify handler detects correct URLs
- Test single press copies base link
- Test double press (within 1s) includes header
- Verify Spinnaker's inverted behavior
- Check clipboard contains both HTML and plain text

**Cross-browser:**
- Test clipboard API compatibility
- Verify keyboard shortcut registration
- Check notification appearance and timing

## WebpageInfo Class Details

**Properties:**
```javascript
{
  titleText: string,      // Main page title
  titleUrl: string,       // Base URL
  headerText: string?,    // Section/heading name (optional)
  headerUrl: string?,     // Section URL (optional)
  style: "normal"|"spinnaker"
}
```

**Key Methods:**
- `toClipboard()` - Main copy operation
- `getCached()` - Retrieve cached copy (static)
- `cache()` - Store copy info with timestamp
- `isSameAs(other)` - Compare two WebpageInfo objects
- `getLinkTextAndUrl(includeHeader)` - Format link based on style
- `preview(includeHeader)` - Generate notification text
- `shorty(text, maxLength)` - Truncate text for preview

## Handler Registration

```javascript
const handlers = [
  new GoogleDocsHandler(),
  new AtlassianHandler(),
  new AirtableHandler(),
  new GitHubHandler(),
  new SpinnakerHandler(),
];
```

Handlers checked in order. First match wins.
