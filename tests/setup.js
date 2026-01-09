// Test setup and mocks
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock NotificationSystem
global.NotificationSystem = {
  showSuccess: () => {},
  showError: () => {},
  showDebug: () => {},
};

// Mock Clipboard
global.Clipboard = {
  write: async () => true,
};

// Helper to load and evaluate source files in global scope
export function loadSourceFile(relativePath) {
  const fullPath = join(__dirname, '..', relativePath);
  let code = readFileSync(fullPath, 'utf8');

  // Replace `class ClassName` with `global.ClassName = class ClassName`
  // This makes classes globally accessible
  code = code.replace(/^class\s+(\w+)/gm, 'global.$1 = class $1');

  // Replace `const VariableName =` with `global.VariableName = ` to make consts globally accessible
  code = code.replace(/^const\s+(\w+)\s*=/gm, 'global.$1 =');

  // Replace `function functionName` with `global.functionName = function functionName`
  code = code.replace(/^function\s+(\w+)/gm, 'global.$1 = function $1');

  // Use indirect eval to execute in global scope
  (0, eval)(code);
}
