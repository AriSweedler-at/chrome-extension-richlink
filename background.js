// Import shared execution utility
importScripts('shared/execute.js');
importScripts('shared/commands.js');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFormats') {
    (async () => {
      try {
        await ensureLibrariesLoaded(message.tabId);
        const formats = await getFormats(message.tabId);
        sendResponse({ success: true, data: formats });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (message.action === 'copyFormat') {
    (async () => {
      try {
        // Set cache to previous index
        await chrome.scripting.executeScript({
          target: { tabId: message.tabId },
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
          args: [message.previousIndex]
        });

        // Execute copy command
        await ensureLibrariesLoaded(message.tabId);
        await chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          files: ['content/content.js']
        });

        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
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

      // Load libraries (once per tab) then execute command (every time)
      await ensureLibrariesLoaded(tab.id);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });

    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }
});
