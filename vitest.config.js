import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// In the development container a Chromium matching the pre-installed
// Playwright lives at a fixed path; CI installs browsers the normal way.
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: [ 'test/unit/**/*.spec.js' ]
        }
      },
      {
        test: {
          name: 'browser',
          include: [ 'test/browser/**/*.spec.js' ],
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: false,
            provider: playwright({
              launchOptions: {
                executablePath,
                args: [ '--no-sandbox' ]
              }
            }),
            instances: [
              { browser: 'chromium' }
            ]
          }
        }
      }
    ]
  }
});
