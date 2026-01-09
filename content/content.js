// Main execution function
async function execute() {
  const currentUrl = window.location.href;
  NotificationSystem.showDebug(`RichLinker: Processing URL: ${currentUrl}`);

  const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
    new RawTitleHandler(),
    new RawUrlHandler(),
  ];

  // Find first specialized handler (not RawTitle or RawUrl)
  const specializedHandler = handlers.find(h =>
    h.canHandle(currentUrl) &&
    h.constructor.name !== 'RawTitleHandler' &&
    h.constructor.name !== 'RawUrlHandler'
  );

  const allFormats = [];

  // If there's a specialized handler, get its formats
  if (specializedHandler) {
    NotificationSystem.showDebug(`RichLinker: Using handler: ${specializedHandler.constructor.name}`);

    try {
      const webpageInfo = await specializedHandler.extractInfo();
      NotificationSystem.showDebug(`RichLinker: Extracted info - Title: "${webpageInfo.titleText}", Header: "${webpageInfo.headerText || 'none'}"`);

      const formats = webpageInfo.getFormats(specializedHandler);
      allFormats.push(...formats);
    } catch (error) {
      console.error('RichLinker specialized handler error:', error);
    }
  }

  // Add RawTitleHandler format unless specialized handler says to skip
  if (!specializedHandler || !specializedHandler.skipRawTitleHandler()) {
    const rawTitleHandler = new RawTitleHandler();
    const rawTitleInfo = await rawTitleHandler.extractInfo();
    const rawTitleFormats = rawTitleInfo.getFormats(rawTitleHandler);
    allFormats.push(rawTitleFormats[0]); // Just the Page Title, not the duplicate Raw URL
  }

  // Add Raw URL (deduplicated)
  allFormats.push({
    label: 'Raw URL',
    linkText: window.location.href,
    linkUrl: window.location.href
  });

  // Now cycle through all collected formats
  const cached = WebpageInfo.getCached();
  const formatIndex = cached ? (cached.formatIndex + 1) % allFormats.length : 0;

  const format = allFormats[formatIndex];
  const isRawUrl = format.label === 'Raw URL';
  const html = isRawUrl ? format.linkUrl : `<a href="${format.linkUrl}">${format.linkText}</a>`;
  const text = isRawUrl ? format.linkUrl : `${format.linkText} (${format.linkUrl})`;

  try {
    const success = await Clipboard.write({ html, text });

    if (!success) {
      NotificationSystem.showError('Failed to copy to clipboard');
      return;
    }

    // Cache with format index
    localStorage.setItem('richlinker-last-copy', JSON.stringify({
      timestamp: Date.now(),
      formatIndex: formatIndex,
      webpageInfo: {
        titleText: document.title,
        titleUrl: window.location.href,
        headerText: null,
        headerUrl: null
      }
    }));

    const formatInfo = allFormats.length > 1 ? ` [${formatIndex + 1}/${allFormats.length}]` : '';
    const isFallback = format.label === 'Page Title' || format.label === 'Raw URL';
    NotificationSystem.showSuccess(`Copied to clipboard${formatInfo}\n${format.label}`, { muted: isFallback });
  } catch (error) {
    NotificationSystem.showDebug(`Clipboard error: ${error.message}`);
    NotificationSystem.showError('Failed to copy to clipboard');
  }
}

// Function to get all available formats without copying
async function getFormats() {
  const currentUrl = window.location.href;
  const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
    new RawTitleHandler(),
    new RawUrlHandler(),
  ];

  // Find first specialized handler (not RawTitle or RawUrl)
  const specializedHandler = handlers.find(h =>
    h.canHandle(currentUrl) &&
    h.constructor.name !== 'RawTitleHandler' &&
    h.constructor.name !== 'RawUrlHandler'
  );

  const allFormats = [];
  const handlerNames = [];

  // If there's a specialized handler, get its formats
  if (specializedHandler) {
    handlerNames.push(specializedHandler.constructor.name);
    try {
      const webpageInfo = await specializedHandler.extractInfo();
      const formats = webpageInfo.getFormats(specializedHandler);
      allFormats.push(...formats);
    } catch (error) {
      console.error('RichLinker specialized handler error:', error);
    }
  }

  // Add RawTitleHandler format unless specialized handler says to skip
  if (!specializedHandler || !specializedHandler.skipRawTitleHandler()) {
    const rawTitleHandler = new RawTitleHandler();
    handlerNames.push('RawTitleHandler');
    const rawTitleInfo = await rawTitleHandler.extractInfo();
    const rawTitleFormats = rawTitleInfo.getFormats(rawTitleHandler);
    allFormats.push(rawTitleFormats[0]);
  }

  // Add Raw URL
  handlerNames.push('RawUrlHandler');
  allFormats.push({
    label: 'Raw URL',
    linkText: window.location.href,
    linkUrl: window.location.href
  });

  return { formats: allFormats, handlerNames };
}

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'execute') {
    // Execute copy action (from keyboard shortcut)
    execute().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Will respond asynchronously
  }

  if (message.action === 'getFormats') {
    // Return formats (from popup)
    getFormats().then(result => {
      sendResponse({ success: true, data: result });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Will respond asynchronously
  }

  if (message.action === 'updateCacheAndNotify') {
    // Update cache with the selected format index and show notification
    const formatIndex = message.formatIndex;

    // Cache the format index
    localStorage.setItem('richlinker-last-copy', JSON.stringify({
      timestamp: Date.now(),
      formatIndex: formatIndex,
      webpageInfo: {
        titleText: document.title,
        titleUrl: window.location.href,
        headerText: null,
        headerUrl: null
      }
    }));

    // Get formats to show notification
    getFormats().then(result => {
      const { formats } = result;
      const format = formats[formatIndex];
      const formatInfo = formats.length > 1 ? ` [${formatIndex + 1}/${formats.length}]` : '';
      const isFallback = format.label === 'Page Title' || format.label === 'Raw URL';
      NotificationSystem.showSuccess(`Copied to clipboard${formatInfo}\n${format.label}`, { muted: isFallback });

      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true; // Will respond asynchronously
  }
});
