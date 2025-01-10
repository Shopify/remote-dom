/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {retain} from '@quilted/threads';

import {createRemoteReactComponent} from '@remote-ui/react';
import {
  ButtonProperties,
  ModalProperties,
  RenderAPI,
  StackProperties,
  TextProperties,
} from '../../types';
import {useState} from 'react';
import {createRoot, createRemoteRoot} from '@remote-ui/react';
import {RemoteChannel} from '@remote-ui/core';

const Button = createRemoteReactComponent<
  'Button',
  ButtonProperties & {modal?: React.ReactNode}
>('Button', {fragmentProps: ['modal']});

const Text = createRemoteReactComponent<'Text', TextProperties>('Text');
const Stack = createRemoteReactComponent<'Stack', StackProperties>('Stack');
const Modal = createRemoteReactComponent<
  'Modal',
  ModalProperties & {primaryAction?: React.ReactNode}
>('Modal', {fragmentProps: ['primaryAction']});

export function renderUsingReactRemoteUI(
  channel: RemoteChannel,
  api: RenderAPI,
) {
  retain(api);
  retain(channel);

  const remoteRoot = createRemoteRoot(channel, {
    components: ['Button', 'Text', 'Stack', 'Modal'],
  });

  createRoot(remoteRoot).render(<App api={api} />);
  remoteRoot.mount();
}

function App({api}: {api: RenderAPI}) {
  return (
    <Stack spacing>
      <Text>
        Rendering example: <Text emphasis>{api.example}</Text>
      </Text>
      <Text>
        Rendering in sandbox: <Text emphasis>{api.sandbox}</Text>
      </Text>
      <Button modal={<CountModal {...api} />}>Open modal</Button>
    </Stack>
  );
}

function CountModal({alert, closeModal}: RenderAPI) {
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
          alert(`You clicked ${count} times!`);
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
