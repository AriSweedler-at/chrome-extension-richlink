class SpaceliftHandler extends Handler {
  getBaseLabel() {
    return 'stack';
  }

  skipRawTitleHandler() {
    return true;
  }

  canHandle(url) {
    if (!url.includes('spacelift.shadowbox.cloud/stack/')) {
      return false;
    }

    const parts = url.split('/');
    // Expected format: https://spacelift.shadowbox.cloud/stack/{stackName}/run/{runId}
    // parts: ['https:', '', 'spacelift.shadowbox.cloud', 'stack', '{stackName}', 'run', '{runId}']

    if (parts.length < 7) {
      return false;
    }

    return parts[2] === 'spacelift.shadowbox.cloud' &&
      parts[3] === 'stack' &&
      parts[5] === 'run' &&
      parts[4] && parts[4] !== '' &&
      parts[6] && parts[6] !== '';
  }

  parseSpaceliftUrl(url) {
    if (!this.canHandle(url)) {
      return null;
    }

    const parts = url.split('/');
    return {
      stackName: parts[4],
      runId: parts[6]
    };
  }

  parseTitle(title) {
    // Expected format: "Title text · stack-name | Spacelift"
    if (!title.includes(' · ') || !title.includes(' | Spacelift')) {
      return null;
    }

    const beforeStack = title.split(' · ')[0];
    return beforeStack;
  }

  async extractInfo() {
    const urlInfo = this.parseSpaceliftUrl(window.location.href);
    if (!urlInfo) {
      throw new Error("Could not parse Spacelift URL");
    }

    const titleText = this.parseTitle(document.title);
    if (!titleText) {
      throw new Error("Could not parse Spacelift title");
    }

    const stackName = urlInfo.stackName;
    const titleUrl = window.location.href.split('/run/')[0];

    // Base format: "spacelift: {stackName}"
    const baseTitle = `spacelift: ${stackName}`;

    // With run format: "spacelift: {stackName} (due to {titleText})"
    const headerText = `spacelift: ${stackName} (due to ${titleText})`;
    const headerUrl = window.location.href;

    const webpageInfo = new WebpageInfo({
      titleText: baseTitle,
      titleUrl,
      headerText,
      headerUrl
    });

    // Override getFormats to provide custom formats
    webpageInfo.getFormats = () => {
      return [
        {
          label: 'spacelift stack with PR',
          linkText: headerText,
          linkUrl: headerUrl
        },
        {
          label: 'stack',
          linkText: baseTitle,
          linkUrl: titleUrl
        }
      ];
    };

    return webpageInfo;
  }
}
