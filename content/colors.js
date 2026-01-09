// Color palette for notifications and UI elements
const Colors = {
  success: '#4caf50',        // Standard green for success notifications
  successMuted: '#81c784',   // Paler green for fallback/less important success
  failure: '#f44336',        // Standard red for error notifications
  failureMuted: '#e57373',   // Paler red for less critical errors
  default: '#f5deb3',        // Beige for unknown/fallback color keys
};

/**
 * Get a color from the palette with optional muted variant
 * @param {string} key - Base color key (e.g., 'success', 'failure')
 * @param {Object} options - Optional configuration
 * @param {boolean} options.muted - If true, returns the muted variant
 * @returns {string} Hex color code
 */
function getColor(key, options = {}) {
  const { muted = false } = options;

  if (muted) {
    const mutedKey = key + 'Muted';
    // Return muted variant if it exists, otherwise fall back to base key
    return Colors[mutedKey] || Colors[key] || Colors.default;
  }

  return Colors[key] || Colors.default;
}
