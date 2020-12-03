import {defineComponent, h, watch, computed} from 'vue';
import type {Ref, DefineComponent} from 'vue';

import {retain, release} from '@remote-ui/core';
import type {
  Serialized,
  RemoteReceiver,
  RemoteComponent as RemoteComponentDescription,
} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './shared';

interface Props {
  receiver: RemoteReceiver;
  component: Serialized<RemoteComponentDescription<any, any>>;
  controller: Controller;
}

export const RemoteComponent: DefineComponent<Props> = defineComponent({
  name: 'RemoteComponent',
  props: ['component', 'receiver', 'controller'],
  setup({receiver, component, controller}: Props) {
    const attached = useAttached(receiver, component);
    const propsRef: Ref<object | undefined> = computed(
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
