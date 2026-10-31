import { signal, computed } from '@preact/signals-core';
import { For } from 'uele/flow';

export function App() {
  let nextId = 0;
  let newTaskInput;
  const makeTodo = (title, done = false) => ({
    id: ++nextId, title, done: signal(done)
  });
  const todos = signal([
    makeTodo('Get the starter running', true),
    makeTodo('Make this little app your own'),
    makeTodo('Build something worth sharing')
  ]);
  const draft = signal('');
  const filter = signal('all');
  const remaining = computed(() =>
    todos.value.filter(todo => !todo.done.value).length
  );
  const completed = computed(() => todos.value.length - remaining.value);
  const visible = computed(() => {
    const mode = filter.value; // Track the filter even when the list is empty.
    return todos.value.filter(todo =>
      mode === 'all' || (mode === 'completed') === todo.done.value
    );
  });
  const addTodo = event => {
    event.preventDefault();
    const title = draft.value.trim();
    if (!title) return;
    todos.value = [...todos.value, makeTodo(title)];
    draft.value = '';
  };
  const removeTodo = todo => {
    todos.value = todos.value.filter(item => item.id !== todo.id);
    newTaskInput.focus();
  };
  const clearCompleted = () => {
    todos.value = todos.value.filter(todo => !todo.done.value);
  };

  return (
    <div class="site">
      <header class="site-header">
        <a class="brand" href="#" aria-label="Little list home">
          <span class="brand-mark" aria-hidden="true">u.</span>
          <span>uele <span class="brand-divider">/</span> starter</span>
        </a>
        <span class="stack-badge"><span /> Vite + Preact Signals</span>
      </header>

      <main>
        <section class="intro" aria-labelledby="page-title">
          <div>
            <p class="eyebrow">SMALL START. BIG POSSIBILITIES.</p>
            <h1 id="page-title">Make room for<br /><em>what matters.</em></h1>
          </div>
          <p class="intro-copy">
            Your first uele app. Real DOM, reactive signals, and just enough
            structure to make it yours. Start with a little list.
          </p>
        </section>

        <div class="workspace">
          <section class="todo-card" aria-labelledby="list-title">
            <div class="card-heading">
              <div>
                <p class="eyebrow">ONE THING AT A TIME</p>
                <h2 id="list-title">Little list</h2>
              </div>
              <span class="count-badge" aria-live="polite">
                {() => `${remaining.value} left`}
              </span>
            </div>

            <form class="add-form" onsubmit={addTodo}>
              <label class="sr-only" for="new-todo">New task</label>
              <input id="new-todo" name="task" value={draft}
                ref={node => { newTaskInput = node; }}
                oninput={event => { draft.value = event.currentTarget.value; }}
                placeholder="What's on your mind?" autocomplete="off"
                maxlength="200" />
              <button class="add-button" type="submit">
                <span aria-hidden="true">+</span> Add task
              </button>
            </form>

            <div class="list-toolbar">
              <div class="filters" role="group" aria-label="Filter tasks">
                {['all', 'active', 'completed'].map(mode => (
                  <button type="button"
                    class={{ 'filter-button': true, selected: () => filter.value === mode }}
                    aria-pressed={() => String(filter.value === mode)}
                    onclick={() => { filter.value = mode; }}>
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <span class="list-caption">A little progress, every day.</span>
            </div>

            <ul class="todo-list" aria-label="Tasks">
              {For({
                each: visible,
                key: todo => todo.id,
                fallback: <li class="empty-state">No tasks in this view. A fresh start.</li>,
                children: todo => (
                  <li class={{ 'todo-row': true, 'is-complete': todo.done }}>
                    <label class="todo-label">
                      <input type="checkbox" checked={todo.done}
                        onchange={event => {
                          todo.done.value = event.currentTarget.checked;
                        }} />
                      <span class="todo-title">{todo.title}</span>
                    </label>
                    <button class="delete-button" type="button"
                      aria-label={`Delete ${todo.title}`}
                      onclick={() => removeTodo(todo)}>
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="1.7"
                        stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
                      </svg>
                    </button>
                  </li>
                )
              })}
            </ul>

            <footer class="card-footer">
              <span>{() => `${completed.value} completed`}</span>
              <button type="button" class="clear-button"
                disabled={() => completed.value === 0}
                onclick={clearCompleted}>Clear completed</button>
            </footer>
          </section>

          <aside class="notes" aria-labelledby="notes-title">
            <p class="eyebrow">A SMALL APP, NOT A BLACK BOX</p>
            <h2 id="notes-title">Simple by design.</h2>
            <p>Everything you see is ordinary JSX and a few signals.</p>
            <ol class="feature-list">
              <li><span class="step">01</span><div>
                <h3>State that feels natural</h3>
                <p>Signals update checked states, text, and classes directly.</p>
              </div></li>
              <li><span class="step">02</span><div>
                <h3>Derived, not duplicated</h3>
                <p>Computed values keep the count and filters in sync.</p>
              </div></li>
              <li><span class="step">03</span><div>
                <h3>Keep the DOM you made</h3>
                <p>Keyed lists retain existing rows when other tasks change.</p>
              </div></li>
            </ol>
            <div class="edit-note"><span aria-hidden="true">↳</span>
              <p>Make a change in <code>src/App.jsx</code>.<br />Vite takes care of the rest.</p>
            </div>
          </aside>
        </div>
      </main>

      <footer class="site-footer">
        <span>Less ceremony. More making.</span>
        <a href="https://github.com/kethan/uele">Explore uele <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  );
}
