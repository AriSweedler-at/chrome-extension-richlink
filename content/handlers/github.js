class GitHubHandler extends Handler {
  canHandle(url) {
    // Match GitHub PR URLs: github.com/org/repo/pull/number
    if (!url.includes('github.com/')) {
      return false;
    }

    const parts = url.split('/');
    // Expected format: https://github.com/org/repo/pull/number
    // parts: ['https:', '', 'github.com', 'org', 'repo', 'pull', 'number', ...]

    if (parts.length < 7) {
      return false;
    }

    // Check that we have github.com, org, repo, 'pull', and a number
    const domain = parts[2];
    const org = parts[3];
    const repo = parts[4];
    const pullKeyword = parts[5];
    const prNumber = parts[6];

    return domain === 'github.com' &&
      org && org !== '' &&
      repo && repo !== '' &&
      pullKeyword === 'pull' &&
      prNumber && /^\d+$/.test(prNumber);
  }

  async extractInfo() {
    const titleElement = document.querySelector('.gh-header-title');
    if (!titleElement) {
      throw new Error("Could not find PR title element");
    }

    const titleText = titleElement.textContent.trim();
    const titleUrl = window.location.href;

    return new WebpageInfo({ titleText, titleUrl, headerText: null, headerUrl: null });
  }
}
