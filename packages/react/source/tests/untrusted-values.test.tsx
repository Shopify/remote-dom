// @vitest-environment jsdom

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

/**
 * These tests cover the host’s handling of malformed values in the rendering
 * protocol. The remote environment is untrusted: it can send any
 * `structuredClone`-able value where the protocol expects a string (text node
 * content, attribute values) or where it expects plain data (properties).
 *
 * React refuses to render objects that are not tagged with its `$$typeof`
 * symbol, so a smuggled element shape can’t become markup here. It does,
 * however, throw while rendering (“Objects are not valid as a React child”),
 * which tears down the whole host render tree. The receiver must normalize
 * text and attribute values to strings so this can’t happen.
 */

import {describe, it, expect, afterEach} from 'vitest';

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import type {PropsWithChildren} from 'react';

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
import {RemoteReceiver} from '@remote-dom/core/receivers';

import {RemoteRootRenderer, createRemoteComponentRenderer} from '../host.ts';

const INJECTED_ID = 'injected-by-remote';
const INJECTED_HTML = `<b id="${INJECTED_ID}">injected</b>`;

/**
 * An object shaped like a React element, minus the `$$typeof` symbol (symbols
 * can’t cross `postMessage`). Also carries the Preact vnode markers so the
 * same payload is what a Preact-based host would receive.
 */
function smuggledElement() {
  return {
    type: 'div',
    props: {dangerouslySetInnerHTML: {__html: INJECTED_HTML}},
    key: null,
    ref: null,
    __b: 1,
    constructor: undefined,
  };
}

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
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) result[key] = encode(value[key]);
    return result;
  }

  function rebuild(value: any): any {
    if (typeof value !== 'object' || value === null) return value;
    if (Array.isArray(value)) return value.map(rebuild);
    if (FUNCTION_MARKER in value) {
      const original = functions[value[FUNCTION_MARKER]]!;
      return (...args: any[]) => original(...args);
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) result[key] = rebuild(value[key]);
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

function HostSpread(props: Record<string, any>) {
  return <div {...props} />;
}

const roots: Root[] = [];

function mount() {
  const receiver = new RemoteReceiver();
  const components = new Map([
    ['ui-banner', createRemoteComponentRenderer(HostBanner)],
    ['ui-spread', createRemoteComponentRenderer(HostSpread)],
  ]);

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container, {onRecoverableError() {}});
  roots.push(root);

  act(() => {
    root.render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );
  });

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

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = '';
});

describe('untrusted values from the remote environment', () => {
  it('renders a smuggled element shape sent as text content as plain text, and keeps rendering', () => {
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
            {id: '2', type: NODE_TYPE_TEXT, data: smuggledElement() as any},
          ],
        },
        0,
      ],
    ]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('section > div')!.textContent).toBe(
      '[object Object]',
    );

    mutate([[MUTATION_TYPE_UPDATE_TEXT, '2', smuggledElement() as any]]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('section')).not.toBeNull();
  });

  it('renders a smuggled element shape sent as an attribute as plain text, and keeps rendering', () => {
    const {container, mutate} = mount();

    mutate([
      [
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'ui-banner',
          attributes: {heading: smuggledElement()} as any,
          children: [],
        },
        0,
      ],
    ]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('h2')!.textContent).toBe('[object Object]');

    mutate([
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        '1',
        'heading',
        smuggledElement(),
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      ],
    ]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('h2')!.textContent).toBe('[object Object]');
  });

  it('rejects a smuggled element shape sent as a property', () => {
    const {container, mutate} = mount();

    expect(() =>
      mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'ui-banner',
            properties: {heading: smuggledElement()},
            children: [],
          },
          0,
        ],
      ]),
    ).toThrow();

    mutate([
      [
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'ui-banner',
          properties: {heading: 'Hi'},
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
          'heading',
          smuggledElement(),
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]),
    ).toThrow();

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('h2')!.textContent).toBe('Hi');
  });

  it('coerces text and attribute values to strings', () => {
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
          children: [{id: '2', type: NODE_TYPE_TEXT, data: 42 as any}],
        },
        0,
      ],
    ]);

    expect(container.querySelector('h2')!.textContent).toBe('7');
    expect(container.querySelector('section > div')!.textContent).toBe('42');

    mutate([
      [MUTATION_TYPE_UPDATE_TEXT, '2', null as any],
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        '1',
        'heading',
        undefined,
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      ],
    ]);

    expect(container.querySelector('h2')!.textContent).toBe('');
    expect(container.querySelector('section > div')!.textContent).toBe('');
  });

  it('does not let remote properties or attributes set dangerouslySetInnerHTML on a host component that spreads props', () => {
    const {container, mutate} = mount();

    mutate([
      [
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'ui-spread',
          properties: {dangerouslySetInnerHTML: {__html: INJECTED_HTML}},
          attributes: {title: 'kept'},
          children: [],
        },
        0,
      ],
      [
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'ui-spread',
          attributes: {dangerouslySetInnerHTML: INJECTED_HTML},
          children: [],
        },
        1,
      ],
    ]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('div[title="kept"]')).not.toBeNull();
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

    expect(receiver.get({id: '1'})).toBeDefined();
    expect(document.body.textContent).not.toContain('override');
  });
});
