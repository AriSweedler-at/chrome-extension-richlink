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
async function copyFormat(formatIndex) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  // Use shared copy function
  await copyFormatByIndex(tab.id, formatIndex);
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
