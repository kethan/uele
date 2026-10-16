"""Wire a new subpath entry (ele/<name>) into package.json, the vitest configs and rollup."""
import json, sys, re

def main(names):
    NAME = json.load(open('package.json'))['name']
    d = json.load(open('package.json'))
    for n in names:
        d['exports'][f'./{n}'] = {
            'types': f'./{n}/index.d.ts',
            'import': f'./{n}/index.js',
            'require': f'./{n}/index.cjs'
        }
        if n not in d['files']:
            d['files'].append(n)
    json.dump(d, open('package.json', 'w'), indent=2)
    open('package.json', 'a').write('\n')

    # vitest aliases: source for main + esm, built cjs for the cjs run
    for f in ['vitest.config.js', 'vitest.bundles.esm.config.js']:
        t = open(f).read()
        for n in names:
            pat = "{ find: /^%s\\/%s$/" % (NAME, n)
            if pat not in t:
                anchor = "{ find: /^%s$/," % NAME
                i = t.index(anchor); j = t.index('\n', i) + 1
                t = t[:j] + "\t\t\t{ find: /^%s\\/%s$/, replacement: src('./%s/index.js') },\n" % (NAME, n, n) + t[j:]
        open(f, 'w').write(t)
    f = 'vitest.bundles.cjs.config.js'
    t = open(f).read()
    for n in names:
        pat = "{ find: /^%s\\/%s$/" % (NAME, n)
        if pat not in t:
            anchor = "{ find: /^%s$/," % NAME
            i = t.index(anchor); j = t.index('\n', i) + 1
            t = t[:j] + "\t\t\t{ find: /^%s\\/%s$/, replacement: src('./%s/index.cjs') },\n" % (NAME, n, n) + t[j:]
    open(f, 'w').write(t)

    # rollup: CJS twin
    t = open('rollup.config.js').read()
    for n in names:
        if f"'{n}/index.js'," not in t:
            t = t.replace("const presetFiles = [\n", "const presetFiles = [\n\t'%s/index.js',\n" % n)
    open('rollup.config.js', 'w').write(t)
    print('wired:', ', '.join(names))

if __name__ == '__main__':
    main(sys.argv[1:])
