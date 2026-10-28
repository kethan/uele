import * as main from 'uele';

/** Install optional DOM props on the main renderer, or pass the uele/lite module. */
export const useProps = (target = main) => {
	const { props, r } = target;
	const bind = (apply) => (node, value) => r(value, (v) => apply(node, v));
	const attributes = (prefix) => (node, values) => {
		const stops = Object.entries(values).map(([key, value]) => {
			const name = prefix + key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
			return r(value, (v) => v == null ? node.removeAttribute(name) : node.setAttribute(name, String(v)));
		});
		return () => stops.forEach((stop) => typeof stop === 'function' && stop());
	};
	const model = (property, event) => (node, binding) => {
		const [source, write] = binding;
		const stop = r(source, (value) => {
			const next = property === 'checked' ? !!value : value == null ? '' : String(value);
			if (node[property] !== next) node[property] = next;
		});
		const update = (e) => { if (!e.isComposing) write(node[property], e); };
		node.addEventListener(event, update);
		return () => {
			if (typeof stop === 'function') stop();
			node.removeEventListener(event, update);
		};
	};
	const handlers = {
		show: bind((node, value) => { node.hidden = !value; }),
		// Owns the element's content. Use on a leaf, without reactive children.
		text: bind((node, value) => { node.textContent = value == null ? '' : String(value); }),
		data: attributes('data-'),
		aria: attributes('aria-'),
		indeterminate: bind((node, value) => { node.indeterminate = !!value; }),
		bindSelect: (node, [source, write], _name, attrs) => {
			// Read static mode before binding, regardless of JSX prop order.
			if ('multiple' in attrs) node.multiple = !!attrs.multiple;
			const stop = r(source, (value) => {
				if (node.multiple) {
					const selected = new Set((value ?? []).map(String));
					for (const option of node.options) option.selected = selected.has(option.value);
				} else node.value = value == null ? '' : String(value);
			});
			const update = (event) => write(node.multiple
				? Array.from(node.selectedOptions, (option) => option.value) : node.value, event);
			node.addEventListener('change', update);
			return () => {
				if (typeof stop === 'function') stop();
				node.removeEventListener('change', update);
			};
		},
		bindValue: model('value', 'input'),
		bindChecked: model('checked', 'change'),
		listen: (node, events) => {
			const stops = Object.entries(events).map(([name, spec]) => {
				const [listener, options] = Array.isArray(spec) ? spec : [spec];
				node.addEventListener(name, listener, options);
				return () => node.removeEventListener(name, listener, options);
			});
			return () => stops.forEach((stop) => stop());
		},
		use: (node, actions) => {
			const stops = (Array.isArray(actions) ? actions : [actions]).map((action) => action(node));
			return () => stops.forEach((stop) => typeof stop === 'function' && stop());
		}
	};
	Object.entries(handlers).forEach(([name, handler]) => props.set(name, handler));
	return target;
};

/** Chat action: remember whether the reader was near bottom BEFORE content grows. */
export const autoScroll = ({ threshold = 48 } = {}) => (node) => {
	if (!Number.isFinite(threshold) || threshold < 0) throw new RangeError('autoScroll threshold must be non-negative and finite');
	let following = true, disposed = false, pending = false;
	const schedule = () => {
		if (pending || disposed) return;
		pending = true;
		queueMicrotask(() => {
			pending = false;
			if (!disposed && following) node.scrollTop = node.scrollHeight;
		});
	};
	const scroll = () => {
		following = node.scrollHeight - node.clientHeight - node.scrollTop <= threshold;
	};
	node.addEventListener('scroll', scroll, { passive: true });
	const mutations = new MutationObserver(schedule);
	mutations.observe(node, { childList: true, subtree: true, characterData: true });
	// Observe viewport resizing; captured load events cover images loading later.
	const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
	resize?.observe(node);
	const load = () => schedule();
	node.addEventListener('load', load, true);
	schedule(); // runs after synchronous mounting
	return () => {
		disposed = true;
		mutations.disconnect();
		resize?.disconnect();
		node.removeEventListener('scroll', scroll);
		node.removeEventListener('load', load, true);
	};
};
