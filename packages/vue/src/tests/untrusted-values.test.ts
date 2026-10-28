import {createApp, defineComponent, getCurrentInstance, h, nextTick} from 'vue';
import {
  ACTION_MOUNT,
  ACTION_UPDATE_PROPS,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
} from '@remote-ui/core';

import {createRemoteReceiver, RemoteRenderer, createController} from '../host';
import {RemoteComponent} from '../host/RemoteComponent';

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
        app.unmount();
      }
    },
  );

  it('renders an unflagged object as text instead of a Vue node', async () => {
    const receiver = createRemoteReceiver();
    const controller = createController({Banner: HostBanner});
    const container = document.createElement('div');
    const app = createApp({
      render: () => h(RemoteRenderer, {receiver, controller}),
    });
    app.mount(container);
    try {
      receiver.receive(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {
            heading: {
              type: 'div',
              props: {innerHTML: `<b id="${INJECTED_ID}">injected</b>`},
              children: null,
              shapeFlag: 1,
              patchFlag: 0,
            },
          },
          children: [],
        },
      ]);
      await receiver.flush();
      await nextTick();

      expect(container.querySelector(`#${INJECTED_ID}`)).toBeNull();
      expect(container.textContent).toBe('[object Object]');
    } finally {
      app.unmount();
    }
  });
});

const reservedProps = [
  'innerHTML',
  'outerHTML',
  'textContent',
  'children',
  'dangerouslySetInnerHTML',
  'key',
  'ref',
  'onVnodeBeforeMount',
  'onVnodeMounted',
  'onVnodeBeforeUpdate',
  'onVnodeUpdated',
  'onVnodeBeforeUnmount',
  'onVnodeUnmounted',
  'onVnodeCustom',
];

describe('untrusted Vue host props', () => {
  it.each(
    reservedProps.flatMap((name) =>
      ['mount', 'update'].map((action) => [name, action]),
    ),
  )('never forwards %s to the host on %s', async (name, action) => {
    const receivedProps = jest.fn();
    const HostSpread = defineComponent({
      inheritAttrs: false,
      setup(_, {attrs, slots}) {
        const instance = getCurrentInstance()!;
        return () => {
          receivedProps(instance.vnode.props);
          return h('div', attrs, slots.default?.());
        };
      },
    });
    const receiver = createRemoteReceiver();
    const controller = createController({Spread: HostSpread});
    const container = document.createElement('div');
    const app = createApp({
      render: () => h(RemoteRenderer, {receiver, controller}),
    });
    const callback = jest.fn();
    const onClick = jest.fn();
    const props = {
      [name]:
        name === 'ref' || name.startsWith('onVnode')
          ? callback
          : `<b id="${INJECTED_ID}">injected</b>`,
      title: 'kept',
      onClick,
    };
    app.mount(container);
    try {
      receiver.receive(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Spread',
          props: action === 'mount' ? props : {title: 'initial'},
          children: [{id: '2', kind: KIND_TEXT, text: 'Safe child'}],
        },
      ]);
      await receiver.flush();
      if (action === 'update') {
        receiver.receive(ACTION_UPDATE_PROPS, '1', props);
        await receiver.flush();
      }
      await nextTick();

      const forwarded = receivedProps.mock.calls.slice(-1)[0][0];
      expect(Object.prototype.hasOwnProperty.call(forwarded, name)).toBe(false);
      expect(container.querySelector(`#${INJECTED_ID}`)).toBeNull();
      const element = container.querySelector('div[title="kept"]');
      expect(element?.textContent).toBe('Safe child');
      element!.dispatchEvent(new Event('click'));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(callback).not.toHaveBeenCalled();
    } finally {
      app.unmount();
    }
  });

  it('filters __proto__ even when a custom receiver bypasses core validation', () => {
    const receivedProps = jest.fn();
    const Implementation = defineComponent({
      setup() {
        receivedProps(getCurrentInstance()!.vnode.props);
        return () => h('div');
      },
    });
    const component = {
      id: '1',
      kind: KIND_COMPONENT,
      type: 'Spread',
      props: JSON.parse('{"__proto__":{"polluted":true},"title":"kept"}'),
      children: [],
      version: 0,
    } as any;
    const receiver = createRemoteReceiver();
    jest.spyOn(receiver.attached, 'get').mockReturnValue(component);
    const controller = createController({Spread: Implementation});
    const container = document.createElement('div');
    const app = createApp({
      render: () => h(RemoteComponent, {receiver, component, controller}),
    });
    try {
      app.mount(container);
      const props = receivedProps.mock.calls[0][0];
      expect(props.title).toBe('kept');
      expect(Object.prototype.hasOwnProperty.call(props, '__proto__')).toBe(
        false,
      );
      expect(Object.getPrototypeOf(props)).toBe(Object.prototype);
    } finally {
      app.unmount();
    }
  });
});
