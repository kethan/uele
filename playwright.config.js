/**
 * Real-browser pass: Playwright + axe over the shipped bundles.
 *
 * Browser binary, per platform:
 * - Linux (CI, containers): `@sparticuz/chromium` — a pinned Chromium, so
 *   local containers and CI drive the *same* binary with no download step.
 *   It is a Linux-only (Amazon Linux) build; in locked-down containers that
 *   lack the system libraries it links against (libnspr4/libnss3), point
 *   UELE_CHROMIUM_LIBS at a directory containing them — it is prepended to
 *   LD_LIBRARY_PATH for the browser process only.
 * - Windows/macOS: Playwright's own per-OS Chromium (the sparticuz binary
 *   cannot run there). `scripts/ensure-browser.mjs` (the `pretest:browser`
 *   step) installs it on first run.
 * Set PLAYWRIGHT_EXECUTABLE_PATH to use a system Chromium/Chrome instead.
 *
 * Specs live in test/browser/*.pw.mjs — the `.pw.mjs` suffix keeps them out
 * of vitest's `*.spec.*` glob (the jsdom suites); the harness imports the
 * built core (/dist) plus the source-ESM subpaths a consumer receives.
 */
import chromium from '@sparticuz/chromium';

const executablePath =
	process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
	(process.platform === 'linux' ? await chromium.executablePath() : undefined);

export default {
	testDir: './test/browser',
	testMatch: '**/*.pw.mjs',
	timeout: 30_000,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'node scripts/static-server.mjs',
		url: 'http://127.0.0.1:4173/test/browser/harness.html',
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				launchOptions: {
					...(executablePath ? { executablePath } : {}),
					args: ['--no-sandbox', '--disable-dev-shm-usage'],
					...(process.env.UELE_CHROMIUM_LIBS
						? { env: { ...process.env, LD_LIBRARY_PATH: process.env.UELE_CHROMIUM_LIBS } }
						: {}),
				},
			},
		},
	],
};