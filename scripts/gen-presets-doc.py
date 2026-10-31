#!/usr/bin/env python3
"""Generate the exact install/use catalog from sources and package metadata.

    python3 scripts/gen-presets-doc.py

No README comparison tables or hand-maintained preset-name lists are required.
"""
import json
import re
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = json.loads((ROOT / 'package.json').read_text())
NAME = PACKAGE['name']


def presets(folder):
    for path in sorted((ROOT / folder).glob('*.js')):
        if path.stem in ('internal', 'util'):
            continue
        source = path.read_text()
        installer = re.findall(r'export const (\w+) =', source)[-1]
        peers = []
        for spec in re.findall(r"from ['\"]([^'\"]+)['\"]", source):
            if spec.startswith('.') or spec == NAME or spec.startswith(NAME + '/'):
                continue
            parts = spec.split('/')
            package = '/'.join(parts[:2]) if spec.startswith('@') else parts[0]
            if package not in peers:
                peers.append(package)
        if path.stem == 'rescript-signals':
            peers.append('@rescript/runtime')
        body = source.split('*/')[0].split('/**')[1]
        lines = [line.strip(' *').strip() for line in body.splitlines()]
        summary = ' '.join(line for line in lines if line
                           and not line.startswith('import ')
                           and not re.match(r'^\w+\(\);?$', line))
        yield path.stem, installer, peers, summary


def install(peers):
    # Prefer the stable compatible range declared in this repository's dev graph
    # when a peer admits multiple release lines (e.g. stable Vue and Vue RC).
    packages = [NAME]
    for peer in peers:
        version = PACKAGE['peerDependencies'][peer]
        if '||' in version:
            version = PACKAGE['devDependencies'][peer]
        packages.append('"' + peer + '@' + version + '"')
    command = 'npm install ' + ' '.join(packages)
    if len(command) > 72:
        return 'npm install ' + NAME + ' \\\n  ' + ' \\\n  '.join(packages[1:])
    return command


def main():
    signals, diffs = list(presets('signals')), list(presets('diffs'))
    out = [
        '# uele presets', '',
        f'Exactly **{len(signals)} signal presets** and **{len(diffs)} diff presets** are available.',
        'Commands below use the compatible package ranges declared by this repository.',
        'Install only the preset dependencies you choose, not the entire catalog.', '',
        'Signal presets connect a library; diff presets choose DOM reconciliation.',
        'Install one of each at startup, before creating cells or rendering.',
        'Omit a diff preset to keep the renderer default.', '',
        'Examples are ordinary JavaScript modules with a bundler and browser DOM.',
        'They use the portable `uele/reactive` API so the counter code is identical',
        'across libraries. Native library APIs remain available too.', '',
        'Full `uele` defaults to compact `swapdom/deflate`; core/tiny and lite use',
        'basic marker replacement. The explicit swapdom preset selects inflate.',
        '`builtinDiff()` resets any configured entry to basic replacement.', '',
        'Signal/diff installers accept an optional target, such as `lite.api`.',
        '`uele/reactive` and the examples below follow the main entry; for lite,',
        'use native signal APIs or its configured hooks. Bare tiny needs explicit',
        'renderer source integration, not just a signal installer. See [API.md](API.md).', '',
        '## Signal presets', ''
    ]
    for slug, name, peers, description in signals:
        out += [f'### `{NAME}/signals/{slug}` - `{name}()`', '',
                textwrap.fill(description, 72), '',
                '```sh', install(peers), '```', '',
                '```js', f"import {{ h }} from '{NAME}';",
                f"import {{ {name} }} from '{NAME}/signals/{slug}';",
                f"import {{ signal, read, write }} from '{NAME}/reactive';", '',
                f'{name}();', 'const count = signal(0);',
                'const increment = () => write(count, read(count) + 1);', '',
                "const button = h('button', { onclick: increment }, count);",
                'document.body.append(button);', '```', '']
        if slug in ('rxjs', 'nanostores', 'tanstack'):
            out += ['Subscribe-only: direct cell bindings work. Arbitrary derived thunks,',
                    '`computed()` and automatic `effect()` tracking are not provided.', '']
    out += ['Use `canEffect()` / `canCompute()` from `uele/reactive` to feature-detect',
            'capabilities. Do not switch libraries while existing cells/views are live.', '',
            '## Diff engine presets', '',
            'All 13 installers share `api.diff(parent, oldNodes, newNodes, end)`.',
            'The example reorders the same two DOM nodes inside an owned live region.', '',
            'Spect, Snabbdom, Heckel, list-difference and Stage0 are dependency-free',
            'node-identity algorithms inspired by',
            '[js-diff-benchmark](https://github.com/luwes/js-diff-benchmark), not framework wrappers.', '']
    for slug, name, peers, description in diffs:
        out += [f'### `{NAME}/diffs/{slug}` - `{name}()`', '',
                textwrap.fill(description, 72), '',
                '```sh', install(peers), '```', '',
                '```js', f"import {{ h, useLive }} from '{NAME}';",
                f"import {{ {name} }} from '{NAME}/diffs/{slug}';", '',
                f'{name}();', "const first = h('li', null, 'First');",
                "const second = h('li', null, 'Second');",
                'const [nodes, replace] = useLive([first, second]);', '',
                "document.body.append(h('ul', null, nodes));",
                'replace([second, first]);', '```', '']
    out += ['## Complete example apps', '',
            '[The todos](../examples/todos/) include twelve signal-library versions',
            'and a callback-only State example. See [all examples](../examples/README.md).',
            '[The UStor cart](../examples/ustor/README.md) demonstrates nested writes,',
            'computed totals, keyed rows and explicit teardown without a named region helper.', '',
            'For custom adapters, use [the authoring guide](AUTHORING.md) and',
            '[the integration contract](ADAPTERS.md).', '']
    (ROOT / 'docs/PRESETS.md').write_text('\n'.join(out))
    # Keep the README inventory concise; commands and runnable code live here.
    catalog = ['<details>', '<summary>All 19 signal presets</summary>', '',
               'Import installers from `uele/signals/<suffix>`.', '',
               '| Suffix → installer | Signal package |', '| --- | --- |']
    for slug, name, peers, _ in signals:
        catalog.append(f"| `{slug}` → `{name}()` | " + ', '.join(f'`{p}`' for p in peers) + ' |')
    catalog += ['', '</details>']
    path = ROOT / 'README.md'
    readme = path.read_text()
    readme = re.sub(r'<!-- signal-catalog:start -->[\s\S]*?<!-- signal-catalog:end -->',
                    '<!-- signal-catalog:start -->\n' + '\n'.join(catalog) +
                    '\n<!-- signal-catalog:end -->', readme)
    path.write_text(readme)
    print(f'Generated {len(signals)} signal and {len(diffs)} diff install/use recipes.')


if __name__ == '__main__':
    main()
