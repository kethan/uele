/** @jsxImportSource uele */
/**
 * rxjs todos - the complete app, in JSX, on the uele + rxjs pairing.
 *
 *     import { mountTodos } from './rxjs.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from rxjs; `rxjs()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 */
import { For } from 'uele';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { rxjs } from 'uele/signals/rxjs';
import { BehaviorSubject, combineLatest, map, distinctUntilChanged } from 'rxjs';

export const TodoApp = () => {
	rxjs();
	const newTodo = new BehaviorSubject('');
	const todos = new BehaviorSubject([]);
	const filter = new BehaviorSubject('all');
	// rxjs has no `computed`: derive with operators instead
	const remainingText = todos.pipe(map((t) => t.filter((x) => !x.done).length + ' left'), distinctUntilChanged());
	const filterText = filter.pipe(map((f) => 'Filter: ' + f), distinctUntilChanged());
	const visible = combineLatest([todos, filter]).pipe(
		map(([t, f]) => t.filter((x) => (f === 'all' ? true : f === 'active' ? !x.done : x.done))),
		distinctUntilChanged()
	);

	// ---- actions: plain rxjs reads and writes ----
	let seq = 0;
	const addTodo = () => {
		const text = newTodo.value.trim();
		if (!text) return;
		todos.next([...todos.value, { id: ++seq, text, done: false }]);
		newTodo.next('');
	};
	const toggle = (todo) =>
		todos.next(todos.value.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
	const remove = (todo) => todos.next(todos.value.filter((t) => t.id !== todo.id));
	const clearDone = () => todos.next(todos.value.filter((t) => !t.done));
	const setFilter = (f) => filter.next(f);

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
