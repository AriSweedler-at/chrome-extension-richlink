import { describe, test, expect } from '@jest/globals';
import { loadSourceFile } from './setup.js';

// Load color palette
loadSourceFile('content/colors.js');

describe('Colors palette', () => {
  test('should have all required color keys', () => {
    expect(Colors.success).toBe('#4caf50');
    expect(Colors.successMuted).toBe('#81c784');
    expect(Colors.failure).toBe('#f44336');
    expect(Colors.failureMuted).toBe('#e57373');
    expect(Colors.default).toBe('#f5deb3');
  });
});

describe('getColor function', () => {
  test('should return base color without options', () => {
    expect(getColor('success')).toBe('#4caf50');
    expect(getColor('failure')).toBe('#f44336');
  });

  test('should return base color when muted is false', () => {
    expect(getColor('success', { muted: false })).toBe('#4caf50');
    expect(getColor('failure', { muted: false })).toBe('#f44336');
  });

  test('should return muted color when muted is true', () => {
    expect(getColor('success', { muted: true })).toBe('#81c784');
    expect(getColor('failure', { muted: true })).toBe('#e57373');
  });

  test('should return default color for unknown key', () => {
    expect(getColor('unknown')).toBe('#f5deb3');
    expect(getColor('invalid', { muted: false })).toBe('#f5deb3');
  });

  test('should fallback to base color if muted variant does not exist', () => {
    // Create a test where we request muted version of a color that doesn't have a muted variant
    // In this case, 'default' doesn't have 'defaultMuted'
    expect(getColor('default', { muted: true })).toBe('#f5deb3');
  });

  test('should fallback to default if both key and muted key do not exist', () => {
    expect(getColor('nonexistent', { muted: true })).toBe('#f5deb3');
  });

  test('should handle empty options object', () => {
    expect(getColor('success', {})).toBe('#4caf50');
  });
});
