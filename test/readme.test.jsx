/** @jsxImportSource uele */
/**
 * The 30-second todos app printed in README.md, run exactly as documented —
 * copy-paste code must not rot.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { For } from "uele";
import { preactSignals } from "uele/signals/preact";
import { signal } from "@preact/signals-core";
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from "uele/ui";

preactSignals(); // one call, whole api configured

const TodoApp = () => {
  const text = signal("");
  const todos = signal([]);
  let seq = 0;
  const add = () => {
    const title = text.value.trim();
    if (title) todos.value = [...todos.value, { id: ++seq, title, done: false }];
    text.value = "";
  };
  const toggle = (todo) =>
    (todos.value = todos.value.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));

  return (
    <Card>
      <h1>Todos</h1>
      <Form onSubmit={add}>
        <Row>
          <Input model={text} placeholder="What needs doing?" />
          <Button type="submit">Add</Button>
        </Row>
      </Form>
      <Stack>
        <For each={todos} fallback={<Label>Nothing here</Label>}>
          {(todo) => (
            <Row>
              <Checkbox checked={todo.done} onChange={() => toggle(todo)} />
              <Label style={todo.done ? { textDecoration: "line-through" } : null}>{todo.title}</Label>
              <Button onclick={() => (todos.value = todos.value.filter((t) => t.id !== todo.id))}>×</Button>
            </Row>
          )}
        </For>
      </Stack>
    </Card>
  );
};


const rows = (app) => [...app.querySelectorAll('label')].filter((l) => l.textContent !== 'Nothing here');
const titles = (app) => rows(app).map((l) => l.textContent);

describe('README quickstart app', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('renders, adds, toggles and deletes', () => {
		const app = TodoApp();
		document.body.append(app);
		expect(app.textContent).toContain('Nothing here');

		const type = (t) => {
			const input = app.querySelector('input[placeholder="What needs doing?"]');
			input.value = t;
			input.dispatchEvent(new Event('input'));
			app.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
		};
		type('buy milk');
		type('walk dog');
		expect(titles(app)).toEqual(['buy milk', 'walk dog']);

		// toggle the first row
		const cb = app.querySelector('input[type=checkbox]');
		cb.click();
		expect(rows(app)[0].style.textDecoration).toContain('line-through');

		// delete the second row (its own × button)
		[...app.querySelectorAll('button')].filter((b) => b.textContent.trim() === '\u00d7')[1].click();
		expect(titles(app)).toEqual(['buy milk']);
	});
});
