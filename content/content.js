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
    // Fallback: just copy the URL as plain text
    NotificationSystem.showDebug('RichLinker: No matching handler found - using fallback');

    try {
      const pageTitle = document.title || 'Untitled';
      const html = `<a href="${currentUrl}">${pageTitle}</a>`;
      const text = `${pageTitle} (${currentUrl})`;

      const success = await Clipboard.write({ html, text });

      if (success) {
        NotificationSystem.showSuccess(`Copied link to clipboard\n* title: ${pageTitle.substring(0, 30)}${pageTitle.length > 30 ? '...' : ''}`);
      } else {
        NotificationSystem.showError('Failed to copy to clipboard');
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
