// Single execution entry point for both keyboard shortcut and popup
// Handles library loading and command execution

// Track which tabs have libraries loaded
const loadedTabs = new Set();

// Library files that need to be loaded once per tab
const libraryFiles = [
  'content/clipboard.js',
  'content/colors.js',
  'content/notifications.js',
  'content/handlers/base.js',
  'content/handlers/google-docs.js',
  'content/handlers/atlassian.js',
  'content/handlers/airtable.js',
  'content/handlers/github.js',
  'content/handlers/spinnaker.js',
  'content/handlers/raw_title.js',
  'content/handlers/raw_url.js',
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

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});
