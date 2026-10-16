#!/usr/bin/env python3
"""Regenerate docs/PRESETS.md from the sources (JSX snippets, measured tables).

    python3 scripts/gen-presets-doc.py

The preset descriptions come from the jsdoc block of every `adapters/*.js` and
`diffs/*.js`, the hook name from its `export const use…`, the cell idioms from
the table below, and the comparison tables from README.md (they are measured
data, so the README stays the single place they are edited).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = re.search(r'"name":\s*"([^"]+)"', open(os.path.join(ROOT, 'package.json')).read()).group(1)

# slug, hook, package, import line, how to create a cell
SIGNAL_IMPORTS = {
    'ulive': "import { signal } from 'ulive';",
    'preact': "import { signal } from '@preact/signals-core';",
    'vue': "import { ref } from '@vue/reactivity';",
    'usignal': "import { signal } from 'usignal';",
    'alien-signals': "import { signal } from 'alien-signals';",
    'sjs': "import S from 's-js';",
    'mobx': "import { observable } from 'mobx';",
    'rxjs': "import { BehaviorSubject } from 'rxjs';",
    'nanostores': "import { atom } from 'nanostores';",
    'tanstack': "import { Store } from '@tanstack/store';",
    'solid': ("// node resolves `solid-js` to its no-op server build; apps bundle the client build\n"
              "import { createSignal } from 'solid-js/dist/solid.js';"),
}
SIGNAL_CELLS = {
    'ulive': ('signal(%s)', 'count.value', 'count.value = count.value + 1'),
    'preact': ('signal(%s)', 'count.value', 'count.value = count.value + 1'),
    'vue': ('ref(%s)', 'count.value', 'count.value = count.value + 1'),
    'usignal': ('signal(%s)', 'count.value', 'count.value = count.value + 1'),
    'alien-signals': ('signal(%s)', 'count()', 'count(count() + 1)'),
    'sjs': ('S.data(%s)', 'count()', 'count(count() + 1)'),
    'mobx': ('observable.box(%s)', 'count.get()', 'count.set(count.get() + 1)'),
    'rxjs': ('new BehaviorSubject(%s)', 'count.value', 'count.next(count.value + 1)'),
    'nanostores': ('atom(%s)', 'count.get()', 'count.set(count.get() + 1)'),
    'tanstack': ('new Store(%s)', 'count.state', 'count.setState(count.state + 1)'),
    'solid': ('createSignal(%s)', 'count()', 'setCount(count() + 1)'),
}

JSX_NOTE = ('All examples below are JSX; point your bundler at the automatic runtime\n'
            '(`{ "jsx": "react-jsx", "jsxImportSource": "%s" }`, or\n'
            '`esbuild: { jsx: "automatic", jsxImportSource: "%s" }`).' % (PKG, PKG))


def read(path):
    return open(os.path.join(ROOT, path)).read()


def description(path):
    """the jsdoc summary of a preset, without the usage example lines"""
    body = read(path).split('*/')[0].split('/**')[1]
    lines = [line.strip(' *').strip() for line in body.strip().split('\n')]
    return ' '.join(line for line in lines
                    if line and not line.startswith('import ') and not re.match(r'^use\w+\(\);?$', line))


def hooks(path):
    return re.findall(r'export const (use\w+)', read(path))


def slugs(folder):
    return sorted(s[:-3] for s in os.listdir(os.path.join(ROOT, folder))
                  if s.endswith('.js') and s != 'util.js')


def main():
    out = []
    w = out.append
    w('# %s presets' % PKG)
    w('')
    w('One import, one call. Each preset assigns the complete surface (unused hooks are cleared, so switching')
    w('presets can never leave stale configuration behind) and returns the configured `api` object.')
    w('')
    w('```jsx')
    w('import { usePreactSignals } from "%s/adapters/preact";' % PKG)
    w('')
    w('usePreactSignals(); // that is the whole setup')
    w('```')
    w('')
    w('Every signal preset accepts an optional target - pass the `api` exported by `%s/lite` to' % PKG)
    w('configure the tiny core instead. The signal/diff library itself is a peer dependency: install the one')
    w('you use (`npm i @preact/signals-core`), nothing else is pulled in.')
    w('')
    w(JSX_NOTE)
    w('')
    w('## Signal adapter presets')
    w('')
    for slug in slugs('adapters'):
        name = hooks('adapters/%s.js' % slug)[-1]
        create, read_as, write_as = SIGNAL_CELLS[slug]
        w('### `%s/adapters/%s` - `%s()`' % (PKG, slug, name))
        w('')
        w(description('adapters/%s.js' % slug))
        w('')
        w('```jsx')
        w(SIGNAL_IMPORTS[slug])
        w("import { %s } from '%s/adapters/%s';" % (name, PKG, slug))
        w('')
        w('%s(); // one call, whole api configured' % name)
        w('')
        w('const count = %s;' % create % '0') if slug != 'solid' else w('const [count, setCount] = %s;' % create % '0')
        w('')
        w('document.body.append(')
        w('  <button onclick={() => %s}>' % write_as)
        w('    clicked {count} times')
        w('  </button>')
        w(');')
        w('```')
        w('')
        w('Read it as `%s`, write it as `%s` - and `%s/reactive` writes that code for you' % (read_as, write_as, PKG))
        w('(`signal()`, `read()`, `write()` work on every preset).')
        w('')

    w('## Diff engine presets')
    w('')
    w('A diff engine is chosen the same way - one call. It only changes how a list update is applied, so the')
    w('example is the same for all of them:')
    w('')
    for slug in slugs('diffs'):
        name = hooks('diffs/%s.js' % slug)[-1]
        w('### `%s/diffs/%s` - `%s()`' % (PKG, slug, name))
        w('')
        w(description('diffs/%s.js' % slug))
        w('')
        w('```jsx')
        w("import { For } from '%s';" % PKG)
        w("import { useUlive } from '%s/adapters/ulive'; // any signal preset works" % PKG)
        w("import { %s } from '%s/diffs/%s';" % (name, PKG, slug))
        w("import { signal } from 'ulive';")
        w('')
        w('useUlive();')
        w('%s(); // sets api.diff (and api.udom, when the engine needs it)' % name)
        w('')
        w('const items = signal([1, 2, 3]);')
        w('document.body.append(')
        w('  <ul>')
        w('    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>')
        w('  </ul>')
        w(');')
        w('```')
        w('')

    # the comparison tables live in the README (measured data, edited in one place)
    readme = read('README.md')
    tables = readme[readme.index('## Which one should I use?'):readme.index('## Cleanup Support')]
    w(tables.rstrip())
    w('')
    w('## Complete example apps')
    w('')
    w('[`examples/todos/`](../examples/todos) holds the same todos app written for every signal preset - add,')
    w('toggle, delete, filter (all/active/completed), clear-completed. Every file is JSX and runnable as is:')
    w('')
    w('```jsx')
    w('import { mountTodos } from "./examples/todos/preact.jsx";')
    w('mountTodos(document.body);')
    w('```')
    w('')
    w('`test/examples.test.js` runs all eleven through the same scenarios, so the examples cannot rot.')
    w('Writing your own preset - a signal adapter or a diff engine - is documented in')
    w('[ADAPTERS.md](ADAPTERS.md).')
    w('')

    open(os.path.join(ROOT, 'docs/PRESETS.md'), 'w').write('\n'.join(out))
    print('docs/PRESETS.md regenerated (%d signal presets, %d diff presets)'
          % (len(slugs('adapters')), len(slugs('diffs'))))


if __name__ == '__main__':
    main()
