// Main execution function
async function execute() {
  // Register all handlers
  const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
  ];

  // Dispatch to proper handler
  const currentUrl = window.location.href;
  NotificationSystem.showDebug(`RichLinker: Processing URL: ${currentUrl}`);

  const handler = handlers.find(h => h.canHandle(currentUrl));

  if (!handler) {
    // Fallback: copy the URL as a link, or just raw URL on double-press
    NotificationSystem.showDebug('RichLinker: No matching handler found - using fallback');

    try {
      // Check if we just copied from this same page (within 1 second)
      const cached = localStorage.getItem('richlinker-last-fallback');
      let isDoublePressFromSamePage = false;

      if (cached) {
        try {
          const data = JSON.parse(cached);
          const now = Date.now();

          if (now - data.timestamp <= 1000 && data.url === currentUrl) {
            isDoublePressFromSamePage = true;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (isDoublePressFromSamePage) {
        // Second press: copy just the raw URL
        const success = await Clipboard.write({
          html: currentUrl,
          text: currentUrl
        });

        if (success) {
          NotificationSystem.showSuccess(`Copied raw URL to clipboard\n${currentUrl.substring(0, 50)}${currentUrl.length > 50 ? '...' : ''}`);
        } else {
          NotificationSystem.showError('Failed to copy to clipboard');
        }
      } else {
        // First press: copy as rich link
        const pageTitle = document.title || 'Untitled';
        const html = `<a href="${currentUrl}">${pageTitle}</a>`;
        const text = `${pageTitle} (${currentUrl})`;

        const success = await Clipboard.write({ html, text });

        if (success) {
          // Cache this copy for double-press detection
          localStorage.setItem('richlinker-last-fallback', JSON.stringify({
            timestamp: Date.now(),
            url: currentUrl
          }));

          NotificationSystem.showSuccess(`Copied link to clipboard\n* title: ${pageTitle.substring(0, 30)}${pageTitle.length > 30 ? '...' : ''}`);
        } else {
          NotificationSystem.showError('Failed to copy to clipboard');
        }
      }
    } catch (error) {
      console.error('RichLinker fallback error:', error);
      NotificationSystem.showError('Failed to copy URL');
    }
    return;
  }

  NotificationSystem.showDebug(`RichLinker: Using handler: ${handler.constructor.name}`);

  try {
    const webpageInfo = await handler.extractInfo();
    NotificationSystem.showDebug(`RichLinker: Extracted info - Title: "${webpageInfo.titleText}", Header: "${webpageInfo.headerText || 'none'}"`);

    // Copy to clipboard
    await webpageInfo.toClipboard();
  } catch (error) {
    console.error('RichLinker error:', error);
    NotificationSystem.showError('Failed to extract page information');
  }
}

// Execute immediately
try {
  execute();
} catch (error) {
  console.error('RichLinker error:', error);
  NotificationSystem.showError('Failed to extract page information');
}
