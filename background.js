// Import shared execution utility
importScripts('shared/execute.js');
importScripts('shared/commands.js');

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

      // Execute: loads libraries (once) then runs command (every time)
      await execute(tab.id);

    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }
});
