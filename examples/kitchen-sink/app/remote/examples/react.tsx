/** @jsxRuntime automatic */
/** @jsxImportSource react */

import {useState, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {createRemoteComponent} from '@remote-dom/react';

import type {RenderAPI} from '../../types.ts';
import {
  Text as TextElement,
  Button as ButtonElement,
  Stack as StackElement,
  Modal as ModalElement,
} from '../elements.ts';

const Text = createRemoteComponent('ui-text', TextElement);
const Button = createRemoteComponent('ui-button', ButtonElement, {
  eventProps: {
    onPress: {event: 'press'},
  },
});
const Stack = createRemoteComponent('ui-stack', StackElement);
const Modal = createRemoteComponent('ui-modal', ModalElement, {
  eventProps: {
    onOpen: {event: 'open'},
    onClose: {event: 'close'},
  },
});

export function renderUsingReact(root: Element, api: RenderAPI) {
  createRoot(root).render(<App api={api} />);
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
      <Button modal={<CountModal alert={api.alert} />}>Open modal</Button>
    </Stack>
  );
}

function CountModal({alert}: Pick<RenderAPI, 'alert'>) {
  const [count, setCount] = useState(0);
  const modalRef = useRef<InstanceType<typeof ModalElement>>(null);

  const primaryAction = (
    <Button onPress={() => modalRef.current?.close()}>Close</Button>
  );

  return (
    <Modal
      ref={modalRef}
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
