import {createRef} from 'react';

import {TextField} from './components';
import {RemoteAppRenderer} from './remote-app-renderer';

import {createRoot} from 'react-dom/client';

function App() {
  const inputRef = createRef<HTMLInputElement>();

  return (
    <main>
      <TextField label="Message for the remote environment" ref={inputRef} />

      <RemoteAppRenderer inputRef={inputRef} />
    </main>
  );
}

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
