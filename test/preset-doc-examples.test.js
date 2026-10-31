/** @vitest-environment jsdom */
// Run every installer's published usage block from the generated guide.
import { afterEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL as FileURL } from 'node:url';
import { h, api, useLive } from 'uele';
import { signal, read, write } from 'uele/reactive';
const signals = import.meta.glob('../signals/*.js');
const diffs = import.meta.glob('../diffs/*.js');
const doc = readFileSync(new FileURL('../docs/PRESETS.md', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new FileURL('../package.json', import.meta.url), 'utf8'));
const sections = [...doc.matchAll(/### `uele\/(signals|diffs)\/([^`]+)` - `(\w+)\(\)`\n([\s\S]*?)(?=\n### |\n## |$)/g)]
  .map(match => ({ kind: match[1], slug: match[2], installer: match[3], body: match[4] }));
const defaults = { ...api }, engineDefaults = { ...api.engine };
const restore = (target, values) => {
  Object.keys(target).forEach(key => delete target[key]); Object.assign(target, values);
};
afterEach(() => {
  const [nodes, replace] = useLive([...document.body.childNodes]);
  document.body.append(...nodes); replace(null); document.body.replaceChildren();
  restore(api.engine, engineDefaults); restore(api, defaults);
});
it('covers every shipped signal and diff preset, with no private helper entries', () => {
  for (const [kind, modules] of Object.entries({ signals, diffs })) {
    const available = Object.keys(modules).map(path => path.split('/').at(-1).slice(0, -3))
      .filter(slug => !['internal', 'util'].includes(slug)).sort();
    expect(sections.filter(section => section.kind === kind).map(section => section.slug).sort()).toEqual(available);
  }
  expect(sections).toHaveLength(32);
  const readme = readFileSync(new FileURL('../README.md', import.meta.url), 'utf8');
  sections.filter(section => section.kind === 'signals').forEach(section => {
    expect(readme).toContain('`' + section.slug + '` → `' + section.installer + '()`');
  });
});
it.each(sections)('$kind/$slug installs and its exact example works', async ({ kind, slug, installer, body }) => {
  const modules = kind === 'signals' ? signals : diffs;
  const preset = await modules[`../${kind}/${slug}.js`]();
  const source = readFileSync(new FileURL(`../${kind}/${slug}.js`, import.meta.url), 'utf8');
  const dependencies = [...source.matchAll(/from ['"]([^'"]+)['"]/g)].map(match => match[1])
    .filter(name => !name.startsWith('.') && name !== 'uele' && !name.startsWith('uele/'))
    .map(name => name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0]);
  if (slug === 'rescript-signals') dependencies.push('@rescript/runtime');
  const command = body.match(/```sh\n([\s\S]*?)```/)[1].replace(/\\\n\s*/g, ' ').trim();
  expect(command).toContain('npm install uele');
  for (const dependency of new Set(dependencies)) {
    const peerRange = pkg.peerDependencies[dependency];
    const range = peerRange.includes('||') ? pkg.devDependencies[dependency] : peerRange;
    expect(command).toContain(dependency + '@' + range);
  }
  let code = body.match(/```js\n([\s\S]*?)```/)[1];
  const bindings = { h, api, useLive, signal, read, write, [installer]: preset[installer] };
  code = code.replace(/^import .*;\n/gm, '');
  new Function(...Object.keys(bindings), code)(...Object.values(bindings));
  if (kind === 'signals') {
    const button = document.querySelector('button');
    expect(button.textContent).toBe('0'); button.click();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(button.textContent).toBe('1'); button.click();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(button.textContent).toBe('2');
  } else {
    expect([...document.querySelectorAll('li')].map(node => node.textContent)).toEqual(['Second', 'First']);
  }
});
