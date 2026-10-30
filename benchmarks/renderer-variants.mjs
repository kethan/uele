import { resolve as path } from 'node:path';

function replace(source, from, to) {
    if (!source.includes(from)) throw Error('Experiment no longer matches source: ' + from);
    return source.replace(from, to);
}
export function transform(source, id, variant) {
    if (id.split('?')[0] === path('src/core.js')) {
        if (variant === 'startsWith') source = replace(source, '/^on/.test(name)', "name.startsWith('on')");
        if (variant === 'attrs-for-of') {
            source = replace(source, 'Object.entries(attrs).forEach(([name, value]) => {', 'for (let [name, value] of Object.entries(attrs)) {');
            source = replace(source, '\n            })\n', '\n            }\n');
        }
        if (variant === 'recursive-add') {
            const start = source.indexOf('const add =');
            const end = source.indexOf('const useLive =');
            source = source.slice(0, start) + `const add = (...children) => {
                const result = [];
                const visit = child => {
                    if (Array.isArray(child)) return child.forEach(visit);
                    if (!api.is(child)) {
                        const value = api.get(child);
                        if (value !== child) return visit(value);
                        return result.push(toNode(value));
                    }
                    let update, prev = '';
                    const stop = api.sub(child, value => {
                        if (update && prev !== value) update(() => value);
                        prev = value;
                    }, noop);
                    const [nodes, replace] = useLive(prev);
                    update = replace;
                    track(nodes[0], stop);
                    result.push(...nodes);
                };
                children.forEach(visit);
                return result;
            };\n` + source.slice(end);
        }
        if (variant === 'api-r') {
            source = replace(source, 'is: () => false,', 'is: () => false,\n    r: (value, next) => { next(api.get(value), false); },');
            const start = source.indexOf('const r =');
            const end = source.indexOf('const add =');
            source = source.slice(0, start) + 'const r = (...args) => api.r(...args);\n' + source.slice(end);
        }
    }
    if (variant === 'api-r' && id === path('src/install.js')) {
        source = replace(source, 'Object.assign(api, { is, get, sub, engine, ns: namespace });', `Object.assign(api, { is, get, sub, engine, ns: namespace,
            r: (value, next, error, cleanup) => {
                if (api.is(value)) return api.sub(value, v => next(v, true), error, cleanup);
                next(api.get(value), false);
            }
        });`);
    }
    return source;
}
