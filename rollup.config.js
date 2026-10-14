import terser from '@rollup/plugin-terser';
import bundleSize from 'rollup-plugin-bundle-size';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import node from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// Prefer smaller gzip output without unsafe transforms or public-name mangling.
const minify = (name, options = {}) => terser({
    compress: name === 'uele' ? { passes: 3, inline: 1, sequences: false } : { passes: 3 },
    ...options,
});

const resolve = (pkg, {
	input = "src/index",
	output = "dist/index",
	copyFiles = [],
	ext = "js",
	external = []
} = {}) => ({
	input: `${input}.${ext}`,
	external,
	plugins: [
        { name: 'clean-output', buildStart() { rmSync(dirname(output), { recursive: true, force: true }); } },
		node(),
		commonjs(),
		bundleSize(),
        copyFiles.length && {
            name: 'copy-types',
            writeBundle() {
                mkdirSync(copyFiles[1], { recursive: true });
                copyFileSync(copyFiles[0], join(copyFiles[1], basename(copyFiles[0])));
            }
        }
	],
	output: [
		{
			file: `${output}.es.js`,
			format: 'es',
            plugins: [minify(pkg, { module: true })],
		},
		{
			file: `${output}.cjs`,
			format: 'cjs',
            plugins: [minify(pkg, { toplevel: true })],
		},
		{
			file: `${output}.min.js`,
			format: 'iife',
			globals: { uele: 'uele' },
			name: pkg,
			strict: false,
			compact: true,
			plugins: [minify(pkg)]
		},
		{
			file: `${output}.umd.js`,
			format: 'umd',
			globals: { uele: 'uele' },
			name: pkg,
			strict: false,
			compact: true,
			plugins: [minify(pkg)]
		}
	]
});

export default [
	resolve("uele", { copyFiles: ["src/index.d.ts", "dist/"] }),
	resolve("ueleJSX", { external: ["uele"], copyFiles: ["jsx-runtime/index.d.ts", "jsx-runtime/dist/"], input: "jsx-runtime/index", output: "jsx-runtime/dist/index", ext: "ts" }),
	resolve("ueleJSX", { external: ["uele"], copyFiles: ["jsx-dev-runtime/index.d.ts", "jsx-dev-runtime/dist/"], input: "jsx-dev-runtime/index", output: "jsx-dev-runtime/dist/index", ext: "ts" }),
	resolve("uele", { copyFiles: ["lite/index.d.ts", "lite/dist/"], input: "lite/index", output: "lite/dist/index" })
]
