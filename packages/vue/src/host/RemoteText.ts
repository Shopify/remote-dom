import {defineComponent} from 'vue';
import type {
  Serialized,
  RemoteReceiver,
  RemoteText as RemoteTextDescription,
} from '@remote-ui/core';

import {useAttached} from './shared';

interface Props {
  text: Serialized<RemoteTextDescription<any>>;
  receiver: RemoteReceiver;
}

export const RemoteText = defineComponent({
  name: 'RemoteText',
  props: ['text', 'receiver'],
  setup({text, receiver}: Props) {
    const attached = useAttached(receiver, text);
    return () => (attached.value ? attached.value.text : null);
  },
});
