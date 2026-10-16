/** @jsxImportSource uele */
/**
 * tanstack todos - the complete app, in JSX, on the uele + @tanstack/store pairing.
 *
 *     import { mountTodos } from './tanstack.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from @tanstack/store; `useTanstackStore()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 */
import { For } from 'uele';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { useTanstackStore } from 'uele/adapters/tanstack';
import { Cell } from 'uele/adapters/tanstack';
import { Store } from '@tanstack/store';

export const TodoApp = () => {
	useTanstackStore();
	const newTodo = new Store('');
	const todos = new Store([]);
	const filter = new Store('all');
	// @tanstack/store has no `computed`, and a plain Store renders empty until its
	// first change: build derived cells on the adapter's `Cell` (a Store that
	// replays its value to every new subscriber)
	const derived = (read, ...deps) => {
		const out = new Cell(read());
		deps.forEach((dep) => dep.subscribe(() => out.setState(read())));
		return out;
	};
	const select = () => {
		const f = filter.state; // read eagerly, before the possibly empty list
		return todos.state.filter((x) => (f === 'all' ? true : f === 'active' ? !x.done : x.done));
	};
	const visible = derived(select, todos, filter);
	const remainingText = derived(() => todos.state.filter((x) => !x.done).length + ' left', todos);
	const filterText = derived(() => 'Filter: ' + filter.state, filter);

	// ---- actions: plain @tanstack/store reads and writes ----
	let seq = 0;
	const addTodo = () => {
		const text = newTodo.state.trim();
		if (!text) return;
		todos.setState([...todos.state, { id: ++seq, text, done: false }]);
		newTodo.setState('');
	};
	const toggle = (todo) =>
		todos.setState(todos.state.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
	const remove = (todo) => todos.setState(todos.state.filter((t) => t.id !== todo.id));
	const clearDone = () => todos.setState(todos.state.filter((t) => !t.done));
	const setFilter = (f) => filter.setState(f);

	// ---- ui: the same JSX for every signal library ----
	return (
		<Card>
			<h1>Todos</h1>
			<Form onSubmit={addTodo}>
				<Row>
					<Input model={newTodo} placeholder="What needs doing?" aria-label="New todo" />
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
