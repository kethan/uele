/** Static complement to tests: public targets, local module links and unused runtime locals. */
import ts from 'typescript';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const skip = new Set(['.git', 'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report', '.cache']);
const files = [];
const label = path => relative(root, path).replaceAll('\\', '/');
const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) walk(path); else files.push(path);
    }
};
walk(root);
const code = files.filter(path => /\.(?:[cm]?js|jsx|tsx?)$/.test(path));
const runtime = code.filter(path => /^(src|core|tiny|lite|utils|signals|diffs|setup|props|reactive|flow|router|hooks|ui|themes|jsx-runtime|jsx-dev-runtime)\//.test(label(path)) && !/\.cjs$|\.d\.ts$/.test(path));
const failures = [];
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const targets = new Set();
const checkTarget = target => {
    if (typeof target === 'string') {
        targets.add(target);
        if (!existsSync(resolve(root, target))) failures.push(`Missing public target ${target}; run npm run build first`);
    } else if (target && typeof target === 'object') Object.values(target).forEach(checkTarget);
};
const leaves = value => typeof value === 'string' ? [value]
    : value && typeof value === 'object' ? Object.values(value).flatMap(leaves) : [];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [key, entry] of Object.entries(pkg.exports)) {
    if (!key.includes('*')) { checkTarget(entry); continue; }
    // Union stems from every condition, then require ALL conditions for each
    // public stem. Merely matching '*.d.ts' once would miss a single lost type.
    const templates = leaves(entry), names = new Set();
    for (const template of templates) {
        const pattern = new RegExp('^' + template.split('*').map(escape).join('(.*)') + '$');
        for (const path of files) {
            const match = pattern.exec('./' + label(path));
            if (match?.[1] !== undefined) names.add(match[1]);
        }
    }
    if (!names.size) failures.push(`No files match public export ${key}`);
    for (const name of names) {
        // Exact entries (including null-blocked internal helpers) override '*'.
        if (Object.hasOwn(pkg.exports, key.replaceAll('*', name))) continue;
        templates.forEach(template => checkTarget(template.replaceAll('*', name)));
    }
}
let localLinks = 0;
for (const path of code) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const check = node => {
        let spec;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) spec = node.moduleSpecifier;
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) spec = node.arguments[0];
        if (spec && ts.isStringLiteral(spec) && spec.text.startsWith('.')) {
            localLinks++;
            const target = resolve(dirname(path), spec.text.split(/[?#]/)[0]);
            const candidates = [target];
            if (/\.js$/.test(target)) candidates.push(target.replace(/\.js$/, '.d.ts'), target.replace(/\.js$/, '.ts'));
            if (!extname(target)) candidates.push(target + '.js', resolve(target, 'index.js'));
            if (!candidates.some(path => existsSync(path))) failures.push(`${label(path)}: missing ${spec.text}`);
        }
        ts.forEachChild(node, check);
    };
    check(source);
}
// Check unused private bindings, not exported APIs. Module resolution/type checking
// is covered separately by test:types, test:pack and the ESM/CJS runtime suites.
const program = ts.createProgram(runtime, {
    allowJs: true, checkJs: true, noEmit: true, noResolve: true,
    noUnusedLocals: true, noUnusedParameters: false, skipLibCheck: true,
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve
});
for (const path of runtime) {
    const source = program.getSourceFile(path);
    for (const diagnostic of program.getSemanticDiagnostics(source)) {
        if (![6133, 6192, 6196, 6198].includes(diagnostic.code)) continue;
        const { line } = source.getLineAndCharacterOfPosition(diagnostic.start || 0);
        failures.push(`${label(path)}:${line + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
}
console.log(`Audited ${files.length} repository files (${code.length} code files), ${runtime.length} runtime sources, ${localLinks} local imports and ${targets.size} public targets.`);
if (failures.length) { failures.forEach(failure => console.error(failure)); process.exitCode = 1; }
else console.log('Release static audit passed. Exported APIs are intentionally retained.');
