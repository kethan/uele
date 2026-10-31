import browser from './playwright.config.js';

// Exercise both the Vite transformer and the real production artifact.
export default {
  ...browser,
  testDir: './test/starter',
  webServer: [
    {
      command: 'npm run dev --prefix examples/vite-starter -- --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: 'npm run preview --prefix examples/vite-starter -- --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ],
  projects: [
    { name: 'development', use: { ...browser.projects[0].use, baseURL: 'http://127.0.0.1:5175' } },
    { name: 'production', testIgnore: '**/*.dev.pw.mjs', use: { ...browser.projects[0].use, baseURL: 'http://127.0.0.1:4175' } }
  ]
};
