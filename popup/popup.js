// Shared utilities (execute.js and commands.js) loaded via script tags in popup.html

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

  // Use shared execute function to ensure libraries are loaded
  await ensureLibrariesLoaded(tab.id);
  return await getFormats(tab.id);
}

// Copy a specific format by simulating the keyboard shortcut behavior
async function copyFormat(format, formatIndex, totalFormats) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  // Set the cache to the previous format so execute() will cycle to this one
  const targetIndex = formatIndex;
  const previousIndex = (targetIndex - 1 + totalFormats) % totalFormats;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (index) => {
      // Set cache as if we just copied the previous format
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
        // Cache the previous index so next execute() will use our target index
        webpageInfo.cacheWithIndex(index);
      });
    },
    args: [previousIndex]
  });

  // Now execute the command - it will cycle to our target format
  await execute(tab.id);
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
