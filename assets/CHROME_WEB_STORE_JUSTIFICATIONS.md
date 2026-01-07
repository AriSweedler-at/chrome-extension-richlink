# Chrome Web Store - Privacy Practices Justifications

## Single Purpose Description

This extension has a single purpose: to copy rich-formatted links from web pages to the user's clipboard using a keyboard shortcut or popup menu.

## Permission Justifications

### activeTab
**Justification:** Required to read the current page's title and URL when the user presses the keyboard shortcut (Command+Shift+C) or clicks the extension icon. The extension only accesses the active tab when explicitly triggered by the user and does not monitor or track browsing activity.

### clipboardWrite
**Justification:** Required to write the formatted link to the user's clipboard. This is the core functionality of the extension - copying links in both HTML and plain text formats. The extension only writes to clipboard when the user explicitly requests it via keyboard shortcut or popup menu click.

### host_permissions: <all_urls>
**Justification:** Required to work on any website the user visits. The extension provides link copying functionality universally across all websites. It only activates when the user explicitly triggers it and does not run background processes or collect data from any sites.

### scripting
**Justification:** Required to inject content scripts that:
1. Display toast notifications showing which format was copied
2. Execute the link extraction and clipboard writing logic in the page context

Scripts are only injected when the user explicitly triggers the extension (keyboard shortcut or popup click). No scripts run automatically or in the background.

### Remote Code
**Justification:** This extension does NOT use remote code. All code is bundled with the extension and executed locally. The extension does not fetch, load, or execute any code from remote servers.

## Data Usage Certification

- ✅ Does NOT collect any user data
- ✅ Does NOT transmit any data to external servers
- ✅ Does NOT use analytics or tracking
- ✅ Does NOT store any personal information
- ✅ Operates entirely locally in the user's browser
- ✅ Only activates when explicitly triggered by the user

## User Data Handling

This extension does NOT handle any user data. It:
- Reads page title and URL only when triggered
- Writes formatted link to clipboard (controlled by user's OS)
- Does not store, transmit, or process any user data
- Does not access sensitive information
