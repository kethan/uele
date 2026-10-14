import terser from '@rollup/plugin-terser';
import bundleSize from 'rollup-plugin-bundle-size';
import copy from 'rollup-plugin-copy'
import node from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const resolve = (pkg, {
	input = "src/index",
	output = "dist/index",
	copyFiles = [],
	ext = "js",
	external = [],
	globals = {}
} = {}) => ({
	input: `${input}.${ext}`,
	external,
	plugins: [
		node(),
		commonjs(),
		bundleSize(),
		copyFiles.length && copy({
			targets: [
				{ src: copyFiles[0], dest: copyFiles[1] }
			]
		})
	],
	output: [
		{
			file: `${output}.es.js`,
			format: 'es',
		},
		{
			file: `${output}.js`,
			format: 'cjs',
		},
		{
			file: `${output}.min.js`,
			format: 'iife',
			name: pkg,
			strict: false,
			compact: true,
			globals,
			plugins: [terser()]
		},
		{
			file: `${output}.umd.js`,
			format: 'umd',
			name: pkg,
			strict: false,
			compact: true,
			globals,
			plugins: [terser()]
		}
	]
});

// jsx runtimes re-use the published entry - one copy of `h`, `api` and `props` per app
const jsx = (name) => resolve("uele", {
	copyFiles: [`${name}/index.d.ts`, `${name}/dist/`],
	input: `${name}/index`,
	output: `${name}/dist/index`,
	ext: "ts",
	external: ["uele"],
	globals: { uele: "uele" }
});

export default [
	resolve("uele", { copyFiles: ["src/index.d.ts", "dist/"] }),
	jsx("jsx-runtime"),
	jsx("jsx-dev-runtime"),
	resolve("uele", { copyFiles: ["lite/index.d.ts", "lite/dist/"], input: "lite/index", output: "lite/dist/index" })
];
