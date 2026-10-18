/**
 * `pretest:browser` step: make sure a Chromium exists before Playwright runs.
 *
 * Linux needs nothing here — the config launches the pinned
 * `@sparticuz/chromium` binary (system libraries come from the distro or
 * UELE_CHROMIUM_LIBS; CI installs libnspr4/libnss3). On Windows/macOS the
 * config uses Playwright's own per-OS Chromium, which downloads once into
 * the Playwright cache (`playwright install chromium` is a fast no-op
 * afterwards). PLAYWRIGHT_EXECUTABLE_PATH always wins and skips this too.
 */
import { execFileSync } from 'node:child_process';

if (process.platform === 'linux' || process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
	console.log('ensure-browser: using the configured Chromium, nothing to install');
} else {
	console.log('ensure-browser: checking Playwright Chromium (first run downloads ~170 MB)…');
	execFileSync('npx', ['playwright', 'install', 'chromium'], {
		stdio: 'inherit',
		shell: process.platform === 'win32', // npx is a .cmd shim on Windows
	});
}