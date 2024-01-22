import {render} from 'preact';
import {useSignal} from '@preact/signals';
import {createRemoteComponent} from '@remote-dom/preact';

import type {RenderApi} from '../../types.ts';
import {
  Button as ButtonElement,
  Stack as StackElement,
  TextField as TextFieldElement,
} from '../elements.ts';

const Button = createRemoteComponent('ui-button', ButtonElement);
const Stack = createRemoteComponent('ui-stack', StackElement);
const TextField = createRemoteComponent('ui-text-field', TextFieldElement);

export function renderUsingPreact(root: Element, api: RenderApi) {
  render(<App api={api} />, root);
}

function App({api}: {api: RenderApi}) {
  const value = useSignal('');

  return (
    <Stack spacing>
      <TextField
        label="Message for remote environment (rendered using preact)"
        onChange={function onChange(newValue: string) {
          value.value = newValue;
        }}
      />
      <Button
        onPress={async function onPress() {
          await api.alert(`Current value in remote sandbox: ${value.peek()}`);
        }}
      >
        Show alert
      </Button>
    </Stack>
  );
}
