/** @jsxImportSource uele */
/**
 * preact todos - the complete app, in JSX, on the uele + @preact/signals-core pairing.
 *
 *     import { mountTodos } from './preact.jsx';
 *     mountTodos(document.body);
 *
 * Signals come from @preact/signals-core; `preactSignals()` wires uele to them (called for you by
 * `TodoApp`/`mountTodos`). Everything below the actions is the same JSX you
 * would write with any other preset.
 */

import { For } from 'uele/flow';
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from 'uele/ui';
import { preactSignals } from 'uele/signals/preact';
import { signal, computed } from '@preact/signals-core';

export const TodoApp = () => {
	preactSignals();
	const newTodo = signal('');
	const todos = signal([]);
	const filter = signal('all');
	const remaining = computed(() => todos.value.filter((t) => !t.done).length);
	// read `filter` eagerly: a lazy read inside .filter() is skipped on an empty list,
	// and the computed value would never subscribe to it
	const visible = computed(() => {
		const f = filter.value;
		return todos.value.filter((t) => (f === 'all' ? true : f === 'active' ? !t.done : t.done));
	});
	const remainingText = computed(() => `${remaining.value} left`);
	const filterText = computed(() => `Filter: ${filter.value}`);

	// ---- actions: plain @preact/signals-core reads and writes ----
	let seq = 0;
	const addTodo = () => {
		const text = newTodo.value.trim();
		if (!text) return;
		todos.value = [...todos.value, { id: ++seq, text, done: false }];
		newTodo.value = '';
	};
	const toggle = (todo) =>
		todos.value = todos.value.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t));
	const remove = (todo) => (todos.value = todos.value.filter((t) => t.id !== todo.id));
	const clearDone = () => (todos.value = todos.value.filter((t) => !t.done));
	const setFilter = (f) => (filter.value = f);

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
