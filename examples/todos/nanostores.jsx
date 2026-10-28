/** @jsxImportSource uele */
/**
 * nanostores todos - the complete app, in JSX, on the uele + nanostores pairing.
 *
 *     import { mountTodos } from './nanostores.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from nanostores; `nanostores()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 */
import { For } from 'uele';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { nanostores } from 'uele/signals/nanostores';
import { atom, computed } from 'nanostores';

export const TodoApp = () => {
	nanostores();
	const newTodo = atom('');
	const todos = atom([]);
	const filter = atom('all');
	const remainingText = computed(todos, (t) => t.filter((x) => !x.done).length + ' left');
	const filterText = computed(filter, (f) => 'Filter: ' + f);
	const visible = computed([todos, filter], (t, f) =>
		t.filter((x) => (f === 'all' ? true : f === 'active' ? !x.done : x.done))
	);

	// ---- actions: plain nanostores reads and writes ----
	let seq = 0;
	const addTodo = () => {
		const text = newTodo.get().trim();
		if (!text) return;
		todos.set([...todos.get(), { id: ++seq, text, done: false }]);
		newTodo.set('');
	};
	const toggle = (todo) =>
		todos.set(todos.get().map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
	const remove = (todo) => todos.set(todos.get().filter((t) => t.id !== todo.id));
	const clearDone = () => todos.set(todos.get().filter((t) => !t.done));
	const setFilter = (f) => filter.set(f);

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
