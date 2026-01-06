const Clipboard = {
  /**
   * Write both HTML and plain text to clipboard
   * @param {Object} data - Clipboard data
   * @param {string} data.html - HTML content
   * @param {string} data.text - Plain text content
   * @returns {Promise<boolean>} Success status
   */
  async write({ html, text }) {
    try {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      });

      await navigator.clipboard.write([clipboardItem]);
      return true;
    } catch (error) {
      console.error('Clipboard write failed:', error);
      return false;
    }
  },

  /**
   * Copy raw URL to clipboard
   * @param {string} url - URL to copy
   */
  async copyRawUrl(url) {
    const success = await this.write({
      html: url,
      text: url
    });

    if (!success) {
      NotificationSystem.showError('Failed to copy to clipboard');
      return;
    }

    const truncated = url.substring(0, 50) + (url.length > 50 ? '...' : '');
    NotificationSystem.showSuccess(`Copied raw URL to clipboard\n${truncated}`);
  },

  /**
   * Copy rich link (title + URL) to clipboard with caching for double-press detection
   * @param {string} url - URL to copy
   * @param {string} title - Page title
   */
  async copyRichLink(url, title) {
    const html = `<a href="${url}">${title}</a>`;
    const text = `${title} (${url})`;

    const success = await this.write({ html, text });

    if (!success) {
      NotificationSystem.showError('Failed to copy to clipboard');
      return;
    }

    // Cache this copy for double-press detection
    localStorage.setItem('richlinker-last-fallback', JSON.stringify({
      timestamp: Date.now(),
      url: url
    }));

    const truncated = title.substring(0, 30) + (title.length > 30 ? '...' : '');
    NotificationSystem.showSuccess(`Copied link to clipboard\n* title: ${truncated}`);
  }
};
