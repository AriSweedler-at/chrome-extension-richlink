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
    NotificationSystem.showDebug('RichLinker: No matching handler found');
    NotificationSystem.showError('No handler found for this page');
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
