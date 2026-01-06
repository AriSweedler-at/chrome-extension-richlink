class WebpageInfo {
  constructor({ titleText, titleUrl, headerText = null, headerUrl = null, style = "normal" }) {
    this.titleText = titleText;
    this.titleUrl = titleUrl;
    this.headerText = headerText;
    this.headerUrl = headerUrl;
    this.style = style; // "normal" or "spinnaker"
  }

  /**
   * Utility function to shorten text with ellipsis
   * @param {string} text - Text to shorten
   * @param {number} maxLength - Maximum length (default 30)
   * @returns {string} Shortened text with ellipsis if needed
   */
  shorty(text, maxLength = 30) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  /**
   * Returns a plain text preview for use with NotificationSystem
   * @param {boolean} [includeHeader=true] - Whether to include header in preview
   * @returns {string} Plain text preview with title and optional header
   */
  preview(includeHeader = true) {
    const title = this.titleText || 'Untitled';
    const lines = [`* title: ${this.shorty(title, 30)}`];

    if (includeHeader && this.headerText) {
      lines.push(`* header: ${this.shorty(this.headerText, 30)}`);
    }

    return lines.join('\n');
  }

  /**
   * Check if this WebpageInfo is the same as another
   * @param {WebpageInfo} other - Other WebpageInfo to compare
   * @returns {boolean} True if same title and URLs
   */
  isSameAs(other) {
    return this.titleText === other.titleText &&
      this.titleUrl === other.titleUrl &&
      this.headerText === other.headerText &&
      this.headerUrl === other.headerUrl;
  }

  /**
   * Get the link text and URL based on style and whether to include header
   * @param {boolean} includeHeader - Whether to include header in the link
   * @returns {{linkText: string, linkUrl: string}} The formatted link text and URL
   */
  getLinkTextAndUrl(includeHeader) {
    switch (this.style) {
      case "spinnaker": {
        // Spinnaker style: first click shows header, second click shows base (inverted)
        const useHeader = !includeHeader;

        if (useHeader && this.headerText) {
          return {
            linkText: `spinnaker: ${this.headerText}`,
            linkUrl: this.headerUrl
          };
        }

        return {
          linkText: this.titleText,
          linkUrl: this.titleUrl
        };
      }

      case "normal": {
        // Normal style: first click shows base, second click includes header
        const useHeader = includeHeader;
        const linkText = useHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
        const linkUrl = useHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

        return { linkText, linkUrl };
      }

      default: {
        console.error(`Unknown style: "${this.style}". Falling back to "normal" style.`);
        const useHeader = includeHeader;
        const linkText = useHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
        const linkUrl = useHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

        return { linkText, linkUrl };
      }
    }
  }

  /**
   * Get cached WebpageInfo from localStorage
   * @returns {WebpageInfo|null} Cached info or null if expired/missing
   */
  static getCached() {
    try {
      const cached = localStorage.getItem('richlinker-last-copy');
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > 1000;

      // Remove expired cache and return null
      if (isExpired) {
        localStorage.removeItem('richlinker-last-copy');
        return null;
      }

      return new WebpageInfo(data.webpageInfo);
    } catch (error) {
      localStorage.removeItem('richlinker-last-copy');
      return null;
    }
  }

  /**
   * Cache this WebpageInfo to localStorage
   */
  cache() {
    try {
      const data = {
        timestamp: Date.now(),
        webpageInfo: {
          titleText: this.titleText,
          titleUrl: this.titleUrl,
          headerText: this.headerText,
          headerUrl: this.headerUrl,
          style: this.style
        }
      };
      localStorage.setItem('richlinker-last-copy', JSON.stringify(data));
    } catch (error) {
      console.log('DEBUG: Failed to cache WebpageInfo:', error.message);
    }
  }

  /**
   * Copy webpage info to clipboard as rich link
   * @returns {Promise<boolean>} True if successful
   */
  async toClipboard() {
    // Check if we just copied the same thing (double-press detection)
    const cached = WebpageInfo.getCached();
    const includeHeader = cached && this.isSameAs(cached);
    if (includeHeader) {
      console.log('DEBUG: Same item detected - will include header on second copy');
    }

    // Get link text and URL based on style
    const { linkText, linkUrl } = this.getLinkTextAndUrl(includeHeader);
    const html = `<a href="${linkUrl}">${linkText}</a>`;
    const text = `${linkText} (${linkUrl})`;

    try {
      const success = await Clipboard.write({ html, text });

      if (!success) {
        NotificationSystem.showError('Failed to copy to clipboard');
        return false;
      }

      // Cache this copy for duplicate detection
      this.cache();

      // For notification preview, show header if it's included in the link
      const showHeaderInPreview = linkUrl === this.headerUrl;
      NotificationSystem.showSuccess(`Copied rich link to clipboard\n${this.preview(showHeaderInPreview)}`);
      return true;
    } catch (error) {
      NotificationSystem.showDebug(`Clipboard error: ${error.message}`);
      NotificationSystem.showError('Failed to copy to clipboard');
      return false;
    }
  }
}

class Handler {
  constructor() {
    if (new.target === Handler) {
      throw new Error('Handler is an abstract class');
    }
  }

  canHandle(_url) {
    throw new Error('canHandle() must be implemented');
  }

  async extractInfo() {
    throw new Error('extractInfo() must be implemented');
  }
}
