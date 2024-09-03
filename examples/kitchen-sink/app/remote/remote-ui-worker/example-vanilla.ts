import {createRemoteComponent, type RemoteRoot} from '@remote-ui/core';
import type {
  RenderAPI,
  ButtonProperties,
  TextProperties,
  ModalProperties,
  StackProperties,
} from '../../types.ts';

// these are just type-branded strings
const Button = createRemoteComponent<'Button', ButtonProperties>('Button');
const Text = createRemoteComponent<'Text', TextProperties>('Text');
const Modal = createRemoteComponent<'Modal', ModalProperties>('Modal');
const Stack = createRemoteComponent<'Stack', StackProperties>('Stack');

export function renderVanilla(root: RemoteRoot, api: RenderAPI) {
  let count = 0;
  let countText = root.createText('0');

  function updateCount(newCount: number) {
    count = newCount;
    countText.update(String(count));
  }

  const primaryAction = root.createFragment();
  primaryAction.append(
    root.createComponent(
      Button,
      {
        onPress() {
          // remote-ui did not support calling functions on components:
          // modal.close();
          modal.updateProps({open: false});
        },
      },
      'Close modal',
    ),
  );

  const modal = root.createComponent(
    Modal,
    {
      onClose() {
        if (count > 0) {
          api.alert(`You clicked ${count} times!`);
        }

        updateCount(0);
      },
      primaryAction,
    },
    root.createComponent(
      Text,
      null,
      'Click count: ',
      root.createComponent(Text, {emphasis: true}, countText),
    ),
    root.createComponent(
      Button,
      {
        onPress() {
          updateCount(count + 1);
        },
      },
      'click me!',
    ),
  );

  root.append(
    root.createComponent(
      Stack,
      {spacing: true},
      root.createComponent(
        Text,
        {},
        'Rendering example: ',
        root.createComponent(Text, {emphasis: true}, api.example),
      ),

      root.createComponent(
        Text,
        {},
        'Rendering in sandbox: ',
        root.createComponent(Text, {emphasis: true}, api.sandbox),
      ),

      root.createComponent(
        Button,
        {
          onPress() {
            modal.updateProps({open: true});
          },
        },
        'Open modal',
      ),
    ),
    modal,
  );
}
