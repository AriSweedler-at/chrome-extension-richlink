class RawTitleHandler extends Handler {
  getBaseLabel() {
    return 'Page Title';
  }

  canHandle(_url) {
    // Accept everything - this is the default fallback handler
    return true;
  }

  async extractInfo() {
    const titleText = document.title || 'Untitled';
    const titleUrl = window.location.href;

    // Fallback handler uses base WebpageInfo with no header
    // The getFormats() method will automatically add raw URL as final format
    return new WebpageInfo({
      titleText,
      titleUrl,
      headerText: null,
      headerUrl: null
    });
  }
}
