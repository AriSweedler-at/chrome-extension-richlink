const NotificationSystem = {
  /**
   * Show a success notification
   * @param {string} message - Message to display
   */
  showSuccess(message) {
    this._show(message, 'success');
  },

  /**
   * Show an error notification
   * @param {string} message - Message to display
   */
  showError(message) {
    this._show(message, 'error');
  },

  /**
   * Show a debug notification (only in development)
   * @param {string} message - Message to display
   */
  showDebug(message) {
    // Only show debug in console, not as toast
    console.log('[RichLinker Debug]', message);
  },

  /**
   * Internal method to show notification
   * @param {string} message - Message to display
   * @param {string} type - 'success' or 'error'
   */
  _show(message, type) {
    // Remove any existing notification
    const existing = document.getElementById('richlinker-notification');
    if (existing) {
      existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'richlinker-notification';
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      backgroundColor: type === 'success' ? '#4caf50' : '#f44336',
      color: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      maxWidth: '400px',
      whiteSpace: 'pre-line',
      opacity: '0',
      transition: 'opacity 0.3s ease-in-out'
    });

    // Add to page
    document.body.appendChild(notification);

    // Fade in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });

    // Auto-dismiss after 1.5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 1500);
  }
};
