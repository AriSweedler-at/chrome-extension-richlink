// Import shared loader
importScripts('shared/loader.js');

// Execute the copy command
async function executeCopyCommand(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/content.js']
  });
}

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
