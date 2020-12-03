import {h, defineComponent, ref, computed} from 'vue';
import type {DefineComponent} from 'vue';
import {KIND_COMPONENT, KIND_TEXT} from '@remote-ui/core';
import type {RemoteReceiver} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteComponent} from './RemoteComponent';
import {RemoteText} from './RemoteText';
import {useAttached} from './shared';

interface Props {
  receiver: RemoteReceiver;
  controller: Controller;
}

export const RemoteRenderer: DefineComponent<Props> = defineComponent({
  name: 'RemoteRenderer',
  props: ['receiver', 'controller'],
  setup({receiver, controller}: Props) {
    const attached = useAttached(receiver, receiver.root);

    return () => {
      return attached.value!.children.map((child) => {
        switch (child.kind) {
          case KIND_COMPONENT: {
            return h(RemoteComponent, {
              key: child.id,
              component: child,
              receiver,
              controller,
            });
          }
          case KIND_TEXT: {
            return h(RemoteText, {
              key: child.id,
              text: child,
              receiver,
            });
          }
        }
      });
    };
  },
});
