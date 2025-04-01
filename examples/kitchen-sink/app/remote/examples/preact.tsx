/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {render} from 'preact';
import {useRef} from 'preact/hooks';
import {useSignal} from '@preact/signals';
import {createRemoteComponent} from '@remote-dom/preact';

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

export function renderUsingPreact(root: Element, api: RenderAPI) {
  render(<App api={api} />, root);
}

function App({api}: {api: RenderAPI}) {
  const order = useSignal([1, 2]);

  return (
    <Stack spacing>
      <Button
        onPress={() => {
          order.value = [...order.value].reverse();
        }}
      >
        Reverse
      </Button>
      {order.value.map((item) => (
        <Button key={item} onPress={() => console.log(`Pressed ${item}`)}>
          {item}
        </Button>
      ))}
    </Stack>
  );
}

function CountModal({alert}: Pick<RenderAPI, 'alert'>) {
  const count = useSignal(0);
  const modalRef = useRef<InstanceType<typeof ModalElement>>(null);

  const primaryAction = (
    <Button onPress={() => modalRef.current?.close()}>Close</Button>
  );

  return (
    <Modal
      ref={modalRef}
      primaryAction={primaryAction}
      onClose={() => {
        if (count.peek() > 0) {
          alert(`You clicked ${count} times!`);
        }

        count.value = 0;
      }}
    >
      <Stack spacing>
        <Text>
          Click count: <Text emphasis>{count}</Text>
        </Text>
        <Button
          onPress={() => {
            count.value += 1;
          }}
        >
          Click me!
        </Button>
      </Stack>
    </Modal>
  );
}
