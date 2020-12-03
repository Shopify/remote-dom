import {defineComponent} from 'vue';
import type {PropType} from 'vue';
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
  props: {
    text: {type: Object as PropType<Props['text']>, required: true},
    receiver: {type: Object as PropType<Props['receiver']>, required: true},
  },
  setup({text, receiver}) {
    const attached = useAttached(receiver, text);
    return () => (attached.value ? attached.value.text : null);
  },
});
