import {createRemoteReactComponent} from '@remote-ui/react';
import {
  ButtonProperties,
  ModalProperties,
  StackProperties,
  TextProperties,
} from '../types';

export const Button = createRemoteReactComponent<'Button', ButtonProperties>(
  'Button',
  {fragmentProps: ['modal']},
);
export const Text = createRemoteReactComponent<'Text', TextProperties>('Text');
export const Stack = createRemoteReactComponent<'Stack', StackProperties>(
  'Stack',
);
export const Modal = createRemoteReactComponent<'Modal', ModalProperties>(
  'Modal',
  {fragmentProps: ['primaryAction']},
);
