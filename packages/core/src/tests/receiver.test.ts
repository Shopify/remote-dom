import {RETAIN_METHOD, RELEASE_METHOD} from '@remote-ui/rpc';

import {createRemoteReceiver} from '../receiver';
import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
} from '../types';
import type {RemoteReceiverAttachableText} from '../receiver';

describe('createRemoteReceiver()', () => {
  describe('state', () => {
    it('is `unmounted` while the mount() message has not been received', () => {
      const receiver = createRemoteReceiver();
      expect(receiver).toHaveProperty('state', 'unmounted');
    });

    it('is `mounted` once the mount() message has been received', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, []);
      expect(receiver).toHaveProperty('state', 'mounted');
    });
  });

  describe('removeChild', () => {
    it('removes a given child node', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, [
        {
          id: 'child1',
          children: [],
          kind: KIND_COMPONENT,
          props: {},
          type: '',
        },
      ]);

      expect(receiver.attached.root.children).toHaveLength(1);
      expect(receiver.attached.root.children[0].id).toBe('child1');

      receiver.receive(
        ACTION_INSERT_CHILD,
        undefined,
        0,
        {
          id: 'child2',
          children: [],
          kind: KIND_COMPONENT,
          props: {},
          type: '',
        },
        'child2',
      );

      expect(receiver.attached.root.children).toHaveLength(2);
      expect(receiver.attached.root.children[0].id).toBe('child2');
      expect(receiver.attached.root.children[1].id).toBe('child1');

      receiver.receive(ACTION_REMOVE_CHILD, undefined, 0);

      expect(receiver.attached.root.children).toHaveLength(1);
      expect(receiver.attached.root.children[0].id).toBe('child1');
    });

    it('handles a missing child', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, []);
      receiver.receive(ACTION_REMOVE_CHILD, undefined, -1);

      expect(receiver.attached.root.children).toHaveLength(0);
    });
  });

  describe('untrusted values', () => {
    /**
     * The remote is untrusted, and host renderers feed what this receiver
     * stores straight into a UI framework. Preact treats any object whose
     * `constructor` resolves to `undefined` as a virtual node, so such
     * objects must never be stored where a renderer expects a string, and
     * must be rejected as prop values.
     */

    function vnodeShaped() {
      return {constructor: undefined, type: 'div', props: {}, __b: 1};
    }

    function component(id: string, extra: Record<string, any> = {}) {
      return {
        id,
        kind: KIND_COMPONENT,
        type: 'Banner',
        props: {},
        children: [],
        ...extra,
      } as any;
    }

    function text(id: string, value: unknown) {
      return {id, kind: KIND_TEXT, text: value} as any;
    }

    it('stores strings for text content on mount', () => {
      const receiver = createRemoteReceiver();

      receiver.receive(ACTION_MOUNT, [
        component('1', {
          children: [text('2', vnodeShaped()), text('3', 42), text('4', null)],
        }),
      ]);

      expect(
        receiver.attached.get<RemoteReceiverAttachableText>({id: '2'})!.text,
      ).toBe('[object Object]');
      expect(
        receiver.attached.get<RemoteReceiverAttachableText>({id: '3'})!.text,
      ).toBe('42');
      expect(
        receiver.attached.get<RemoteReceiverAttachableText>({id: '4'})!.text,
      ).toBe('');
    });

    it('stores strings for inserted and updated text', () => {
      const receiver = createRemoteReceiver();

      receiver.receive(ACTION_MOUNT, []);
      receiver.receive(
        ACTION_INSERT_CHILD,
        undefined,
        0,
        text('1', vnodeShaped()),
        false,
      );

      const attached = receiver.attached.get<RemoteReceiverAttachableText>({
        id: '1',
      })!;
      expect(attached.text).toBe('[object Object]');

      receiver.receive(ACTION_UPDATE_TEXT, '1', Object.create(null));
      expect(attached.text).toBe('[object Object]');

      receiver.receive(ACTION_UPDATE_TEXT, '1', undefined as any);
      expect(attached.text).toBe('');
    });

    it('stores strings for text inside fragment props', () => {
      const receiver = createRemoteReceiver();

      receiver.receive(ACTION_MOUNT, [
        component('1', {
          props: {
            heading: {
              id: 'f',
              kind: KIND_FRAGMENT,
              children: [text('t', vnodeShaped())],
            },
          },
        }),
      ]);

      expect(
        receiver.attached.get<RemoteReceiverAttachableText>({id: 't'})!.text,
      ).toBe('[object Object]');
    });

    it('rejects vnode-shaped props on mount without attaching anything', () => {
      const receiver = createRemoteReceiver();

      expect(() =>
        receiver.receive(ACTION_MOUNT, [
          component('1', {props: {heading: vnodeShaped()}}),
        ]),
      ).toThrow(/masquerades/);

      expect(receiver.attached.get({id: '1'})).toBeNull();
      expect(receiver.attached.root.children).toHaveLength(0);
    });

    it('rejects vnode-shaped props on insert and update, keeping previous values', () => {
      const receiver = createRemoteReceiver();

      receiver.receive(ACTION_MOUNT, [
        component('1', {props: {heading: 'Hi'}}),
      ]);

      expect(() =>
        receiver.receive(
          ACTION_INSERT_CHILD,
          undefined,
          1,
          component('2', {props: {items: ['ok', vnodeShaped()]}}),
          false,
        ),
      ).toThrow(/masquerades/);
      expect(receiver.attached.get({id: '2'})).toBeNull();

      expect(() =>
        receiver.receive(ACTION_UPDATE_PROPS, '1', {
          heading: {nested: vnodeShaped()},
        }),
      ).toThrow(/masquerades/);

      expect(receiver.attached.get<any>({id: '1'})!.props).toStrictEqual({
        heading: 'Hi',
      });
    });

    it('rejects __proto__ as a prop name', () => {
      const receiver = createRemoteReceiver();

      receiver.receive(ACTION_MOUNT, [
        component('1', {props: {heading: 'Hi'}}),
      ]);

      expect(() =>
        receiver.receive(
          ACTION_UPDATE_PROPS,
          '1',
          JSON.parse('{"__proto__": {"polluted": true}}'),
        ),
      ).toThrow(/name is not allowed/);

      const {props} = receiver.attached.get<any>({id: '1'})!;
      expect(props.polluted).toBeUndefined();
      expect(Object.getPrototypeOf(props)).toBe(Object.prototype);
    });

    it('rejects a non-string component type', () => {
      const receiver = createRemoteReceiver();

      expect(() =>
        receiver.receive(ACTION_MOUNT, [component('1', {type: {}})]),
      ).toThrow(/component type/);
    });

    it.each(['mount', 'insert', 'update'])(
      'rejects framework nodes disguised as fragment props on %s',
      (action) => {
        const receiver = createRemoteReceiver();
        receiver.receive(ACTION_MOUNT, [component('1')]);

        const props = {
          heading: {
            id: 'f',
            kind: KIND_FRAGMENT,
            children: [],
            __v_isVNode: true,
            type: 'div',
            props: {innerHTML: '<b>injected</b>'},
          },
        };

        expect(() => {
          if (action === 'mount') {
            receiver.receive(ACTION_MOUNT, [component('2', {props})]);
          } else if (action === 'insert') {
            receiver.receive(
              ACTION_INSERT_CHILD,
              undefined,
              1,
              component('2', {props}),
              false,
            );
          } else {
            receiver.receive(ACTION_UPDATE_PROPS, '1', props);
          }
        }).toThrow(/masquerades/);

        expect(receiver.attached.get({id: 'f'})).toBeNull();
      },
    );

    it('rejects invalid fragment updates before detaching or retaining anything', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, [
        component('1', {
          props: {
            heading: {
              id: 'old',
              kind: KIND_FRAGMENT,
              children: [text('old-text', 'Hi')],
            },
          },
        }),
      ]);
      const attached = receiver.attached.get<any>({id: '1'})!;
      const oldFragment = attached.props.heading;
      const oldText = receiver.attached.get({id: 'old-text'});
      const onPress = Object.assign(jest.fn(), {
        [RETAIN_METHOD]: jest.fn(),
        [RELEASE_METHOD]: jest.fn(),
      });

      expect(() =>
        receiver.receive(ACTION_UPDATE_PROPS, '1', {
          onPress,
          heading: {
            id: 'new',
            kind: KIND_FRAGMENT,
            children: [text('new-text', 'New')],
          },
          footer: {
            id: 'invalid',
            kind: KIND_FRAGMENT,
            children: [component('bad', {props: {value: vnodeShaped()}})],
          },
        }),
      ).toThrow(/masquerades/);

      expect(onPress[RETAIN_METHOD]).not.toHaveBeenCalled();
      expect(attached.props).toStrictEqual({heading: oldFragment});
      expect(attached.version).toBe(0);
      expect(receiver.attached.get({id: 'old'})).toBe(oldFragment);
      expect(receiver.attached.get({id: 'old-text'})).toBe(oldText);
      expect(receiver.attached.get({id: 'new'})).toBeNull();
      expect(receiver.attached.get({id: 'new-text'})).toBeNull();
    });

    it('still accepts ordinary object, function, and fragment props', () => {
      const receiver = createRemoteReceiver();
      const onPress = () => {};

      receiver.receive(ACTION_MOUNT, [
        component('1', {
          props: {
            options: {list: [1, {label: 'c'}]},
            onPress,
            heading: {
              id: 'f',
              kind: KIND_FRAGMENT,
              children: [text('t', 'Hi')],
            },
          },
        }),
      ]);

      const {props} = receiver.attached.get<any>({id: '1'})!;
      expect(props.options).toStrictEqual({list: [1, {label: 'c'}]});
      expect(props.onPress).toBe(onPress);
      expect(receiver.attached.get({id: 'f'})).not.toBeNull();
    });
  });
});
