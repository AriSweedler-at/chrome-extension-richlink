// Check if a script has already been loaded in the page
async function isScriptLoaded(tabId, file) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (filename) => {
        if (typeof window.__RICHLINKER_LOADED__ === 'undefined') {
          window.__RICHLINKER_LOADED__ = new Set();
        }
        return window.__RICHLINKER_LOADED__.has(filename);
      },
      args: [file]
    });
    return results[0].result;
  } catch (e) {
    return false;
  }
}

// Mark a script as loaded
async function markScriptLoaded(tabId, file) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (filename) => {
      if (typeof window.__RICHLINKER_LOADED__ === 'undefined') {
        window.__RICHLINKER_LOADED__ = new Set();
      }
      window.__RICHLINKER_LOADED__.add(filename);
    },
    args: [file]
  });
}

// Inject script only if not already loaded
async function injectScriptSafe(tabId, file) {
  const loaded = await isScriptLoaded(tabId, file);

  if (!loaded) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file]
    });
    await markScriptLoaded(tabId, file);
  }
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
