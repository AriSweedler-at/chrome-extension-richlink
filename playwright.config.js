import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Extensions can be flaky with parallel tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests serially for extensions
  reporter: 'html',
  timeout: 30000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        // Extension testing requires non-headless mode
        headless: false,
        viewport: { width: 1280, height: 720 },
        // Minimize browser window on macOS
        launchOptions: {
          args: [
            '--window-size=1,1', // Minimize window size
            '--window-position=2000,2000', // Move far off-screen
            '--disable-popup-blocking',
            '--disable-infobars',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
          ignoreDefaultArgs: ['--enable-automation'], // Don't show "Chrome is being controlled" bar
        },
      },
    },
  ],
});
