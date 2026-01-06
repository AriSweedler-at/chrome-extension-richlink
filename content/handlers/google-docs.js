class GoogleDocsHandler extends Handler {
  getBaseLabel() {
    return 'Doc Title';
  }

  canHandle(url) {
    return url.includes('docs.google.com/document/d/');
  }

  getCurrentHeading() {
    // Look for the highlighted navigation item in Google Docs outline
    const highlightedItem = document.querySelector('.navigation-item.location-indicator-highlight');
    if (!highlightedItem) {
      return null;
    }

    // Extract the heading text from the tooltip or content
    const contentContainer = highlightedItem.querySelector('.navigation-item-content-container');
    const content = highlightedItem.querySelector('.navigation-item-content');

    // Try to get text from data-tooltip first (most reliable)
    if (content && content.dataset.tooltip) {
      return content.dataset.tooltip;
    }

    // Fallback to text content
    if (content) {
      const headingText = content.textContent?.trim();
      if (headingText) {
        return headingText;
      }
    }

    // Fallback to aria-label
    if (contentContainer) {
      const ariaLabel = contentContainer.getAttribute('aria-label');
      if (ariaLabel) {
        // Remove the level information (e.g., "Team rituals level 2" -> "Team rituals")
        return ariaLabel.replace(/ level \d+$/, '');
      }
    }

    return null;
  }

  async extractInfo() {
    const titleText = document.title.replace(' - Google Docs', '') || 'Untitled Document';
    const titleUrl = window.location.href.split('#')[0];
    const headerUrl = window.location.href;

    NotificationSystem.showDebug(`GoogleDocsHandler: Extracting from title="${titleText}"`);
    NotificationSystem.showDebug(`GoogleDocsHandler: titleUrl="${titleUrl}"`);

    // Get current heading from navigation, if available
    let headerText = null;
    try {
      headerText = this.getCurrentHeading();
      if (headerText) {
        NotificationSystem.showDebug(`GoogleDocsHandler: Found heading="${headerText}"`);
      } else {
        NotificationSystem.showDebug('GoogleDocsHandler: No current heading detected');
      }
    } catch (error) {
      console.error("GoogleDocsHandler: Failed to retrieve current heading", error);
      NotificationSystem.showDebug(`GoogleDocsHandler: Heading extraction failed: ${error.message}`);
    }

    return new WebpageInfo({ titleText, titleUrl, headerText, headerUrl });
  }
}
