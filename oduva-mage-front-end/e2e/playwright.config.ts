import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry'
  },
  webServer: {
    // `--single` gives the static build SPA history-API fallback, so a direct
    // navigation to e.g. /apply resolves to index.html instead of a 404.
    command: 'npx sirv-cli ../dist/oduva-mage-front-end/mock/browser --port 4300 --single',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
