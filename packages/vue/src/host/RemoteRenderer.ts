import {h, defineComponent} from 'vue';
import type {PropType} from 'vue';
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

export const RemoteRenderer = defineComponent({
  name: 'RemoteRenderer',
  props: {
    receiver: {type: Object as PropType<Props['receiver']>, required: true},
    controller: {type: Object as PropType<Props['controller']>, required: true},
  },
  setup({receiver, controller}) {
    const attached = useAttached(receiver, receiver.attached.root);

    return () => {
      return attached.value!.children.map((child) => {
        switch (child.kind) {
          case KIND_COMPONENT: {
            return h(RemoteComponent as any, {
              key: child.id,
              component: child,
              receiver,
              controller,
            });
          }
          case KIND_TEXT: {
            return h(RemoteText as any, {
              key: child.id,
              text: child,
              receiver,
            });
          }
          default:
            return null;
        }
      });
    };
  },
});
