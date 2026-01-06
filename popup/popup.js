// Shared utilities (loader.js and commands.js) loaded via script tags in popup.html

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

  // Use shared utilities
  await ensureLibrariesLoaded(tab.id);
  return await getFormats(tab.id);
}

// Copy a specific format
async function copyFormat(format, formatIndex, totalFormats) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  // Copy in the popup context (has user interaction)
  const html = `<a href="${format.linkUrl}">${format.linkText}</a>`;
  const text = `${format.linkText} (${format.linkUrl})`;

  try {
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' })
    });

    await navigator.clipboard.write([clipboardItem]);

    // Update cache in the page context
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (index) => {
        // Update the cache with this format index
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

          // Show notification in page
          const formats = webpageInfo.getFormats();
          const format = formats[index];
          const isRawUrl = format.linkText === format.linkUrl;
          const formatInfo = formats.length > 1 ? ` [${index + 1}/${formats.length}]` : '';
          const messageType = isRawUrl ? 'Copied raw URL to clipboard' : 'Copied rich link to clipboard';
          const preview = format.linkText.substring(0, 40) + (format.linkText.length > 40 ? '...' : '');

          NotificationSystem.showSuccess(`${messageType}${formatInfo}\n* ${preview}`);
        });
      },
      args: [formatIndex]
    });

    return true;
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return false;
  }
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
