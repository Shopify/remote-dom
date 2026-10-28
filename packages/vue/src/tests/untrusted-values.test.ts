import {createApp, defineComponent, h, nextTick} from 'vue';
import {
  ACTION_MOUNT,
  ACTION_UPDATE_PROPS,
  KIND_COMPONENT,
  KIND_FRAGMENT,
} from '@remote-ui/core';

import {createRemoteReceiver, RemoteRenderer, createController} from '../host';

const INJECTED_ID = 'injected-by-remote';

const HostBanner = defineComponent({
  props: ['heading'],
  setup(props) {
    return () => h('h2', [props.heading]);
  },
});

describe('untrusted fragment props', () => {
  it.each(['mount', 'update'])(
    'rejects Vue nodes disguised as fragments on %s',
    async (action) => {
      const receiver = createRemoteReceiver();
      const controller = createController({Banner: HostBanner});
      const container = document.createElement('div');
      const app = createApp({
        render: () => h(RemoteRenderer, {receiver, controller}),
      });
      app.mount(container);

      try {
        const component = {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {heading: 'Hi'},
          children: [],
        } as any;
        if (action === 'update') {
          receiver.receive(ACTION_MOUNT, [component]);
          await receiver.flush();
        }

        // These fields survive the RPC decoder and Vue accepts the object
        // as a VNode when a host renders its heading prop.
        const props = {
          heading: {
            id: 'fragment',
            kind: KIND_FRAGMENT,
            children: [],
            __v_isVNode: true,
            type: 'div',
            props: {innerHTML: `<b id="${INJECTED_ID}">injected</b>`},
            shapeFlag: 1,
            patchFlag: 0,
          },
        };
        let error: unknown;
        try {
          if (action === 'mount') {
            receiver.receive(ACTION_MOUNT, [{...component, props}]);
          } else {
            receiver.receive(ACTION_UPDATE_PROPS, '1', props);
          }
        } catch (caught) {
          error = caught;
        }
        await receiver.flush();
        await nextTick();

        expect(container.querySelector(`#${INJECTED_ID}`)).toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/masquerades/);
        expect(container.textContent).toBe(action === 'update' ? 'Hi' : '');
      } finally {
        app.unmount(container);
      }
    },
  );
});
