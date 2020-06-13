import React, {useState} from 'react';
import {render} from '@remote-ui/react';
import {Button, Card, onRender, User} from './api';

onRender((root, user) => {
  render(<WorkerApp user={user} />, root);
});

function WorkerApp({user}: {user: User}) {
  const [count, setCount] = useState(0);

  return (
    <Card>
      Welcome, user {user.id}!{' '}
      You’ve clicked {count} {count === 1 ? 'time' : 'times'} (from a worker!){' '}
      <Button onPress={() => setCount((count) => count + 1)}>Plus one</Button>{' '}
      <Button onPress={() => user.getDetails().then(log)}>Fetch user details</Button>{' '}
      <Button onPress={() => (self as any).authenticatedFetch('/products.json').then((log))}>Authenticated fetch</Button>
    </Card>
  );
}

function log(result: any) {
  console.log(result);
}
