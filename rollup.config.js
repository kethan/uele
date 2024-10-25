import terser from '@rollup/plugin-terser';
import bundleSize from 'rollup-plugin-bundle-size';
import copy from 'rollup-plugin-copy'

const resolve = (pkg, {
	input = "src/index",
	output = "dist/index",
	copyFiles = [],
	ext = "js"
} = {}) => ({
	input: `${input}.${ext}`,
	plugins: [
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
			plugins: [terser()]
		},
		{
			file: `${output}.umd.js`,
			format: 'umd',
			name: pkg,
			strict: false,
			compact: true,
			plugins: [terser()]
		}
	]
});

export default [
	resolve("uele", { copyFiles: ["src/index.d.ts", "dist/"] }),
	resolve("uele", { copyFiles: ["jsx-runtime/index.d.ts", "jsx-runtime/dist/"], input: "jsx-runtime/index", output: "jsx-runtime/dist/index", ext: "ts" }),
	resolve("uele", { copyFiles: ["jsx-dev-runtime/index.d.ts", "jsx-dev-runtime/dist/"], input: "jsx-dev-runtime/index", output: "jsx-dev-runtime/dist/index", ext: "ts" }),
	resolve("uele", { copyFiles: ["lite/index.d.ts", "lite/dist/"], input: "lite/index", output: "lite/dist/index" })
]