/**
 * Real JSX through the automatic runtime (`jsxImportSource: "uele"`).
 * @vitest-environment jsdom
 */
import { expect, test } from 'vitest';
import { signal, effect } from 'ulive';
import { h, add, api, For, If, Switch, Match, Dynamic, map, useLive } from 'uele';
import { jsxDev } from 'uele/jsx-dev-runtime';

api.effect = effect;
api.is = (v: any) => v?.peek;
api.get = (v: any) => v.value;

const mount = (...nodes: any[]) => {
	const root = document.createElement('div');
	root.append(...(add(...nodes) as Node[]));
	return root;
};

test('elements with children are rendered', () => {
	expect(mount(<div>hello</div>).innerHTML).toBe('<div>hello</div>');
	expect(mount(<div>hello world</div>).innerHTML).toBe('<div>hello world</div>');
});

test('nested elements, props and multiple children', () => {
	const el = <main id="a"><h1>t</h1><p className="p">x</p></main>;
	expect((el as HTMLElement).outerHTML).toBe('<main id="a"><h1>t</h1><p class="p">x</p></main>');
});

test('fragments render their children', () => {
	const frag = <><i>1</i><b>2</b></>;
	expect(mount(frag).innerHTML).toBe('<i>1</i><b>2</b>');
});

test('fragments can be nested inside elements', () => {
	expect(mount(<div><>a<span>b</span></>c</div>).innerHTML).toBe('<div>a<span>b</span>c</div>');
});

test('components receive props and children', () => {
	const Card = ({ id, children }: any) => <div id={id}>{children}</div>;
	const el = mount(<Card id="c">body</Card>);
	expect(el.innerHTML).toBe('<div id="c">body</div>');
});

test('keys are not rendered as attributes and do not become children', () => {
	const el = mount(<ul>{[1, 2].map((i) => <li key={i}>{i}</li>)}</ul>);
	expect(el.innerHTML).toBe('<ul><li>1</li><li>2</li></ul>');
});

test('booleans, null and undefined children render as comments', () => {
	expect(mount(<div>{false}{null}{undefined}</div>).textContent).toBe('');
	expect(mount(<div>{false}</div>).innerHTML).toBe('<div><!--false--></div>');
});

test('reactive children update the dom', () => {
	const count = signal(0);
	const el = mount(<div>{count}</div>);
	expect(el.textContent).toBe('0');
	count.value = 1;
	expect(el.textContent).toBe('1');
});

test('reactive attributes and styles update the dom', () => {
	const cls = signal('a');
	const color = signal('red');
	const el = mount(<div class={cls} style={{ color }}>s</div>);
	expect(el.firstElementChild!.className).toBe('a');
	expect((el.firstElementChild as HTMLElement).style.color).toBe('red');
	cls.value = 'b';
	color.value = 'blue';
	expect(el.firstElementChild!.className).toBe('b');
	expect((el.firstElementChild as HTMLElement).style.color).toBe('blue');
});

test('event handlers work', () => {
	let clicks = 0;
	const el = mount(<button onClick={() => clicks++}>go</button>);
	(el.firstElementChild as HTMLElement).click();
	expect(clicks).toBe(1);
});

test('components can return other components and fragments', () => {
	const Inner = () => <b>in</b>;
	const Outer = ({ children }: any) => <div>{Inner}{children}</div>;
	expect(mount(<Outer><i>out</i></Outer>).innerHTML).toBe('<div><b>in</b><i>out</i></div>');
});

test('conditional rendering with If and Switch', () => {
	const cond = signal(true);
	const el = mount(<If when={cond} fallback={<b>no</b>}><i>yes</i></If>);
	expect(el.textContent).toBe('yes');
	cond.value = false;
	expect(el.textContent).toBe('no');

	const which = signal('a');
	const sw = mount(
		<Switch fallback="none">
			<Match when={(() => which.value === 'a') as any}><i>A</i></Match>
			<Match when={(() => which.value === 'b') as any}><b>B</b></Match>
		</Switch>
	);
	expect(sw.textContent).toBe('A');
	which.value = 'b';
	expect(sw.textContent).toBe('B');
});

test('list rendering with For and map', () => {
	const items = signal(['a', 'b']);
	const el = mount(<ul><For each={items}>{(item: string) => <li>{item}</li>}</For></ul>);
	expect(el.innerHTML).toBe('<ul><li>a</li><li>b</li></ul>');
	items.value = ['c'];
	expect(el.innerHTML).toBe('<ul><li>c</li></ul>');

	const mapped = mount(<i>{map(items, (v: string) => <b>{v}</b>)}</i>);
	expect(mapped.innerHTML).toBe('<i><b>c</b></i>');
});

test('Dynamic renders a component or a node', () => {
	const Node = ({ children }: any) => <span>{children}</span>;
	expect(mount(<Dynamic component={Node}>d</Dynamic>).innerHTML).toBe('<span>d</span>');
	expect(mount(<Dynamic component={document.createElement('b')} />).innerHTML).toBe('<b></b>');
});

test('useLive works with jsx', () => {
	const [live, setLive] = useLive(0);
	const el = mount(<div>{live}</div>);
	setLive(2);
	expect(el.textContent).toBe('2');
	setLive((n: number) => n + 1);
	expect(el.textContent).toBe('3');
});

test('the classic createElement entry point is h itself', () => {
	expect(h).toBeDefined();
	expect(String(h('div', { id: 'x' }))).toContain('HTMLDivElement');
});

test('jsxDev from the dev runtime behaves like jsx', () => {
	const el = jsxDev('div', { children: 'dev' }, undefined, false, undefined, undefined) as HTMLElement;
	expect(el.outerHTML).toBe('<div>dev</div>');
	expect(mount(jsxDev('span', { children: ['a', 'b'] }, undefined, true, undefined, undefined) as HTMLElement).innerHTML).toBe('<span>ab</span>');
});

test('element children can be arrays of nodes', () => {
	const items = [<i key="1">1</i>, <i key="2">2</i>];
	expect(mount(<div>{items}</div>).innerHTML).toBe('<div><i>1</i><i>2</i></div>');
});

test('the production runtime entry point exports the jsx api', async () => {
	const runtime = await import('uele/jsx-runtime');
	expect(typeof runtime.jsx).toBe('function');
	expect(runtime.jsxs).toBe(runtime.jsx);
	expect(runtime.jsxDev).toBe(runtime.jsx);
	expect(runtime.jsxDEV).toBe(runtime.jsx);
	expect(runtime.createElement).toBe(h);
	expect(runtime.Fragment).toBe(h);
	expect((runtime.jsx('div', { children: 'prod' }) as HTMLElement).outerHTML).toBe('<div>prod</div>');
	expect((runtime.jsxs('div', { children: ['a', 'b'] }) as HTMLElement).outerHTML).toBe('<div>ab</div>');
	// a single non-array child is wrapped, not spread
	expect((runtime.jsx('div', { children: h('i', null, 'one') }) as HTMLElement).outerHTML).toBe('<div><i>one</i></div>');
	expect((runtime.jsx('div', null) as HTMLElement).outerHTML).toBe('<div></div>');
	expect((runtime.jsx(h, { children: ['x'] }) as any)).toEqual(['x']);
});

test('the dev runtime tolerates missing props', async () => {
	const runtime = await import('uele/jsx-dev-runtime');
	expect(typeof runtime.jsxDev).toBe('function');
	expect(runtime.jsxs).toBe(runtime.jsxDev);
	expect(runtime.createElement).toBe(h);
	expect((runtime.jsxDev('div', null) as HTMLElement).outerHTML).toBe('<div></div>');
	expect((runtime.jsxDev('div', undefined, 'k') as HTMLElement).outerHTML).toBe('<div></div>');
	expect((runtime.jsxDev('div', { children: null }) as HTMLElement).outerHTML).toBe('<div></div>');
	expect((runtime.jsxDev('div', { key: 'k', id: 'i' }) as HTMLElement).outerHTML).toBe('<div id="i"></div>');
});
