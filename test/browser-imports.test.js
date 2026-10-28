/** @vitest-environment node */
import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

// Native browser import maps are independent of Vite aliases/package exports.
// Check the actual harness module graph so API renames cannot silently break it.
it('resolves every browser harness bare import through its checked-in import map', () => {
    const root = process.cwd();
    const html = readFileSync(resolve(root, 'test/browser/harness.html'), 'utf8');
    const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
    const visited = new Set();
    const walk = (file) => {
        if (visited.has(file)) return;
        visited.add(file);
        expect(existsSync(file), `Missing browser module: ${file}`).toBe(true);
        const source = readFileSync(file, 'utf8');
        const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        const specifiers = parsed.statements
            .filter((node) => ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
            .map((node) => node.moduleSpecifier?.text).filter(Boolean);
        for (const name of specifiers) {
            if (name.startsWith('.')) walk(resolve(file, '..', name));
            else {
                expect(imports, `Unmapped browser import ${name} in ${file}`).toHaveProperty(name);
                walk(resolve(root, '.' + imports[name]));
            }
        }
    };
    for (const target of Object.values(imports)) expect(existsSync(resolve(root, '.' + target))).toBe(true);
    walk(resolve(root, 'test/browser/harness.js'));
});
