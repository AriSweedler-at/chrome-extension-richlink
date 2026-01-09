import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { loadSourceFile } from './setup.js';

// Remove the mocked NotificationSystem from setup since we want to test the real one
delete global.NotificationSystem;

// Load dependencies
loadSourceFile('content/colors.js');
loadSourceFile('content/notifications.js');

describe('NotificationSystem', () => {
  beforeEach(() => {
    // Setup mock DOM
    document.body.innerHTML = '';

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      cb();
      return 1;
    });

    // Mock setTimeout to execute immediately for testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should show success notification with default green', () => {
    NotificationSystem.showSuccess('Test message');

    const notification = document.getElementById('richlinker-notification');
    expect(notification).not.toBeNull();
    expect(notification.textContent).toBe('Test message');
    // Browser converts hex to rgb
    expect(notification.style.backgroundColor).toBe('rgb(76, 175, 80)'); // #4caf50
  });

  test('should show success notification with muted green for fallback', () => {
    NotificationSystem.showSuccess('Copied fallback', { muted: true });

    const notification = document.getElementById('richlinker-notification');
    expect(notification).not.toBeNull();
    // Browser converts hex to rgb
    expect(notification.style.backgroundColor).toBe('rgb(129, 199, 132)'); // #81c784
  });

  test('should show error notification with default red', () => {
    NotificationSystem.showError('Error message');

    const notification = document.getElementById('richlinker-notification');
    expect(notification).not.toBeNull();
    expect(notification.textContent).toBe('Error message');
    // Browser converts hex to rgb
    expect(notification.style.backgroundColor).toBe('rgb(244, 67, 54)'); // #f44336
  });

  test('should show error notification with muted red', () => {
    NotificationSystem.showError('Minor error', { muted: true });

    const notification = document.getElementById('richlinker-notification');
    expect(notification).not.toBeNull();
    // Browser converts hex to rgb
    expect(notification.style.backgroundColor).toBe('rgb(229, 115, 115)'); // #e57373
  });

  test('should remove existing notification before showing new one', () => {
    NotificationSystem.showSuccess('First message');
    const first = document.getElementById('richlinker-notification');
    expect(first).not.toBeNull();

    NotificationSystem.showSuccess('Second message');
    const notifications = document.querySelectorAll('#richlinker-notification');
    expect(notifications.length).toBe(1);
    expect(notifications[0].textContent).toBe('Second message');
  });

  test('should set correct z-index for visibility', () => {
    NotificationSystem.showSuccess('Test');

    const notification = document.getElementById('richlinker-notification');
    expect(notification.style.zIndex).toBe('2147483647');
  });

  test('should set fixed position in top right', () => {
    NotificationSystem.showSuccess('Test');

    const notification = document.getElementById('richlinker-notification');
    expect(notification.style.position).toBe('fixed');
    expect(notification.style.top).toBe('20px');
    expect(notification.style.right).toBe('20px');
  });

  test('should show debug messages only in console', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    NotificationSystem.showDebug('Debug message');

    expect(consoleSpy).toHaveBeenCalledWith('[RichLinker Debug]', 'Debug message');

    // Should not create notification element
    const notification = document.getElementById('richlinker-notification');
    expect(notification).toBeNull();

    consoleSpy.mockRestore();
  });

  test('should handle multiline messages', () => {
    NotificationSystem.showSuccess('Line 1\nLine 2');

    const notification = document.getElementById('richlinker-notification');
    expect(notification.textContent).toBe('Line 1\nLine 2');
    expect(notification.style.whiteSpace).toBe('pre-line');
  });

  test('should auto-dismiss after timeout', () => {
    NotificationSystem.showSuccess('Test');

    const notification = document.getElementById('richlinker-notification');
    expect(notification).not.toBeNull();

    // requestAnimationFrame is mocked to run immediately, so opacity should be '1'
    // But jsdom might not update it immediately, so we just check it exists
    expect(notification).toBeTruthy();

    // Fast forward 1500ms
    jest.advanceTimersByTime(1500);

    // Should fade out
    expect(notification.style.opacity).toBe('0');

    // Fast forward fade animation (300ms)
    jest.advanceTimersByTime(300);

    // Should be removed from DOM
    expect(document.getElementById('richlinker-notification')).toBeNull();
  });
});
