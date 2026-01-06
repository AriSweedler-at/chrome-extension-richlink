// Inject scripts with include guard using global loaded files tracker
async function injectScriptSafe(tabId, file) {
  const response = await fetch(chrome.runtime.getURL(file));
  const code = await response.text();

  // Wrap with include guard using global __RICHLINKER_LOADED__ set
  const guardedCode = `
    if (typeof window.__RICHLINKER_LOADED__ === 'undefined') {
      window.__RICHLINKER_LOADED__ = new Set();
    }
    if (!window.__RICHLINKER_LOADED__.has('${file}')) {
      window.__RICHLINKER_LOADED__.add('${file}');
      ${code}
    }
  `;

  await chrome.scripting.executeScript({
    target: { tabId },
    func: new Function(guardedCode)
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

      // Inject content scripts in order
      const contentScripts = [
        'content/clipboard.js',
        'content/notifications.js',
        'content/handlers/base.js',
        'content/handlers/google-docs.js',
        'content/handlers/atlassian.js',
        'content/handlers/airtable.js',
        'content/handlers/github.js',
        'content/handlers/spinnaker.js',
        'content/handlers/fallback.js',
        'content/content.js',
      ];

      for (const file of contentScripts) {
        await injectScriptSafe(tab.id, file);
      }

    } catch (error) {
      console.error('Failed to inject content scripts:', error);
    }
  }
});
