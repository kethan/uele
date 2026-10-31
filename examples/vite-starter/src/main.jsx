import { useLive } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { App } from './App.jsx';
import './style.css';

// One setup call, before creating state or rendering components.
preactSignals();

const root = document.getElementById('app');
const [view, replace] = useLive(<App />);
root.append(...view);

// Stop renderer-owned subscriptions before Vite remounts this module.
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    replace(null);
    root.replaceChildren();
  });
}
