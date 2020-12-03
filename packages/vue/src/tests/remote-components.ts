import {createRemoteVueComponent} from '..';

export const Button = createRemoteVueComponent<
  'Button',
  {primary?: boolean; onPress?(): void}
>('Button', {
  emits: {press: 'onPress'},
});
