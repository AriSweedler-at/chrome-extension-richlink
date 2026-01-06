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
  }
};
