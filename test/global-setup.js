import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// usub 0.8.1 retains one closure chain per subscription through its
// FinalizationRegistry (see scripts/patch-usub.mjs). Patch the local install before
// any suite imports it - a no-op once usub >= 0.8.2 is installed.
export default function () {
	execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/patch-usub.mjs', import.meta.url))], { stdio: 'inherit' });
}
