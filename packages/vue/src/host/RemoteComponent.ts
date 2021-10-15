import {defineComponent, h, watch, computed} from 'vue';
import type {Ref, DefineComponent, PropType} from 'vue';
import {retain, release} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './shared';

interface Props {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
}

export const RemoteComponent: DefineComponent<{
  component: {type: PropType<Props['component']>; required: true};
  receiver: {type: PropType<Props['receiver']>; required: true};
  controller: {type: PropType<Props['controller']>; required: true};
}> = defineComponent({
  name: 'RemoteComponent',
  props: {
    component: {type: Object as PropType<Props['component']>, required: true},
    receiver: {type: Object as PropType<Props['receiver']>, required: true},
    controller: {type: Object as PropType<Props['controller']>, required: true},
  },
  setup({receiver, component, controller}) {
    const attached = useAttached(receiver, component);
    const propsRef: Ref<Record<string, unknown> | undefined> = computed(
      () => attached.value?.props as any,
    );

    watch(propsRef, (newProps, oldProps) => {
      release(oldProps);
      retain(newProps);
    });

    return () => {
      if (attached.value == null) return null;

      const Implementation = controller.get(component.type)!;

      const {children, props} = attached.value;

      return h(Implementation, props as any, () =>
        children.map((child) => {
          if ('children' in child) {
            return h(RemoteComponent, {
              key: child.id,
              receiver,
              component: child,
              controller,
            });
          } else {
            return h(RemoteText, {key: child.id, text: child, receiver});
          }
        }),
      );
    };
  },
});
