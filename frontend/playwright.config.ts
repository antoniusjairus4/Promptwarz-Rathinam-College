import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4175', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: !process.env.CI, ...(process.env.LIVE_API_URL ? {env: {VITE_API_BASE_URL: process.env.LIVE_API_URL}} : {}) },
  reporter: [['list']],
  outputDir: 'test-results/audit',
});
