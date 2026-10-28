// @vitest-environment jsdom

/**
 * These tests cover the host’s handling of malformed values in the rendering
 * protocol. The remote environment is untrusted: it can send any
 * `structuredClone`-able value where the protocol expects a string (text node
 * content, attribute values) or where it expects plain data (properties).
 *
 * Preact treats any object whose `constructor` resolves to `undefined` as one
 * of its own virtual nodes. Such objects can’t be written as JSON, but they do
 * survive `postMessage`, so a remote can smuggle a “vnode” (including one with
 * `dangerouslySetInnerHTML`) into the host render tree. The host must never
 * hand such a value to Preact.
 */

import {describe, it, expect, afterEach} from 'vitest';

import {render} from 'preact';
import {act} from 'preact/test-utils';
import type {PropsWithChildren} from 'preact/compat';
import '@preact/signals';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_PROPERTY,
  type RemoteMutationRecord,
} from '@remote-dom/core';
import {SignalRemoteReceiver} from '@remote-dom/signals';

import {RemoteRootRenderer, createRemoteComponentRenderer} from '../host.ts';

const INJECTED_ID = 'injected-by-remote';
const INJECTED_HTML = `<b id="${INJECTED_ID}">injected</b>`;

/**
 * Builds an object shaped like a Preact vnode, as the remote environment would
 * construct it before sending. `constructor: undefined` is an own property that
 * structured cloning preserves; the real wire also lets a literal `__proto__`
 * key through, which gives the same result on the host (a `null` prototype, so
 * `constructor` is `undefined`). Both variants are tested. The `__b` (depth)
 * field makes Preact clone the object into a genuine vnode via `createVNode`.
 */
function smuggledVNode(variant: 'constructor' | 'proto' = 'constructor') {
  const vnode: Record<string, unknown> = {
    type: 'div',
    props: {dangerouslySetInnerHTML: {__html: INJECTED_HTML}},
    key: null,
    ref: null,
    __b: 1,
  };

  if (variant === 'constructor') {
    (vnode as any).constructor = undefined;
  } else {
    // What `JSON.parse('{"__proto__": null}')` produces: a real own property
    // named `__proto__`, which the wire deserializer then assigns on the host.
    Object.defineProperty(vnode, '__proto__', {value: null, enumerable: true});
  }

  return vnode;
}

/**
 * Mimics the thread serialization used between a worker and the host:
 * functions are replaced by callable proxies, everything else goes through
 * structured clone, and plain objects are rebuilt on the receiving side by
 * assigning each own key onto a fresh object.
 */
function simulateWire<T>(value: T): T {
  const functions: Function[] = [];

  return rebuild(structuredClone(encode(value))) as T;

  function encode(value: any): any {
    if (typeof value === 'function') {
      functions.push(value);
      return {[FUNCTION_MARKER]: functions.length - 1};
    }
    if (typeof value !== 'object' || value === null) return value;
    if (Array.isArray(value)) return value.map(encode);
    if (value instanceof Error) {
      return new Error(value.message, {cause: encode(value.cause)});
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const encoded = encode(value[key]);
      if (key === '__proto__') {
        Object.defineProperty(result, key, {value: encoded, enumerable: true});
      } else {
        result[key] = encoded;
      }
    }
    return result;
  }

  function rebuild(value: any): any {
    if (typeof value !== 'object' || value === null) return value;
    if (Array.isArray(value)) return value.map(rebuild);
    if (value instanceof Error) {
      return new Error(value.message, {cause: rebuild(value.cause)});
    }
    if (FUNCTION_MARKER in value) {
      const original = functions[value[FUNCTION_MARKER]]!;
      return (...args: any[]) => original(...args);
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      result[key] = rebuild(value[key]);
    }
    return result;
  }
}

const FUNCTION_MARKER = '_@f';

function HostBanner({
  heading,
  children,
}: PropsWithChildren<{heading?: string}>) {
  return (
    <section>
      <h2>{heading}</h2>
      <div>{children}</div>
    </section>
  );
}

function HostText({content}: {content?: string}) {
  return <p>{content}</p>;
}

function HostList({items}: {items?: string[]}) {
  return <ul>{items?.map((item, index) => <li key={index}>{item}</li>)}</ul>;
}

function HostNested({options}: {options: {label?: string}}) {
  return <p>{options.label}</p>;
}

function HostError({error}: {error: Error}) {
  return <p>{error.cause as string}</p>;
}

function HostSpread(props: Record<string, any>) {
  return <div {...props} />;
}

function mount() {
  const receiver = new SignalRemoteReceiver();
  const components = new Map([
    ['ui-banner', createRemoteComponentRenderer(HostBanner)],
    ['ui-text', createRemoteComponentRenderer(HostText)],
    ['ui-list', createRemoteComponentRenderer(HostList)],
    ['ui-nested', createRemoteComponentRenderer(HostNested)],
    ['ui-error', createRemoteComponentRenderer(HostError)],
    ['ui-spread', createRemoteComponentRenderer(HostSpread)],
  ]);

  const container = document.createElement('div');
  document.body.append(container);
  render(
    <RemoteRootRenderer receiver={receiver} components={components} />,
    container,
  );

  return {
    receiver,
    container,
    mutate(records: RemoteMutationRecord[]) {
      act(() => {
        receiver.connection.mutate(simulateWire(records));
      });
    },
  };
}

function expectNoInjection(container: HTMLElement) {
  expect(document.getElementById(INJECTED_ID)).toBeNull();
  expect(container.innerHTML).not.toContain('injected');
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('untrusted values from the remote environment', () => {
  describe.each(['constructor', 'proto'] as const)(
    'vnode smuggled via %s',
    (variant) => {
      it('is never rendered when sent as the initial content of a text node', () => {
        const {container, mutate} = mount();

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: '1',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-banner',
              children: [
                {id: '2', type: NODE_TYPE_TEXT, data: smuggledVNode(variant)},
              ],
            } as any,
            0,
          ],
        ]);

        expectNoInjection(container);
        expect(container.querySelector('section')).not.toBeNull();
      });

      it('is never rendered when sent as a text update', () => {
        const {container, mutate} = mount();

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: '1',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-banner',
              children: [{id: '2', type: NODE_TYPE_TEXT, data: 'Hello'}],
            },
            0,
          ],
        ]);

        expect(container.textContent).toContain('Hello');

        mutate([
          [MUTATION_TYPE_UPDATE_TEXT, '2', smuggledVNode(variant) as any],
        ]);

        expectNoInjection(container);
      });

      it('is never rendered when sent as an initial attribute value', () => {
        const {container, mutate} = mount();

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: '1',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-banner',
              attributes: {heading: smuggledVNode(variant)} as any,
              children: [],
            },
            0,
          ],
        ]);

        expectNoInjection(container);
      });

      it('is never rendered when sent as an attribute update', () => {
        const {container, mutate} = mount();

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: '1',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-banner',
              attributes: {heading: 'Hi'},
              children: [],
            },
            0,
          ],
        ]);

        expect(container.querySelector('h2')!.textContent).toBe('Hi');

        mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            '1',
            'heading',
            smuggledVNode(variant),
            UPDATE_PROPERTY_TYPE_ATTRIBUTE,
          ],
        ]);

        expectNoInjection(container);
      });

      it('is never rendered when sent as an initial property value', () => {
        const {container, mutate} = mount();

        expect(() =>
          mutate([
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              {
                id: '1',
                type: NODE_TYPE_ELEMENT,
                element: 'ui-text',
                properties: {content: smuggledVNode(variant)},
                children: [],
              },
              0,
            ],
          ]),
        ).toThrow();

        expectNoInjection(container);
      });

      it('is never rendered when sent as a property update', () => {
        const {container, mutate} = mount();

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: '1',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-text',
              properties: {content: 'Hello'},
              children: [],
            },
            0,
          ],
        ]);

        expect(() =>
          mutate([
            [
              MUTATION_TYPE_UPDATE_PROPERTY,
              '1',
              'content',
              smuggledVNode(variant),
              UPDATE_PROPERTY_TYPE_PROPERTY,
            ],
          ]),
        ).toThrow();

        expectNoInjection(container);
        expect(container.querySelector('p')!.textContent).toBe('Hello');
      });

      it('is never rendered when nested inside a property value', () => {
        const {container, mutate} = mount();

        expect(() =>
          mutate([
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              {
                id: '1',
                type: NODE_TYPE_ELEMENT,
                element: 'ui-list',
                properties: {items: ['ok', smuggledVNode(variant)]},
                children: [],
              },
              0,
            ],
          ]),
        ).toThrow();

        expectNoInjection(container);
      });
    },
  );

  describe.each(['inherited property', 'Error cause'] as const)(
    'vnode hidden in %s',
    (variant) => {
      it('rejects insertion and updates without rendering injected markup', () => {
        const {container, mutate} = mount();
        const inherited = variant === 'inherited property';
        const property = inherited ? 'options' : 'error';
        const element = inherited ? 'ui-nested' : 'ui-error';
        const safe = inherited
          ? {label: 'safe'}
          : new Error('remote', {cause: 'safe'});
        const unsafe = inherited
          ? JSON.parse('{"__proto__": {}}')
          : new Error('remote', {cause: smuggledVNode()});
        if (inherited) unsafe.__proto__.label = smuggledVNode();

        expect(() =>
          mutate([
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              {
                id: '1',
                type: NODE_TYPE_ELEMENT,
                element,
                properties: {[property]: unsafe},
                children: [],
              },
              0,
            ],
          ]),
        ).toThrow(/masquerades/);
        expectNoInjection(container);

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: '1',
              type: NODE_TYPE_ELEMENT,
              element,
              properties: {[property]: safe},
              children: [],
            },
            0,
          ],
        ]);
        expect(container.querySelector('p')!.textContent).toBe('safe');

        expect(() =>
          mutate([
            [
              MUTATION_TYPE_UPDATE_PROPERTY,
              '1',
              property,
              unsafe,
              UPDATE_PROPERTY_TYPE_PROPERTY,
            ],
          ]),
        ).toThrow(/masquerades/);
        expectNoInjection(container);
        expect(container.querySelector('p')!.textContent).toBe('safe');
      });
    },
  );

  describe('type coercion', () => {
    it('renders non-string text content as a string', () => {
      const {container, mutate} = mount();

      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-banner',
            children: [{id: '2', type: NODE_TYPE_TEXT, data: 42 as any}],
          },
          0,
        ],
      ]);

      expect(container.querySelector('section > div')!.textContent).toBe('42');

      mutate([[MUTATION_TYPE_UPDATE_TEXT, '2', null as any]]);
      expect(container.querySelector('section > div')!.textContent).toBe('');
    });

    it('renders non-string attribute values as strings', () => {
      const {container, mutate} = mount();

      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-banner',
            attributes: {heading: 7 as any},
            children: [],
          },
          0,
        ],
      ]);

      expect(container.querySelector('h2')!.textContent).toBe('7');

      mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'heading',
          {toString: () => 'not a vnode'},
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);

      expect(container.querySelector('h2')!.textContent).toBe(
        '[object Object]',
      );
    });

    it('treats a nullish attribute update as removal', () => {
      const {container, mutate} = mount();

      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-banner',
            attributes: {heading: 'Hi'},
            children: [],
          },
          0,
        ],
      ]);

      mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          '1',
          'heading',
          undefined,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);

      expect(container.querySelector('h2')!.textContent).toBe('');
    });
  });

  describe('reserved framework props', () => {
    describe.each(['innerHTML', 'outerHTML'])('%s', (name) => {
      it.each([
        ['properties', UPDATE_PROPERTY_TYPE_PROPERTY],
        ['attributes', UPDATE_PROPERTY_TYPE_ATTRIBUTE],
      ] as const)(
        'ignores initial and updated %s on a host that spreads props',
        (channel, type) => {
          const {container, mutate} = mount();
          mutate([
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              {
                id: '1',
                type: NODE_TYPE_ELEMENT,
                element: 'ui-spread',
                properties:
                  channel === 'properties' ? {[name]: INJECTED_HTML} : {},
                attributes: {
                  title: 'kept',
                  ...(channel === 'attributes' ? {[name]: INJECTED_HTML} : {}),
                },
                children: [],
              },
              0,
            ],
          ]);
          expect(document.getElementById(INJECTED_ID)).toBeNull();
          expect(container.querySelector('div[title="kept"]')).not.toBeNull();

          mutate([
            [
              MUTATION_TYPE_UPDATE_PROPERTY,
              '1',
              name,
              INJECTED_HTML + 'updated',
              type,
            ],
          ]);
          expect(document.getElementById(INJECTED_ID)).toBeNull();
          expect(container.querySelector('div[title="kept"]')).not.toBeNull();
        },
      );
    });

    it('does not let remote properties set dangerouslySetInnerHTML on a host component that spreads props', () => {
      const {container, mutate} = mount();

      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-spread',
            properties: {
              dangerouslySetInnerHTML: {__html: INJECTED_HTML},
              title: 'kept',
            },
            children: [],
          },
          0,
        ],
      ]);

      expectNoInjection(container);
      expect(container.querySelector('div[title="kept"]')).not.toBeNull();
    });

    it('does not let remote attributes set dangerouslySetInnerHTML on a host component that spreads props', () => {
      const {container, mutate} = mount();

      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-spread',
            attributes: {dangerouslySetInnerHTML: INJECTED_HTML},
            children: [],
          },
          0,
        ],
      ]);

      expectNoInjection(container);
    });

    it('does not let remote properties override the ref used to implement remote methods', () => {
      const {receiver, mutate} = mount();

      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-spread',
            properties: {ref: () => {}, key: 'other', children: 'override'},
            children: [],
          },
          0,
        ],
      ]);

      // The element renders and the receiver still gets an implementation hook;
      // the remote-provided `ref` and `children` are ignored.
      const element = receiver.get({id: '1'});
      expect(element).toBeDefined();
      expect(document.body.textContent).not.toContain('override');
    });
  });
});
