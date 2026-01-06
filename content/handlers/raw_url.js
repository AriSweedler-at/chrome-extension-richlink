class RawUrlHandler extends Handler {
  getBaseLabel() {
    return 'Raw URL';
  }

  canHandle(_url) {
    // Accept everything - this handler always matches
    return true;
  }

  async extractInfo() {
    const titleUrl = window.location.href;

    // Raw URL handler - only provides the URL, no title
    // Create special WebpageInfo subclass that overrides getFormats
    const webpageInfo = new WebpageInfo({
      titleText: titleUrl,  // Use URL as title
      titleUrl: titleUrl,
      headerText: null,
      headerUrl: null
    });

    // Override getFormats to only return raw URL
    webpageInfo.getFormats = () => [
      {
        label: 'Raw URL',
        linkText: titleUrl,
        linkUrl: titleUrl
      }
    ];

    return webpageInfo;
  }
}
