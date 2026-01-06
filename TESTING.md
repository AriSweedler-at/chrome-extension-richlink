# Testing the Rich Link Chrome Extension

## Two Ways to Use

**Method 1: Keyboard Shortcut** - Quick cycling through formats
**Method 2: Popup Menu** - Visual selection of specific format

## Quick Start: Load the Extension

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions` in your browser, OR
   - Click the puzzle icon (Extensions menu) → "Manage Extensions"

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch in the top-right corner

3. **Load Your Extension**
   - Click "Load unpacked" button
   - Select this directory: `/Users/arisweedler/Desktop/workspace/chrome-extension-richlinker`
   - The extension should appear with your placeholder red icon

4. **Pin for Easy Access (Optional)**
   - Click the puzzle icon in Chrome toolbar
   - Find "Rich Link Copier" and click the pin icon
   - This makes it visible in your toolbar

## Testing Method 1: Popup Menu

### Basic Test

1. Navigate to any website (e.g., Google Docs, GitHub PR, or Wikipedia)
2. Click the extension icon in your Chrome toolbar
3. A popup appears showing all available formats
4. Click any format to copy it
5. Popup closes automatically
6. Paste to verify it copied correctly

### What You Should See

**On Google Docs (with heading):**
- Format 1 of 3: "Doc Title" → base URL
- Format 2 of 3: "Doc Title #Heading" → heading URL
- Format 3 of 3: Raw URL

**On Regular Website:**
- Format 1 of 2: "Page Title" → URL
- Format 2 of 2: Raw URL

## Testing Method 2: Keyboard Shortcut

### Basic Test: Google Docs

1. Open any Google Docs document
2. Press **Command+Shift+C** (Mac) or **Ctrl+Shift+C** (Windows/Linux)
3. You should see a green toast notification: "Copied rich link to clipboard"
4. Open any rich text editor (Gmail, Slack, etc.) and paste
5. Verify it pastes as a clickable link

### Double-Press Test: Google Docs with Heading

1. Open a Google Docs document with headings
2. Scroll to a heading so it's highlighted in the document outline
3. Press **Command+Shift+C** once - copies base document link
4. Press **Command+Shift+C** again within 1 second - copies link with heading anchor
5. Paste and verify the URL includes `#heading=h.xxxxx`

### Test Other Sites

**GitHub PR:**
1. Open any GitHub pull request page
2. Press **Command+Shift+C**
3. Verify PR title is copied

**Atlassian Confluence:**
1. Open any Confluence wiki page
2. Press **Command+Shift+C**
3. Verify page title is copied (cleaned of "Confluence" suffix)

**Fallback Behavior (Unsupported Site):**
1. Open any random website (e.g., wikipedia.org)
2. Press **Command+Shift+C** - first press copies rich link
3. Verify you see a green notification: "Copied link to clipboard"
4. Paste into a rich text editor - should be a clickable link with page title
5. Press **Command+Shift+C** again within 1 second - second press copies raw URL
6. Verify notification: "Copied raw URL to clipboard"
7. Paste into any editor - should be just the plain URL with no title

## Debugging

### View Background Script Console

1. Go to `chrome://extensions`
2. Find "Rich Link Copier"
3. Click "service worker" link under "Inspect views"
4. This opens DevTools for the background script

### View Content Script Console

1. Open a supported site
2. Press **Command+Shift+C** to trigger the extension
3. Open regular DevTools (F12 or Command+Option+I)
4. Look for `[RichLinker Debug]` messages in the Console tab

### Common Issues

**Extension doesn't load:**
- Check that `manifest.json` is in the root directory
- Look for errors on the `chrome://extensions` page

**Keyboard shortcut doesn't work:**
- Check for conflicts: `chrome://extensions/shortcuts`
- Try changing the shortcut if another extension is using it

**"Failed to inject content scripts" error:**
- Check background script console for specific file that failed
- Verify all content script files exist in the correct paths

**Clipboard doesn't work:**
- Chrome requires user interaction for clipboard access
- Make sure you're on HTTPS (or localhost)
- Check browser permissions haven't blocked clipboard access

## Reload After Changes

After making code changes:

1. Go to `chrome://extensions`
2. Find "Rich Link Copier"
3. Click the refresh/reload icon
4. Re-test your changes

## Checking Clipboard Contents

### Check HTML Format

**Mac:**
```bash
# Paste into TextEdit, then View → Make Rich Text, then paste
# You should see a clickable link
```

**Check Both Formats:**
1. Paste into a rich text editor (Slack, Gmail) - should be a clickable link
2. Paste into a plain text editor (Notes, Terminal) - should be "Title (URL)"

## Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Keyboard shortcut is registered (check `chrome://extensions/shortcuts`)
- [ ] Works on Google Docs (base link)
- [ ] Works on Google Docs (heading link on double-press)
- [ ] Works on GitHub PR
- [ ] Works on Atlassian Confluence
- [ ] Shows error on unsupported site
- [ ] Toast notification appears and auto-dismisses after ~1.5 seconds
- [ ] HTML format pastes as clickable link in rich editors
- [ ] Plain text format works in plain text editors
- [ ] Double-press detection works (1 second window)
- [ ] Second press shows header in notification preview

## Automated Testing

See unit tests in the `tests/` directory for automated testing of handler logic.
