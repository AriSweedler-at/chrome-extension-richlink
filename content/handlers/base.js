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

      // Attach formatIndex to the WebpageInfo object
      const info = new WebpageInfo(data.webpageInfo);
      info.formatIndex = data.formatIndex || 0;
      return info;
    } catch (error) {
      localStorage.removeItem('richlinker-last-copy');
      return null;
    }
  }

  /**
   * Get all available link formats for this page
   * @param {Handler} handler - The handler that created this WebpageInfo
   * @returns {Array<{label: string, linkText: string, linkUrl: string}>} Array of link formats
   */
  getFormats(handler = null) {
    const formats = [];

    // Format 0: Base link (title + base URL)
    const baseLabel = handler ? handler.getBaseLabel() : 'Base';
    formats.push({
      label: baseLabel,
      linkText: this.titleText,
      linkUrl: this.titleUrl
    });

    // Format 1: Link with header (if available)
    if (this.headerText && this.headerUrl) {
      if (this.style === 'spinnaker') {
        // Spinnaker: add header format first, then base
        formats.unshift({
          label: `Pipeline: ${this.shorty(this.headerText, 16)}`,
          linkText: `spinnaker: ${this.headerText}`,
          linkUrl: this.headerUrl
        });
      } else {
        // Normal: add header format after base
        formats.push({
          label: `Header: ${this.shorty(this.headerText, 16)}`,
          linkText: `${this.titleText} #${this.headerText}`,
          linkUrl: this.headerUrl
        });
      }
    }

    // Always add raw URL as final format
    formats.push({
      label: 'Raw URL',
      linkText: this.titleUrl,
      linkUrl: this.titleUrl
    });

    return formats;
  }

  /**
   * Copy webpage info to clipboard as rich link
   * @returns {Promise<boolean>} True if successful
   */
  async toClipboard(handler = null) {
    const formats = this.getFormats(handler);

    // Get the format index to use (cycles through on repeated presses)
    const formatIndex = this.getFormatIndex(formats.length);
    const { label, linkText, linkUrl } = formats[formatIndex];

    // Raw URL format: just copy the URL as plain text, no rich link
    const isRawUrl = label === 'Raw URL';
    const html = isRawUrl ? linkUrl : `<a href="${linkUrl}">${linkText}</a>`;
    const text = isRawUrl ? linkUrl : `${linkText} (${linkUrl})`;

    try {
      const success = await Clipboard.write({ html, text });

      if (!success) {
        NotificationSystem.showError('Failed to copy to clipboard');
        return false;
      }

      // Cache this copy for cycling detection
      this.cacheWithIndex(formatIndex);

      // Show notification with format label
      const currentFormat = formats[formatIndex];
      const formatInfo = formats.length > 1 ? ` [${formatIndex + 1}/${formats.length}]` : '';

      NotificationSystem.showSuccess(`Copied to clipboard${formatInfo}\n${currentFormat.label}`);
      return true;
    } catch (error) {
      NotificationSystem.showDebug(`Clipboard error: ${error.message}`);
      NotificationSystem.showError('Failed to copy to clipboard');
      return false;
    }
  }

  /**
   * Get the format index to use based on cache (cycles through formats on repeated presses)
   * @param {number} numFormats - Total number of formats available
   * @returns {number} Index of format to use
   */
  getFormatIndex(numFormats) {
    const cached = WebpageInfo.getCached();

    // Not a repeat press - use first format
    if (!cached || !this.isSameAs(cached)) {
      return 0;
    }

    // Repeat press - cycle to next format
    const nextIndex = (cached.formatIndex + 1) % numFormats;
    console.log(`DEBUG: Cycling from format ${cached.formatIndex} to ${nextIndex}`);
    return nextIndex;
  }

  /**
   * Cache this WebpageInfo with format index
   * @param {number} formatIndex - The format index that was used
   */
  cacheWithIndex(formatIndex) {
    try {
      const data = {
        timestamp: Date.now(),
        formatIndex: formatIndex,
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

  // Override this to provide a custom base format label
  getBaseLabel() {
    return 'Base';
  }
}
