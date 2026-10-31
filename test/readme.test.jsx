/** @vitest-environment jsdom */
// Execute the CURRENT README blocks, rather than a hand-copied old example.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { URL as FileURL } from 'node:url';
import ts from 'typescript';
import * as full from 'uele';
import * as tiny from 'uele/tiny';
import * as runtime from 'uele/jsx-runtime';
import * as preact from '@preact/signals-core';
import * as preactPreset from 'uele/signals/preact';
import * as flow from 'uele/flow';
import * as reactive from 'uele/reactive';
import * as diff from 'uele/diffs/stage0';
import * as ustor from 'ustor';

const readme = readFileSync(new FileURL('../README.md', import.meta.url), 'utf8');
const blocks = [...readme.matchAll(
  /<!-- (?:readme-example:([\w-]+)|ustor-example:(start)) -->\s*```(js|jsx)\n([\s\S]*?)```/g
)].map(match => ({ name: match[1] || 'ustor', language: match[3], code: match[4] }));
const modules = {
  'uele': full, 'uele/tiny': tiny, 'uele/jsx-runtime': runtime,
  '@preact/signals-core': preact, 'uele/signals/preact': preactPreset,
  'uele/flow': flow, 'uele/reactive': reactive,
  'uele/diffs/stage0': diff, 'ustor': ustor
};
const originalApi = { ...full.api }, originalEngine = { ...full.api.engine };
const originalStore = { ...ustor.api };
const restore = (target, snapshot) => {
  Object.keys(target).forEach(key => delete target[key]);
  Object.assign(target, snapshot);
};
afterEach(() => {
  // Tear down the full renderer's example nodes before resetting its preset.
  const [nodes, replace] = full.useLive([...document.body.childNodes]);
  document.body.append(...nodes); replace(null); document.body.replaceChildren();
  restore(full.api.engine, originalEngine);
  restore(full.api, originalApi); restore(ustor.api, originalStore);
});

const execute = ({ code, language }) => {
  if (language === 'jsx') {
    code = ts.transpileModule(code, {
      fileName: 'readme-example.tsx',
      compilerOptions: {
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX, jsxImportSource: 'uele'
      }
    }).outputText;
  }
  // Keep each snippet's own declarations and setup; inject only its imports.
  code = code.replace(/import\s+\{([\s\S]*?)\}\s+from\s+(['"])([^'"]+)\2;?/g,
    (_match, names, _quote, source) => {
      expect(modules[source], `README import ${source}`).toBeDefined();
      const bindings = names.replace(/\b(\w+)\s+as\s+(\w+)\b/g, '$1: $2');
      return `const {${bindings}} = modules[${JSON.stringify(source)}];`;
    });
  new Function('modules', code)(modules);
};

const verify = {
  counter: () => {
    const button = document.querySelector('button');
    expect(button.textContent).toBe('0'); button.click();
    expect(button.textContent).toBe('1'); button.click();
    expect(button.textContent).toBe('2');
  },
  signals: () => {
    const button = document.querySelector('button');
    expect(button.textContent).toBe('0'); button.click();
    expect(button.textContent).toBe('1');
  },
  derived: () => expect(document.body.textContent).toBe('Hello, uele!'),
  'mixed-sources': () => {
    expect(document.querySelector('#status').textContent).toBe('Ready');
    const circle = document.querySelector('circle');
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(circle.getAttribute('r')).toBe('5');
    document.querySelector('button').click();
    expect(circle.getAttribute('r')).toBe('6');
    expect(document.querySelector('button').textContent).toBe('1');
  },
  jsx: () => {
    const button = document.querySelector('button');
    expect(button.textContent).toBe('Count: 0'); button.click();
    expect(button.textContent).toBe('Count: 1');
  },
  component: () => expect(document.querySelector('#greeting').textContent).toBe('Hello!'),
  list: () => expect([...document.querySelectorAll('li')].map(node => node.textContent))
    .toEqual(['Learn uele', 'Build an app']),
  attributes: () => {
    const button = document.querySelector('button');
    expect(button.classList.contains('primary')).toBe(true);
    button.click(); expect(button.textContent).toBe('Clicked!');
  },
  reactive: () => {
    const button = document.querySelector('button');
    expect(button.textContent).toBe('0'); button.click();
    expect(button.textContent).toBe('1');
  },
  ustor: () => {
    expect(document.querySelector('[data-count]').textContent).toBe('0');
    document.querySelector('button').click();
    expect(document.querySelector('[data-count]').textContent).toBe('1');
    expect(document.querySelector('[data-double]').textContent).toBe('2');
  },
  cleanup: () => expect(document.body.textContent).toBe(''),
  diff: () => expect(typeof full.api.diff).toBe('function')
};

describe('copyable README examples', () => {
  it('executes every JavaScript/JSX block, not just selected examples', () => {
    expect(blocks.length).toBe([...readme.matchAll(/```(?:js|jsx)\n/g)].length);
    expect(blocks.map(block => block.name).sort()).toEqual(Object.keys(verify).sort());
  });
  it.each(blocks)('$name', async block => {
    execute(block); await Promise.resolve(); verify[block.name]();
  });
  it('uses the current JSX runtime setting', () => {
    const json = JSON.parse(readme.match(/```json\n([\s\S]*?)```/)[1]);
    expect(json.compilerOptions).toEqual({ jsx: 'react-jsx', jsxImportSource: 'uele' });
  });
  it('keeps code short enough for a narrow screen', () => {
    const all = [...readme.matchAll(/```\w*\n([\s\S]*?)```/g)];
    all.forEach(match => match[1].trimEnd().split('\n').forEach(line =>
      expect(line.length, line).toBeLessThanOrEqual(72)));
  });
  it('keeps local links valid and the size proofs last', () => {
    for (const match of readme.matchAll(/\]\(([^)]+)\)/g)) {
      const path = match[1].split('#')[0];
      if (!path || /^https?:/.test(path)) continue;
      expect(existsSync(new FileURL('../' + path, import.meta.url)), path).toBe(true);
    }
    expect([...readme.matchAll(/^## (.+)$/gm)].at(-1)[1]).toBe('Complete app size proofs');
  });
});
