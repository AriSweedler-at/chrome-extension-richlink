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

      // Inject content scripts in order
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/clipboard.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/notifications.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/base.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/google-docs.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/atlassian.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/airtable.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/github.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/spinnaker.js']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/handlers/fallback.js']
      });

      // Finally, inject and execute main content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });

    } catch (error) {
      console.error('Failed to inject content scripts:', error);
    }
  }
});
