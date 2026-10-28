/** @jsxImportSource uele */
/**
 * s-js todos - the complete app, in JSX, on the uele + s-js pairing.
 *
 *     import { mountTodos } from './s-js.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from s-js; `sjs()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 */
import { For } from 'uele';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { sjs } from 'uele/signals/sjs';
import S from 's-js';

export const TodoApp = () => {
	sjs();
	// s-js needs an owner for the computations below, otherwise it warns that they
	// can never be disposed (S.root also hands back a dispose function)
	return S.root(() => {
		const newTodo = S.data('');
		const todos = S.data([]);
		const filter = S.data('all');
		const remaining = S(() => todos().filter((t) => !t.done).length);
		// read `filter` eagerly: a lazy read inside .filter() is skipped on an empty list,
		// and the computed value would never subscribe to it
		const visible = S(() => {
			const f = filter();
			return todos().filter((t) => (f === 'all' ? true : f === 'active' ? !t.done : t.done));
		});
		const remainingText = S(() => `${remaining()} left`);
		const filterText = S(() => `Filter: ${filter()}`);

		// ---- actions: plain s-js reads and writes ----
		let seq = 0;
		const addTodo = () => {
			const text = newTodo().trim();
			if (!text) return;
			todos([...todos(), { id: ++seq, text, done: false }]);
			newTodo('');
		};
		const toggle = (todo) => todos(todos().map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
		const remove = (todo) => todos(todos().filter((t) => t.id !== todo.id));
		const clearDone = () => todos(todos().filter((t) => !t.done));
		const setFilter = (f) => filter(f);

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
	});
};

export const mountTodos = (target = document.body) => {
	const app = TodoApp();
	target.append(app);
	return app;
};
