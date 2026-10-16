/** @jsxImportSource uele */
/**
 * mobx todos - the complete app, in JSX, on the uele + mobx pairing.
 *
 *     import { mountTodos } from './mobx.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from mobx; `useMobx()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 */
import { For } from 'uele';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { useMobx } from 'uele/adapters/mobx';
import { observable, computed, runInAction } from 'mobx';

export const TodoApp = () => {
	useMobx();
	const newTodo = observable.box('');
	const todos = observable.box([]);
	const filter = observable.box('all');
	const remaining = computed(() => todos.get().filter((t) => !t.done).length);
	// read `filter` eagerly: a lazy read inside .filter() is skipped on an empty list,
	// and the derived value would never subscribe to it
	const visible = computed(() => {
		const f = filter.get();
		return todos.get().filter((t) => (f === 'all' ? true : f === 'active' ? !t.done : t.done));
	});
	const remainingText = computed(() => `${remaining.get()} left`);
	const filterText = computed(() => `Filter: ${filter.get()}`);

	// ---- actions: plain mobx reads and writes ----
	let seq = 0;
	// mobx 7 rejects writes outside an action, so every write goes through runInAction
	const addTodo = () => {
		const text = newTodo.get().trim();
		if (!text) return;
		runInAction(() => {
			todos.set([...todos.get(), { id: ++seq, text, done: false }]);
			newTodo.set('');
		});
	};
	const toggle = (todo) =>
		runInAction(() =>
			todos.set(todos.get().map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)))
		);
	const remove = (todo) => runInAction(() => todos.set(todos.get().filter((t) => t.id !== todo.id)));
	const clearDone = () => runInAction(() => todos.set(todos.get().filter((t) => !t.done)));
	const setFilter = (f) => runInAction(() => filter.set(f));

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
