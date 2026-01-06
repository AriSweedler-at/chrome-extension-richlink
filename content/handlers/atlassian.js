class AtlassianHandler extends Handler {
  getBaseLabel() {
    return 'Page Title';
  }

  skipRawTitleHandler() {
    return true; // AtlassianHandler is essentially same as RawTitleHandler
  }

  canHandle(url) {
    return url.includes('.atlassian.net/wiki/spaces/');
  }

  async extractInfo() {
    const rawTitle = document.title || 'Atlassian Wiki Page';
    const titleUrl = window.location.href;

    // Remove "space name" and "Confluence" suffix by splitting on ' - ' and removing last 2 elements
    const titleParts = rawTitle.split(' - ');
    const titleText = titleParts.length > 2 ? titleParts.slice(0, -2).join(' - ') : rawTitle;

    NotificationSystem.showDebug(`AtlassianHandler: Raw title="${rawTitle}"`);
    NotificationSystem.showDebug(`AtlassianHandler: Cleaned title="${titleText}"`);
    NotificationSystem.showDebug(`AtlassianHandler: titleUrl="${titleUrl}"`);

    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }
}
