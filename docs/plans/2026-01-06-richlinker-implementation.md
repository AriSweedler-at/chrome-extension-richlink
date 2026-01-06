# Rich Link Chrome Extension - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that copies rich links (HTML + plain text) from various web pages via Shift+Command+C keyboard shortcut, replacing the existing bookmarklet system.

**Architecture:** Chrome extension with service worker background script that injects content scripts on-demand when keyboard shortcut is pressed. Handler-based architecture where each site type has its own extraction logic. Double-press detection using localStorage caching.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JavaScript, Chrome APIs (commands, scripting, clipboard), localStorage

---

## Task 1: Set up manifest and icons

**Files:**
- Create: `manifest.json`
- Create: `icons/icon16.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

**Step 1: Create manifest.json**

Create the Chrome extension manifest with proper permissions and command registration:

```json
{
  "manifest_version": 3,
  "name": "Rich Link Copier",
  "version": "1.0.0",
  "description": "Copy rich links from web pages with Shift+Command+C",
  "permissions": [
    "activeTab",
    "scripting",
    "clipboardWrite"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "copy-rich-link": {
      "suggested_key": {
        "default": "Ctrl+Shift+C",
        "mac": "Command+Shift+C"
      },
      "description": "Copy rich link to clipboard"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 2: Create placeholder icons**

For now, create simple colored PNG files (you can replace with proper icons later):

```bash
# Create icons directory
mkdir -p icons

# Create placeholder 16x16 icon (red square)
convert -size 16x16 xc:red icons/icon16.png

# Create placeholder 48x48 icon (red square)
convert -size 48x48 xc:red icons/icon48.png

# Create placeholder 128x128 icon (red square)
convert -size 128x128 xc:red icons/icon128.png
```

Note: If ImageMagick (`convert`) is not available, manually create simple PNG files or skip this step and add icons later.

**Step 3: Commit**

```bash
git add manifest.json icons/
git commit -m "feat: add manifest and placeholder icons"
```

---

## Task 2: Create background service worker

**Files:**
- Create: `background.js`

**Step 1: Write background.js**

Create the service worker that listens for keyboard command and injects content scripts:

```javascript
// Listen for the keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'copy-rich-link') {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        console.error('No active tab found');
        return;
      }

      // Inject content scripts in order
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/clipboard.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/notifications.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/base.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/google-docs.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/atlassian.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/airtable.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/github.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/spinnaker.js']
      });

      // Finally, inject and execute main content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });

    } catch (error) {
      console.error('Failed to inject content scripts:', error);
    }
  }
});
```

**Step 2: Commit**

```bash
git add background.js
git commit -m "feat: add background service worker for command handling"
```

---

## Task 3: Create clipboard utility

**Files:**
- Create: `content/clipboard.js`

**Step 1: Write clipboard.js**

Create utility for writing both HTML and plain text to clipboard:

```javascript
const Clipboard = {
  /**
   * Write both HTML and plain text to clipboard
   * @param {Object} data - Clipboard data
   * @param {string} data.html - HTML content
   * @param {string} data.text - Plain text content
   * @returns {Promise<boolean>} Success status
   */
  async write({ html, text }) {
    try {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      });

      await navigator.clipboard.write([clipboardItem]);
      return true;
    } catch (error) {
      console.error('Clipboard write failed:', error);
      return false;
    }
  }
};
```

**Step 2: Commit**

```bash
mkdir -p content
git add content/clipboard.js
git commit -m "feat: add clipboard utility for HTML and text"
```

---

## Task 4: Create notification system

**Files:**
- Create: `content/notifications.js`

**Step 1: Write notifications.js**

Create toast notification system with auto-dismiss:

```javascript
const NotificationSystem = {
  /**
   * Show a success notification
   * @param {string} message - Message to display
   */
  showSuccess(message) {
    this._show(message, 'success');
  },

  /**
   * Show an error notification
   * @param {string} message - Message to display
   */
  showError(message) {
    this._show(message, 'error');
  },

  /**
   * Show a debug notification (only in development)
   * @param {string} message - Message to display
   */
  showDebug(message) {
    // Only show debug in console, not as toast
    console.log('[RichLinker Debug]', message);
  },

  /**
   * Internal method to show notification
   * @param {string} message - Message to display
   * @param {string} type - 'success' or 'error'
   */
  _show(message, type) {
    // Remove any existing notification
    const existing = document.getElementById('richlinker-notification');
    if (existing) {
      existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'richlinker-notification';
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      backgroundColor: type === 'success' ? '#4caf50' : '#f44336',
      color: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      maxWidth: '400px',
      whiteSpace: 'pre-line',
      opacity: '0',
      transition: 'opacity 0.3s ease-in-out'
    });

    // Add to page
    document.body.appendChild(notification);

    // Fade in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });

    // Auto-dismiss after 1.5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 1500);
  }
};
```

**Step 2: Commit**

```bash
git add content/notifications.js
git commit -m "feat: add toast notification system"
```

---

## Task 5: Create base handler classes

**Files:**
- Create: `content/handlers/base.js`

**Step 1: Write base.js**

Create WebpageInfo and Handler base classes:

```javascript
class WebpageInfo {
  constructor({ titleText, titleUrl, headerText = null, headerUrl = null, style = "normal" }) {
    this.titleText = titleText;
    this.titleUrl = titleUrl;
    this.headerText = headerText;
    this.headerUrl = headerUrl;
    this.style = style; // "normal" or "spinnaker"
  }

  /**
   * Utility function to shorten text with ellipsis
   * @param {string} text - Text to shorten
   * @param {number} maxLength - Maximum length (default 30)
   * @returns {string} Shortened text with ellipsis if needed
   */
  shorty(text, maxLength = 30) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  /**
   * Returns a plain text preview for use with NotificationSystem
   * @param {boolean} [includeHeader=true] - Whether to include header in preview
   * @returns {string} Plain text preview with title and optional header
   */
  preview(includeHeader = true) {
    const title = this.titleText || 'Untitled';
    const lines = [`* title: ${this.shorty(title, 30)}`];

    if (includeHeader && this.headerText) {
      lines.push(`* header: ${this.shorty(this.headerText, 30)}`);
    }

    return lines.join('\n');
  }

  /**
   * Check if this WebpageInfo is the same as another
   * @param {WebpageInfo} other - Other WebpageInfo to compare
   * @returns {boolean} True if same title and URLs
   */
  isSameAs(other) {
    return this.titleText === other.titleText &&
      this.titleUrl === other.titleUrl &&
      this.headerText === other.headerText &&
      this.headerUrl === other.headerUrl;
  }

  /**
   * Get the link text and URL based on style and whether to include header
   * @param {boolean} includeHeader - Whether to include header in the link
   * @returns {{linkText: string, linkUrl: string}} The formatted link text and URL
   */
  getLinkTextAndUrl(includeHeader) {
    switch (this.style) {
      case "spinnaker": {
        // Spinnaker style: first click shows header, second click shows base (inverted)
        const useHeader = !includeHeader;

        if (useHeader && this.headerText) {
          return {
            linkText: `spinnaker: ${this.headerText}`,
            linkUrl: this.headerUrl
          };
        }

        return {
          linkText: this.titleText,
          linkUrl: this.titleUrl
        };
      }

      case "normal": {
        // Normal style: first click shows base, second click includes header
        const useHeader = includeHeader;
        const linkText = useHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
        const linkUrl = useHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

        return { linkText, linkUrl };
      }

      default: {
        console.error(`Unknown style: "${this.style}". Falling back to "normal" style.`);
        const useHeader = includeHeader;
        const linkText = useHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
        const linkUrl = useHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

        return { linkText, linkUrl };
      }
    }
  }

  /**
   * Get cached WebpageInfo from localStorage
   * @returns {WebpageInfo|null} Cached info or null if expired/missing
   */
  static getCached() {
    try {
      const cached = localStorage.getItem('richlinker-last-copy');
      if (!cached) return null;

      const data = JSON.parse(cached);
      const now = Date.now();

      // Check if expired (1000ms for double-press detection)
      if (now - data.timestamp > 1000) {
        localStorage.removeItem('richlinker-last-copy');
        return null;
      }

      return new WebpageInfo(data.webpageInfo);
    } catch (error) {
      localStorage.removeItem('richlinker-last-copy');
      return null;
    }
  }

  /**
   * Cache this WebpageInfo to localStorage
   */
  cache() {
    try {
      const data = {
        timestamp: Date.now(),
        webpageInfo: {
          titleText: this.titleText,
          titleUrl: this.titleUrl,
          headerText: this.headerText,
          headerUrl: this.headerUrl,
          style: this.style
        }
      };
      localStorage.setItem('richlinker-last-copy', JSON.stringify(data));
    } catch (error) {
      console.log('DEBUG: Failed to cache WebpageInfo:', error.message);
    }
  }

  /**
   * Copy webpage info to clipboard as rich link
   * @returns {Promise<boolean>} True if successful
   */
  async toClipboard() {
    // Check if we just copied the same thing
    const cached = WebpageInfo.getCached();
    const includeHeader = cached && this.isSameAs(cached);
    if (cached && this.isSameAs(cached)) {
      console.log('DEBUG: Same item detected - will include header on second copy');
    }

    // Get link text and URL based on style
    const { linkText, linkUrl } = this.getLinkTextAndUrl(includeHeader);

    const html = `<a href="${linkUrl}">${linkText}</a>`;
    const text = `${linkText} (${linkUrl})`;

    try {
      const success = await Clipboard.write({ html, text });

      if (success) {
        // Cache this copy for duplicate detection
        this.cache();
        // For notification preview, show header if it's included in the link
        const showHeaderInPreview = linkUrl === this.headerUrl;
        NotificationSystem.showSuccess(`Copied rich link to clipboard\n${this.preview(showHeaderInPreview)}`);
      } else {
        NotificationSystem.showError('Failed to copy to clipboard');
      }

      return success;
    } catch (error) {
      NotificationSystem.showDebug(`Clipboard error: ${error.message}`);
      NotificationSystem.showError('Failed to copy to clipboard');
      return false;
    }
  }
}

class Handler {
  constructor() {
    if (new.target === Handler) {
      throw new Error('Handler is an abstract class');
    }
  }

  canHandle(_url) {
    throw new Error('canHandle() must be implemented');
  }

  async extractInfo() {
    throw new Error('extractInfo() must be implemented');
  }
}
```

**Step 2: Commit**

```bash
mkdir -p content/handlers
git add content/handlers/base.js
git commit -m "feat: add WebpageInfo and Handler base classes"
```

---

## Task 6: Create Google Docs handler

**Files:**
- Create: `content/handlers/google-docs.js`

**Step 1: Write google-docs.js**

```javascript
class GoogleDocsHandler extends Handler {
  canHandle(url) {
    return url.includes('docs.google.com/document/d/');
  }

  getCurrentHeading() {
    // Look for the highlighted navigation item in Google Docs outline
    const highlightedItem = document.querySelector('.navigation-item.location-indicator-highlight');
    if (!highlightedItem) {
      return null;
    }

    // Extract the heading text from the tooltip or content
    const contentContainer = highlightedItem.querySelector('.navigation-item-content-container');
    const content = highlightedItem.querySelector('.navigation-item-content');

    // Try to get text from data-tooltip first (most reliable)
    if (content && content.dataset.tooltip) {
      return content.dataset.tooltip;
    }

    // Fallback to text content
    if (content) {
      const headingText = content.textContent?.trim();
      if (headingText) {
        return headingText;
      }
    }

    // Fallback to aria-label
    if (contentContainer) {
      const ariaLabel = contentContainer.getAttribute('aria-label');
      if (ariaLabel) {
        // Remove the level information (e.g., "Team rituals level 2" -> "Team rituals")
        return ariaLabel.replace(/ level \d+$/, '');
      }
    }

    return null;
  }

  async extractInfo() {
    const titleText = document.title.replace(' - Google Docs', '') || 'Untitled Document';
    const titleUrl = window.location.href.split('#')[0];
    const headerUrl = window.location.href;

    NotificationSystem.showDebug(`GoogleDocsHandler: Extracting from title="${titleText}"`);
    NotificationSystem.showDebug(`GoogleDocsHandler: titleUrl="${titleUrl}"`);

    // Get current heading from navigation, if available
    let headerText = null;
    try {
      headerText = this.getCurrentHeading();
      if (headerText) {
        NotificationSystem.showDebug(`GoogleDocsHandler: Found heading="${headerText}"`);
      } else {
        NotificationSystem.showDebug('GoogleDocsHandler: No current heading detected');
      }
    } catch (error) {
      console.error("GoogleDocsHandler: Failed to retrieve current heading", error);
      NotificationSystem.showDebug(`GoogleDocsHandler: Heading extraction failed: ${error.message}`);
    }

    return new WebpageInfo({ titleText, titleUrl, headerText, headerUrl });
  }
}
```

**Step 2: Commit**

```bash
git add content/handlers/google-docs.js
git commit -m "feat: add Google Docs handler"
```

---

## Task 7: Create Atlassian handler

**Files:**
- Create: `content/handlers/atlassian.js`

**Step 1: Write atlassian.js**

```javascript
class AtlassianHandler extends Handler {
  canHandle(url) {
    return url.includes('.atlassian.net/wiki/spaces/');
  }

  async extractInfo() {
    const rawTitle = document.title || 'Atlassian Wiki Page';
    const titleUrl = window.location.href;

    // Remove "space name" and "Confluence" suffix by splitting on ' - ' and removing last 2 elements
    const titleParts = rawTitle.split(' - ');
    const titleText = titleParts.length > 2 ? titleParts.slice(0, -2).join(' - ') : rawTitle;

    NotificationSystem.showDebug(`AtlassianHandler: Raw title="${rawTitle}"`);
    NotificationSystem.showDebug(`AtlassianHandler: Cleaned title="${titleText}"`);
    NotificationSystem.showDebug(`AtlassianHandler: titleUrl="${titleUrl}"`);

    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }
}
```

**Step 2: Commit**

```bash
git add content/handlers/atlassian.js
git commit -m "feat: add Atlassian Confluence handler"
```

---

## Task 8: Create Airtable handler

**Files:**
- Create: `content/handlers/airtable.js`

**Step 1: Write airtable.js**

```javascript
class AirtableHandler extends Handler {
  canHandle(url) {
    // Known Airtable applications that this handler supports
    const airtableApplications = [
      {
        base: "listable",
        url: "https://airtable.com/apptivTqaoebkrmV1/pagYS8GHSAS9swLLI",
        page: "✅ Task Detail (Sidesheet+Fullscreen, Global, v2025.04.24) page",
      },
      {
        base: "escalations",
        url: "https://airtable.com/appWh5G6JXbHDKC2b/paguOM7Eb387ZUnRE",
        page: "UNKNOWN",
      },
    ];

    // Check if URL matches any known application
    const match = airtableApplications.find(app => url.startsWith(app.url));
    if (match) {
      console.log(
        `AirtableHandler: YES ✅ matched | base='${match.base}' page='${match.page}'`
      );
      return true;
    }

    console.log(`AirtableHandler: NOT ❌ matched in any known page`);
    return false;
  }

  async extractInfo() {
    // Get the record title from the page
    const titleElement = document.querySelector('.heading-size-default');
    if (!titleElement) {
      console.log("Failed to find title element");
      throw new Error("Could not find title element");
    }

    const titleText = titleElement.textContent.trim();
    const titleUrl = window.location.href;

    NotificationSystem.showDebug(`AirtableHandler: Extracting from title="${titleText}"`);
    NotificationSystem.showDebug(`AirtableHandler: titleUrl="${titleUrl}"`);

    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }
}
```

**Step 2: Commit**

```bash
git add content/handlers/airtable.js
git commit -m "feat: add Airtable handler"
```

---

## Task 9: Create GitHub handler

**Files:**
- Create: `content/handlers/github.js`

**Step 1: Write github.js**

```javascript
class GitHubHandler extends Handler {
  canHandle(url) {
    // Match GitHub PR URLs: github.com/org/repo/pull/number
    if (!url.includes('github.com/')) {
      return false;
    }

    const parts = url.split('/');
    // Expected format: https://github.com/org/repo/pull/number
    // parts: ['https:', '', 'github.com', 'org', 'repo', 'pull', 'number', ...]

    if (parts.length < 7) {
      return false;
    }

    // Check that we have github.com, org, repo, 'pull', and a number
    const domain = parts[2];
    const org = parts[3];
    const repo = parts[4];
    const pullKeyword = parts[5];
    const prNumber = parts[6];

    return domain === 'github.com' &&
      org && org !== '' &&
      repo && repo !== '' &&
      pullKeyword === 'pull' &&
      prNumber && /^\d+$/.test(prNumber);
  }

  async extractInfo() {
    const titleElement = document.querySelector('.gh-header-title');
    if (!titleElement) {
      throw new Error("Could not find PR title element");
    }

    const titleText = titleElement.textContent.trim();
    const titleUrl = window.location.href;

    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }
}
```

**Step 2: Commit**

```bash
git add content/handlers/github.js
git commit -m "feat: add GitHub PR handler"
```

---

## Task 10: Create Spinnaker handler

**Files:**
- Create: `content/handlers/spinnaker.js`

**Step 1: Write spinnaker.js**

```javascript
class SpinnakerHandler extends Handler {
  parseSpinnakerUrl(url) {
    // Remove protocol and split by '/'
    // Expected format: https://spinnaker.k8s.{env}.cloud/#/applications/{app}/executions[/{executionId}]

    // Check domain pattern
    if (!url.includes('spinnaker.k8s.') || !url.includes('.cloud')) {
      return null;
    }

    // Split URL into parts
    const hashIndex = url.indexOf('#/');
    if (hashIndex === -1) return null;

    const pathPart = url.substring(hashIndex + 2); // Skip '#/'
    const parts = pathPart.split('/');

    // Validate structure: ['applications', '{app}', 'executions', ...optional executionId]
    if (parts.length < 3) return null;
    if (parts[0] !== 'applications') return null;
    if (parts[2] !== 'executions') return null;

    const applicationName = parts[1];
    if (!applicationName) return null;

    // Check if there's an execution ID (4th part before any query params)
    let executionId = null;
    if (parts.length >= 4 && parts[3]) {
      // Remove query params from execution ID
      executionId = parts[3].split('?')[0];
    }

    return {
      applicationName,
      executionId
    };
  }

  extractPipelineName(executionId) {
    try {
      const executionDiv = document.getElementById(`execution-${executionId}`);
      if (!executionDiv) {
        NotificationSystem.showDebug(`SpinnakerHandler: Could not find execution div for ID ${executionId}`);
        return null;
      }

      NotificationSystem.showDebug('SpinnakerHandler: Found execution div');

      // Traverse up to find the execution-group (the top-level container with showing-details)
      const executionGroup = executionDiv.closest('.execution-group');
      if (!executionGroup) {
        NotificationSystem.showDebug('SpinnakerHandler: Could not find execution-group');
        return null;
      }

      NotificationSystem.showDebug('SpinnakerHandler: Found execution-group');

      // The h4 is inside the sticky-header at the top of the execution-group
      const titleElement = executionGroup.querySelector('h4.execution-group-title');
      if (!titleElement) {
        NotificationSystem.showDebug('SpinnakerHandler: Could not find h4.execution-group-title');
        return null;
      }

      // Get only direct text nodes, excluding spans
      const pipelineName = Array.from(titleElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join(' ');
      NotificationSystem.showDebug(`SpinnakerHandler: Found pipeline name: ${pipelineName}`);
      return pipelineName;
    } catch (error) {
      NotificationSystem.showDebug(`SpinnakerHandler: Error extracting pipeline name: ${error.message}`);
      return null;
    }
  }

  canHandle(url) {
    return this.parseSpinnakerUrl(url) !== null;
  }

  async extractInfo() {
    const currentUrl = window.location.href;
    NotificationSystem.showDebug(`SpinnakerHandler: Processing URL: ${currentUrl}`);

    const parsed = this.parseSpinnakerUrl(currentUrl);
    if (!parsed) {
      NotificationSystem.showDebug('SpinnakerHandler: Failed to parse URL');
      throw new Error('Could not parse Spinnaker URL');
    }

    const { applicationName, executionId } = parsed;
    NotificationSystem.showDebug(`SpinnakerHandler: Application name: ${applicationName}`);

    // If no execution ID, we're on the executions list page
    if (!executionId) {
      NotificationSystem.showDebug('SpinnakerHandler: On executions list page');
      const titleUrl = currentUrl.split('?')[0]; // Clean any query params
      return new WebpageInfo({
        titleText: applicationName,
        titleUrl: titleUrl,
        headerText: null,
        headerUrl: null
      });
    }

    NotificationSystem.showDebug(`SpinnakerHandler: Execution ID: ${executionId}`);

    // Extract pipeline name from DOM
    const pipelineName = this.extractPipelineName(executionId);

    // Use spinnaker style:
    // First click: show header as "spinnaker: ${pipelineName}" with full execution URL
    // Second click: show base application name with executions list URL
    const baseUrl = currentUrl.split('/executions')[0] + '/executions';

    return new WebpageInfo({
      titleText: applicationName,
      titleUrl: baseUrl,
      headerText: pipelineName,
      headerUrl: currentUrl,
      style: "spinnaker"
    });
  }
}
```

**Step 2: Commit**

```bash
git add content/handlers/spinnaker.js
git commit -m "feat: add Spinnaker handler"
```

---

## Task 11: Create main content script

**Files:**
- Create: `content/content.js`

**Step 1: Write content.js**

```javascript
// Main execution function
async function execute() {
  // Register all handlers
  const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
  ];

  // Dispatch to proper handler
  const currentUrl = window.location.href;
  NotificationSystem.showDebug(`RichLinker: Processing URL: ${currentUrl}`);

  const handler = handlers.find(h => h.canHandle(currentUrl));
  if (!handler) {
    NotificationSystem.showDebug('RichLinker: No matching handler found');
    NotificationSystem.showError('No handler found for this page');
    return;
  }

  NotificationSystem.showDebug(`RichLinker: Using handler: ${handler.constructor.name}`);

  try {
    const webpageInfo = await handler.extractInfo();
    NotificationSystem.showDebug(`RichLinker: Extracted info - Title: "${webpageInfo.titleText}", Header: "${webpageInfo.headerText || 'none'}"`);

    // Copy to clipboard
    await webpageInfo.toClipboard();
  } catch (error) {
    console.error('RichLinker error:', error);
    NotificationSystem.showError('Failed to extract page information');
  }
}

// Execute immediately
try {
  execute();
} catch (error) {
  console.error('RichLinker error:', error);
  NotificationSystem.showError('Failed to extract page information');
}
```

**Step 2: Commit**

```bash
git add content/content.js
git commit -m "feat: add main content script orchestration"
```

---

## Task 12: Create README with installation instructions

**Files:**
- Create: `README.md`

**Step 1: Write README.md**

```markdown
# Rich Link Chrome Extension

Copy rich links (HTML + plain text) from web pages using the **Shift+Command+C** keyboard shortcut.

## Supported Sites

- **Google Docs** - Copies document title and current heading
- **Atlassian Confluence** - Copies page title
- **Airtable** - Copies record title (specific applications)
- **GitHub PRs** - Copies PR title
- **Spinnaker** - Copies application and pipeline name

## Features

- **Keyboard shortcut:** Shift+Command+C (Mac) / Ctrl+Shift+C (Windows/Linux)
- **Double-press detection:** Press twice within 1 second to include header/section
- **Rich format:** Copies both HTML link and plain text
- **Toast notifications:** Visual feedback on copy success

## Installation

### For Development

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension-richlinker` directory

### Usage

1. Navigate to a supported site
2. Press **Shift+Command+C** (or **Ctrl+Shift+C** on Windows/Linux)
3. The rich link is copied to your clipboard
4. Press again within 1 second to include header/section info

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
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```

---

## Task 13: Test and verify

**Step 1: Load extension in Chrome**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension-richlinker` directory
5. Verify extension appears in list

**Step 2: Test on Google Docs**

1. Open a Google Docs document
2. Press Shift+Command+C (or Ctrl+Shift+C)
3. Verify toast notification appears
4. Paste into a rich text editor (should be HTML link)
5. Paste into plain text editor (should be text + URL)
6. Press Shift+Command+C again within 1 second
7. Verify header is included in copied link

**Step 3: Test on GitHub**

1. Open a GitHub PR
2. Press Shift+Command+C
3. Verify PR title is copied
4. Check notification shows success

**Step 4: Test on unsupported site**

1. Open any random website (e.g., wikipedia.org)
2. Press Shift+Command+C
3. Verify error notification: "No handler found for this page"

**Step 5: Verify all handlers load**

1. Open Chrome DevTools Console
2. Go to a Google Docs page
3. Press Shift+Command+C
4. Check console for any script loading errors
5. Verify debug messages show correct handler detected

---

## Completion

All tasks complete! The Chrome extension is ready for use.

To publish to Chrome Web Store (optional future step):
1. Create proper icon assets (replace placeholder icons)
2. Add privacy policy
3. Create promotional images
4. Submit to Chrome Web Store developer dashboard
