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

      // Can't message chrome:// or extension:// pages
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
        console.log('Cannot execute on chrome:// or extension pages');
        return;
      }

      // Send message to content script to execute copy action
      await chrome.tabs.sendMessage(tab.id, {
        action: 'execute'
      });

    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }
});
