/** @jsxRuntime automatic */
/** @jsxImportSource react */

import {useState} from 'react';
import {Button, Modal, Stack, Text} from './components';
import {RenderAPI} from '../types';

export function App({api}: {api: RenderAPI}) {
  return (
    <Stack spacing>
      <>
        <Text>
          Rendering example: <Text emphasis>remote-ui legacy</Text>
        </Text>
        <Button modal={<CountModal {...api} />}>Open modal</Button>
      </>
    </Stack>
  );
}

function CountModal({showAlert, closeModal}: RenderAPI) {
  const [count, setCount] = useState(0);

  const primaryAction = (
    <Button
      onPress={() => {
        closeModal();
      }}
    >
      Close
    </Button>
  );

  return (
    <Modal
      primaryAction={primaryAction}
      onClose={() => {
        if (count > 0) {
          showAlert(`You clicked ${count} times!`);
        }

        setCount(0);
      }}
    >
      <Stack spacing>
        <Text>
          Click count: <Text emphasis>{count}</Text>
        </Text>
        <Button
          onPress={() => {
            setCount((count) => count + 1);
          }}
        >
          Click me!
        </Button>
      </Stack>
    </Modal>
  );
}
