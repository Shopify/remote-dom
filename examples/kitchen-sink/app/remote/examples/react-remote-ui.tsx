/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {retain} from '@remote-ui/rpc';

import {createRemoteReactComponent} from '@remote-ui/react';
import {ButtonProperties, StackProperties} from '../../types';
import {useCallback, useState} from 'react';
import {createRoot, createRemoteRoot} from '@remote-ui/react';
import {RemoteChannel} from '@remote-ui/core';

const Button = createRemoteReactComponent<
  'Button',
  ButtonProperties & {modal?: React.ReactNode}
>('Button', {fragmentProps: ['modal']});

const Stack = createRemoteReactComponent<'Stack', StackProperties>('Stack');

export function renderUsingReactRemoteUI(channel: RemoteChannel) {
  retain(channel);

  const remoteRoot = createRemoteRoot(channel, {
    components: ['Button', 'Text', 'Stack', 'Modal'],
  });

  createRoot(remoteRoot).render(<App />);
  remoteRoot.mount();
}

function App() {
  const [buttons, setButtons] = useState([
    {id: '1', label: 'Button 1'},
    {id: '2', label: 'Button 2'},
  ]);

  const handleOrderChange = useCallback(() => {
    setButtons([
      {id: '2', label: 'Button 2'},
      {id: '1', label: 'Button 1'},
    ]);
  }, []);

  return (
    <Stack spacing>
      <Button onPress={handleOrderChange}>Change the order</Button>

      {buttons.map((button) => (
        <Button
          key={button.id}
          onPress={() => console.log('pressed ' + button.id)}
        >
          {button.label}
        </Button>
      ))}
    </Stack>
  );
}
