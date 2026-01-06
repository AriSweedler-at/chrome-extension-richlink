// Popup has its own instance of execute.js and commands.js
// This is OK - we don't need to share loadedTabs between popup and background
// since popup only runs once per click

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

  // Load libraries and get formats
  await ensureLibrariesLoaded(tab.id);
  return await getFormats(tab.id);
}

// Copy a specific format
async function copyFormat(format, formatIndex, totalFormats) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  const previousIndex = (formatIndex - 1 + totalFormats) % totalFormats;

  // Set cache to previous index
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (index) => {
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
        webpageInfo.cacheWithIndex(index);
      });
    },
    args: [previousIndex]
  });

  // Execute copy command (libraries already loaded)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/content.js']
  });

  return true;
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
      label.textContent = format.label;

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
        const success = await copyFormat(format, index, formats.length);

        if (success) {
          // Show success and close popup after a brief delay
          const successMsg = document.createElement('div');
          successMsg.className = 'success-message';
          successMsg.textContent = 'Copied to clipboard!';
          formatsEl.appendChild(successMsg);

          setTimeout(() => window.close(), 500);
        }
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
