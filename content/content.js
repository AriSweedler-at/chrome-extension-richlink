// Check if this is a double-press on the same page within 1 second
function isDoublePressFromSamePage(url) {
  const cached = localStorage.getItem('richlinker-last-fallback');
  if (!cached) return false;

  try {
    const data = JSON.parse(cached);
    return Date.now() - data.timestamp <= 1000 && data.url === url;
  } catch (e) {
    return false;
  }
}

// Handle fallback for pages without a special handler
async function handleFallback(url) {
  NotificationSystem.showDebug('RichLinker: No matching handler found - using fallback');

  try {
    if (isDoublePressFromSamePage(url)) {
      // Second press: copy just the raw URL
      await Clipboard.copyRawUrl(url);
    } else {
      // First press: copy as rich link
      const pageTitle = document.title || 'Untitled';
      await Clipboard.copyRichLink(url, pageTitle);
    }
  } catch (error) {
    console.error('RichLinker fallback error:', error);
    NotificationSystem.showError('Failed to copy URL');
  }
}

// Handle extraction and copying with a specialized handler
async function handleWithHandler(handler) {
  NotificationSystem.showDebug(`RichLinker: Using handler: ${handler.constructor.name}`);

  try {
    const webpageInfo = await handler.extractInfo();
    NotificationSystem.showDebug(`RichLinker: Extracted info - Title: "${webpageInfo.titleText}", Header: "${webpageInfo.headerText || 'none'}"`);
    await webpageInfo.toClipboard();
  } catch (error) {
    console.error('RichLinker error:', error);
    NotificationSystem.showError('Failed to extract page information');
  }
}

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
  ];

  const handler = handlers.find(h => h.canHandle(currentUrl));

  // Early exit: use fallback if no handler matches
  if (!handler) {
    await handleFallback(currentUrl);
    return;
  }

  await handleWithHandler(handler);
}

// Execute immediately
try {
  execute();
} catch (error) {
  console.error('RichLinker error:', error);
  NotificationSystem.showError('Failed to extract page information');
}
