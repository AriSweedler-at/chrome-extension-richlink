// Single execution entry point for both keyboard shortcut and popup
// Handles library loading and command execution

// Track which tabs have libraries loaded
const loadedTabs = new Set();

// Library files that need to be loaded once per tab
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
  console.log(`[ensureLibrariesLoaded] Called for tab ${tabId}`);
  console.log(`[ensureLibrariesLoaded] Current cache:`, Array.from(loadedTabs));

  if (loadedTabs.has(tabId)) {
    console.log(`[ensureLibrariesLoaded] ✓ Libraries already loaded for tab ${tabId} - SKIPPING`);
    return; // Already loaded
  }

  console.log(`[ensureLibrariesLoaded] ⚠ Loading libraries for tab ${tabId}...`);
  for (const file of libraryFiles) {
    console.log(`[ensureLibrariesLoaded]   Injecting: ${file}`);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file]
    });
  }

  loadedTabs.add(tabId);
  console.log(`[ensureLibrariesLoaded] ✓ Libraries loaded for tab ${tabId}. New cache:`, Array.from(loadedTabs));
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});
