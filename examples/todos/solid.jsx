/** @jsxImportSource uele */
/**
 * solid todos - the complete app, in JSX, on the uele + solid-js pairing.
 *
 *     import { mountTodos } from './solid.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from solid-js; `solid()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 *
 * Note: a long-lived app would wrap this in `createRoot(...)` so solid can
 * dispose the graph; the signals are created at the top level here to keep the
 * example readable.
 */
import { For } from 'uele';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { solid } from 'uele/signals/solid';
// node resolves `solid-js` to its no-op server build; apps bundle the client build
import { createSignal, createMemo } from 'solid-js/dist/solid.js';

export const TodoApp = () => {
	solid();
	const [newTodo, setNewTodo] = createSignal('');
	const [todos, setTodos] = createSignal([]);
	const [filter, setFilterValue] = createSignal('all');
	const remaining = createMemo(() => todos().filter((t) => !t.done).length);
	// read `filter` eagerly: a lazy read inside .filter() is skipped on an empty list,
	// and the computed value would never subscribe to it
	const visible = createMemo(() => {
		const f = filter();
		return todos().filter((t) => (f === 'all' ? true : f === 'active' ? !t.done : t.done));
	});
	const remainingText = createMemo(() => `${remaining()} left`);
	const filterText = createMemo(() => `Filter: ${filter()}`);

	// ---- actions: plain solid-js reads and writes ----
	let seq = 0;
	const addTodo = () => {
		const text = newTodo().trim();
		if (!text) return;
		setTodos([...todos(), { id: ++seq, text, done: false }]);
		setNewTodo('');
	};
	const toggle = (todo) =>
		setTodos(todos().map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
	const remove = (todo) => setTodos(todos().filter((t) => t.id !== todo.id));
	const clearDone = () => setTodos(todos().filter((t) => !t.done));
	const setFilter = setFilterValue;

	// ---- ui: the same JSX for every signal library ----
	return (
		<Card>
			<h1>Todos</h1>
			<Form onSubmit={addTodo}>
				<Row>
					{/* solid splits read and write: `value` is the accessor, `model` the setter */}
					<Input value={newTodo} model={setNewTodo} placeholder="What needs doing?" aria-label="New todo" />
					<Button type="submit">Add</Button>
				</Row>
			</Form>
			<Stack aria-label="Todo list">
				<For each={visible} fallback={<Label>Nothing here</Label>}>
					{(todo) => (
						<Row>
							<Checkbox checked={todo.done} onChange={() => toggle(todo)} aria-label={`Toggle ${todo.text}`} />
							<Label style={todo.done ? { textDecoration: 'line-through' } : null}>{todo.text}</Label>
							<Button aria-label={`Delete ${todo.text}`} onclick={() => remove(todo)}>
								×
							</Button>
						</Row>
					)}
				</For>
			</Stack>
			<Row>
				<span>{remainingText}</span>
				<span>{filterText}</span>
				<Button onclick={() => setFilter('all')}>All</Button>
				<Button onclick={() => setFilter('active')}>Active</Button>
				<Button onclick={() => setFilter('completed')}>Completed</Button>
				<Button onclick={clearDone}>Clear completed</Button>
			</Row>
		</Card>
	);
};

export const mountTodos = (target = document.body) => {
	const app = TodoApp();
	target.append(app);
	return app;
};
