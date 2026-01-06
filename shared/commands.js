// Shared command functions
// Used by both background.js (for keyboard shortcuts) and popup.js (for menu)

// Get all available formats for the current page
async function getFormats(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const handlers = [
        new GoogleDocsHandler(),
        new AtlassianHandler(),
        new AirtableHandler(),
        new GitHubHandler(),
        new SpinnakerHandler(),
        new FallbackHandler(),
      ];

      const currentUrl = window.location.href;
      const handler = handlers.find(h => h.canHandle(currentUrl));

      if (!handler) {
        throw new Error('No handler found');
      }

      // Extract page info synchronously where possible
      const titleText = document.title || 'Untitled';
      const titleUrl = window.location.href;

      let headerText = null;
      let headerUrl = null;

      // Special handling for Google Docs to get current heading
      if (handler.constructor.name === 'GoogleDocsHandler') {
        headerText = handler.getCurrentHeading?.() || null;
        if (headerText) {
          headerUrl = titleUrl;
        }
      }

      const webpageInfo = new WebpageInfo({
        titleText,
        titleUrl,
        headerText,
        headerUrl,
        style: handler.constructor.name === 'SpinnakerHandler' ? 'spinnaker' : 'normal'
      });

      const formats = webpageInfo.getFormats(handler);

      return {
        handlerName: handler.constructor.name,
        formats: formats.map((f, i) => ({
          index: i,
          label: f.label,
          linkText: f.linkText,
          linkUrl: f.linkUrl
        }))
      };
    }
  });

  return results[0].result;
}

// Copy a specific format by index
async function copyFormatByIndex(tabId, formatIndex) {
  // Ensure libraries are loaded (should already be loaded, but be safe)
  await ensureLibrariesLoaded(tabId);

  await chrome.scripting.executeScript({
    target: { tabId },
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
        const formats = webpageInfo.getFormats(handler);
        const format = formats[index];

        const html = `<a href="${format.linkUrl}">${format.linkText}</a>`;
        const text = `${format.linkText} (${format.linkUrl})`;

        Clipboard.write({ html, text }).then(success => {
          if (success) {
            webpageInfo.cacheWithIndex(index);

            // Show notification with format label
            const formatInfo = formats.length > 1 ? ` [${index + 1}/${formats.length}]` : '';

            NotificationSystem.showSuccess(`Copied to clipboard${formatInfo}\n${format.label}`);
          } else {
            NotificationSystem.showError('Failed to copy to clipboard');
          }
        });
      });
    },
    args: [formatIndex]
  });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getFormats, copyFormatByIndex };
}
