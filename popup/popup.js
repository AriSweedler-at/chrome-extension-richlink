// Get formats for the current tab
async function getFormatsForCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  // Can't inject into chrome:// or extension:// pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    throw new Error('Cannot copy links from chrome:// pages');
  }

  // Check if libraries are already loaded in the page
  const librariesLoaded = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => typeof WebpageInfo !== 'undefined'
  });

  // Only inject if not already loaded
  if (!librariesLoaded[0].result) {
    const libraryFiles = [
      'content/clipboard.js',
      'content/notifications.js',
      'content/handlers/base.js',
      'content/handlers/google-docs.js',
      'content/handlers/atlassian.js',
      'content/handlers/airtable.js',
      'content/handlers/github.js',
      'content/handlers/spinnaker.js',
      'content/handlers/fallback.js',
    ];

    for (const file of libraryFiles) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [file]
      });
    }
  }

  // Execute script to extract formats
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractFormats
  });

  return results[0].result;
}

// This function runs in the page context
function extractFormats() {
  const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
    new FallbackHandler(),
  ];

  const currentUrl = window.location.href;
  const handler = handlers.find(h => h.canHandle(currentUrl));

  if (!handler) {
    throw new Error('No handler found');
  }

  // Create WebpageInfo (simplified - no async extractInfo needed for formats)
  const titleText = document.title || 'Untitled';
  const titleUrl = window.location.href;

  // Try to extract full info if possible
  let webpageInfo;
  try {
    // For most handlers, we can create a basic WebpageInfo
    // Handlers can override getFormats() if needed
    webpageInfo = new WebpageInfo({
      titleText,
      titleUrl,
      headerText: null,
      headerUrl: null
    });

    // If handler has custom format logic, create via extractInfo
    // (This is synchronous-ish for most handlers)
    if (handler.constructor.name === 'GoogleDocsHandler') {
      // Special case: get current heading
      const heading = handler.getCurrentHeading?.();
      if (heading) {
        webpageInfo.headerText = heading;
        webpageInfo.headerUrl = titleUrl;
      }
    }
  } catch (e) {
    webpageInfo = new WebpageInfo({ titleText, titleUrl });
  }

  const formats = webpageInfo.getFormats();

  return {
    handlerName: handler.constructor.name,
    formats: formats.map((f, i) => ({
      index: i,
      linkText: f.linkText,
      linkUrl: f.linkUrl
    }))
  };
}

// Copy a specific format
async function copyFormat(formatIndex) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  // Inject scripts and execute copy
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/clipboard.js', 'content/notifications.js']
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (index) => {
      // This runs in the page context
      const handlers = [
        new GoogleDocsHandler(),
        new AtlassianHandler(),
        new AirtableHandler(),
        new GitHubHandler(),
        new SpinnakerHandler(),
        new FallbackHandler(),
      ];

      const handler = handlers.find(h => h.canHandle(window.location.href));

      handler.extractInfo().then(webpageInfo => {
        const formats = webpageInfo.getFormats();
        const format = formats[index];

        const html = `<a href="${format.linkUrl}">${format.linkText}</a>`;
        const text = `${format.linkText} (${format.linkUrl})`;

        Clipboard.write({ html, text }).then(success => {
          if (success) {
            // Cache with this specific format index
            webpageInfo.cacheWithIndex(index);

            const formatInfo = formats.length > 1 ? ` [${index + 1}/${formats.length}]` : '';
            NotificationSystem.showSuccess(`Copied rich link to clipboard${formatInfo}\n* ${format.linkText.substring(0, 40)}`);
          } else {
            NotificationSystem.showError('Failed to copy to clipboard');
          }
        });
      });
    },
    args: [formatIndex]
  });
}

// Initialize popup
async function init() {
  const loadingEl = document.getElementById('loading');
  const formatsEl = document.getElementById('formats');
  const errorEl = document.getElementById('error');

  try {
    const { handlerName, formats } = await getFormatsForCurrentTab();

    // Hide loading, show formats
    loadingEl.style.display = 'none';
    formatsEl.style.display = 'block';

    // Create format buttons
    formats.forEach((format, index) => {
      const item = document.createElement('div');
      item.className = 'format-item';

      const label = document.createElement('div');
      label.className = 'format-label';
      label.textContent = `Format ${index + 1} of ${formats.length}`;

      const text = document.createElement('div');
      text.className = 'format-text';
      text.textContent = format.linkText.length > 60
        ? format.linkText.substring(0, 60) + '...'
        : format.linkText;

      const url = document.createElement('div');
      url.className = 'format-url';
      url.textContent = format.linkUrl.length > 60
        ? format.linkUrl.substring(0, 60) + '...'
        : format.linkUrl;

      item.appendChild(label);
      item.appendChild(text);
      item.appendChild(url);

      item.addEventListener('click', async () => {
        await copyFormat(index);

        // Show success and close popup after a brief delay
        const success = document.createElement('div');
        success.className = 'success-message';
        success.textContent = 'Copied to clipboard!';
        formatsEl.appendChild(success);

        setTimeout(() => window.close(), 500);
      });

      formatsEl.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading formats:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = 'Failed to load formats: ' + error.message;
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
