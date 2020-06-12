import React, {useState} from 'react';
import {render} from '@remote-ui/react';
import {Button, Card, onRender} from './api';

onRender((root) => {
  render(<WorkerApp />, root);
});

function WorkerApp() {
  const [count, setCount] = useState(0);

  return (
    <Card>
      You’ve clicked {count} {count === 1 ? 'time' : 'times'} (from a worker!){' '}
      <Button onPress={() => setCount((count) => count + 1)}>Plus one</Button>
    </Card>
  );
}
