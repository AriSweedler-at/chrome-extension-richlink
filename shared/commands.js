// Shared command functions
// Used by both background.js (for keyboard shortcuts) and popup.js (for menu)

// Get all available formats for the current page
async function getFormats(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const handlers = getAllHandlers();
      const currentUrl = window.location.href;

      // Find first specialized handler (not RawTitleHandler or RawUrlHandler)
      const specializedHandler = handlers.find(h =>
        h.canHandle(currentUrl) &&
        h.constructor.name !== 'RawTitleHandler' &&
        h.constructor.name !== 'RawUrlHandler'
      );

      const allFormats = [];
      const titleText = document.title || 'Untitled';
      const titleUrl = window.location.href;

      // If there's a specialized handler, get its formats
      if (specializedHandler) {
        let headerText = null;
        let headerUrl = null;

        // Special handling for Google Docs to get current heading
        if (specializedHandler.constructor.name === 'GoogleDocsHandler') {
          headerText = specializedHandler.getCurrentHeading?.() || null;
          if (headerText) {
            headerUrl = titleUrl;
          }
        }

        const webpageInfo = new WebpageInfo({
          titleText,
          titleUrl,
          headerText,
          headerUrl,
          style: specializedHandler.constructor.name === 'SpinnakerHandler' ? 'spinnaker' : 'normal'
        });

        const formats = webpageInfo.getFormats(specializedHandler);
        allFormats.push(...formats);
      }

      // Add RawTitleHandler formats unless specialized handler says to skip
      if (!specializedHandler || !specializedHandler.skipRawTitleHandler()) {
        const rawTitleHandler = new RawTitleHandler();
        const rawTitleInfo = new WebpageInfo({
          titleText,
          titleUrl,
          headerText: null,
          headerUrl: null
        });
        const rawTitleFormats = rawTitleInfo.getFormats(rawTitleHandler);

        // Only add Page Title (skip the duplicate Raw URL)
        allFormats.push(rawTitleFormats[0]); // Page Title
      }

      // Add Raw URL from RawUrlHandler (deduplicated single source)
      allFormats.push({
        label: 'Raw URL',
        linkText: titleUrl,
        linkUrl: titleUrl
      });

      const handlerNames = [];
      if (specializedHandler) {
        handlerNames.push(specializedHandler.constructor.name);
      }
      handlerNames.push('RawTitleHandler', 'RawUrlHandler');

      return {
        handlerNames: handlerNames,
        formats: allFormats.map((f, i) => ({
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
      const handlers = getAllHandlers();
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
