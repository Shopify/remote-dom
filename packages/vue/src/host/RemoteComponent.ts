import {defineComponent, h, watch, computed} from 'vue';
import type {Ref, PropType, VNode} from 'vue';
import {retain, release} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './shared';

// The remote must not control DOM content, component identity, refs, or
// framework lifecycle hooks through props passed to a host implementation.
const RESERVED_PROPS = new Set([
  'children',
  'dangerouslySetInnerHTML',
  'innerHTML',
  'outerHTML',
  'textContent',
  'key',
  'ref',
  '__proto__',
]);

interface Props {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
}

export const RemoteComponent = defineComponent({
  name: 'RemoteComponent',
  props: {
    component: {type: Object as PropType<Props['component']>, required: true},
    receiver: {type: Object as PropType<Props['receiver']>, required: true},
    controller: {type: Object as PropType<Props['controller']>, required: true},
  },
  setup({receiver, component, controller}): () => VNode | null {
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

      const hostProps: Record<string, unknown> = {};
      for (const key of Object.keys(props ?? {})) {
        if (RESERVED_PROPS.has(key) || key.startsWith('onVnode')) continue;
        hostProps[key] = (props as any)[key];
      }

      return h(Implementation, hostProps, () =>
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
