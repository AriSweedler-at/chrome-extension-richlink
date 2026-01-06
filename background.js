// Import shared execution utility
importScripts('shared/execute.js');
importScripts('shared/commands.js');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFormats') {
    handleGetFormats(message, sendResponse);
    return true;
  }

  if (message.action === 'updateCacheAndNotify') {
    handleUpdateCacheAndNotify(message, sendResponse);
    return true;
  }
});

// Handle get formats request from popup
async function handleGetFormats(message, sendResponse) {
  try {
    await ensureLibrariesLoaded(message.tabId);
    const formats = await getFormats(message.tabId);
    sendResponse({ success: true, data: formats });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle cache update and notification from popup
async function handleUpdateCacheAndNotify(message, sendResponse) {
  try {
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

          // Show notification
          const formats = webpageInfo.getFormats();
          const format = formats[index];
          const isRawUrl = format.linkText === format.linkUrl;
          const formatInfo = formats.length > 1 ? ` [${index + 1}/${formats.length}]` : '';
          const messageType = isRawUrl ? 'Copied raw URL to clipboard' : `Copied ${format.label} to clipboard`;
          const preview = format.linkText.substring(0, 40) + (format.linkText.length > 40 ? '...' : '');

          NotificationSystem.showSuccess(`${messageType}${formatInfo}\n* ${preview}`);
        });
      },
      args: [message.formatIndex]
    });

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
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
