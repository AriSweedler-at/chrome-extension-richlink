// Popup communicates with background via message passing
// This ensures we use background's shared loadedTabs cache

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

  // Ask background to load libraries and get formats
  const response = await chrome.runtime.sendMessage({
    action: 'getFormats',
    tabId: tab.id
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
}

// Copy a specific format
async function copyFormat(format, formatIndex, totalFormats) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  // Copy to clipboard in popup context (has user interaction)
  // Raw URL format: just copy the URL as plain text, no rich link
  const isRawUrl = format.label === 'Raw URL';
  const html = isRawUrl ? format.linkUrl : `<a href="${format.linkUrl}">${format.linkText}</a>`;
  const text = isRawUrl ? format.linkUrl : `${format.linkText} (${format.linkUrl})`;

  const clipboardItem = new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([text], { type: 'text/plain' })
  });
  await navigator.clipboard.write([clipboardItem]);

  // Update cache and show notification in page (via background)
  await chrome.runtime.sendMessage({
    action: 'updateCacheAndNotify',
    tabId: tab.id,
    formatIndex: formatIndex
  });

  return true;
}

// Initialize popup
async function init() {
  const loadingEl = document.getElementById('loading');
  const formatsEl = document.getElementById('formats');
  const errorEl = document.getElementById('error');

  try {
    const { handlerNames, formats } = await getFormatsForCurrentTab();

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
