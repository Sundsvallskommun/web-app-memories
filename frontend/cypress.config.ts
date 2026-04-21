import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';
import { addMatchImageSnapshotPlugin } from '@simonsmith/cypress-image-snapshot/plugin';

export default defineConfig({
  e2e: {
    supportFile: 'cypress/support/e2e.ts',
    baseUrl: `http://localhost:${process.env.PORT || '3000'}${process.env.NEXT_PUBLIC_BASEPATH || ''}`,
    env: {
      apiUrl: `${process.env.NEXT_PUBLIC_API_URL}`,
      // IMPORTANT
      // The value below is a test email
      mockEmail: 'mail@example.com',
      // The value below is a test phone number from Post- och telestyrelsen, it is not a real phone number
      mockPhoneNumber: '0701740635',
    },
    video: false,
    viewportWidth: 1440,
    viewportHeight: 1024,
    screenshotOnRunFailure: false,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Browser launch options for consistent rendering
      on('before:browser:launch', (browser, launchOptions) => {
        const width = 1920;
        const height = 1280;

        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push(`--window-size=${width},${height}`);
          launchOptions.args.push('--force-device-scale-factor=1');

          // Additional args for consistency in CI
          if (process.env.CI) {
            launchOptions.args.push('--disable-dev-shm-usage');
            launchOptions.args.push('--disable-gpu');
          }
        }

        return launchOptions;
      });

      addMatchImageSnapshotPlugin(on);
      codeCoverageTask(on, config);

      return config;
    },
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      // It's IMPORTANT to return the config object
      // with any changed environment variables
      return config;
    },
  },
});
