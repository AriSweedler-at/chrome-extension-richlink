// Track which tabs have libraries loaded
const loadedTabs = new Set();

// Library files that need to be loaded once
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

// Load libraries into a tab (only once per tab)
async function ensureLibrariesLoaded(tabId) {
  if (loadedTabs.has(tabId)) {
    return; // Already loaded
  }

  for (const file of libraryFiles) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file]
    });
  }

  loadedTabs.add(tabId);
}

// Execute the copy command
async function executeCopyCommand(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/content.js']
  });
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});

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

      // Can't inject into chrome:// or extension:// pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log('Cannot inject into chrome:// or extension pages');
        return;
      }

      // Load libraries once, then execute command
      await ensureLibrariesLoaded(tab.id);
      await executeCopyCommand(tab.id);

    } catch (error) {
      console.error('Failed to inject content scripts:', error);
    }
  }
});
