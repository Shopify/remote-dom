// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../../constants.ts';
import type {RemoteElementSerialization} from '../../types.ts';
import {DOMRemoteReceiver} from '../DOMRemoteReceiver.ts';

const payload = '<img src="invalid" onerror="window.remoteEscaped = true">';

function element(
  overrides: Partial<RemoteElementSerialization> = {},
): RemoteElementSerialization {
  return {
    id: 'button',
    type: NODE_TYPE_ELEMENT,
    element: 'ui-button',
    children: [],
    ...overrides,
  };
}

function insert(receiver: DOMRemoteReceiver, node = element()) {
  receiver.connection.mutate([[MUTATION_TYPE_INSERT_CHILD, ROOT_ID, node, 0]]);
}

function connected(
  options: ConstructorParameters<typeof DOMRemoteReceiver>[0] = {},
) {
  const root = document.createElement('div');
  document.body.append(root);
  return new DOMRemoteReceiver({root, ...options});
}

afterEach(() => document.body.replaceChildren());

describe('DOMRemoteReceiver host policy', () => {
  it('denies elements by default but accepts text', () => {
    const receiver = connected();
    expect(() => insert(receiver)).toThrow(/not allowed/);
    receiver.connection.mutate([
      [
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        {id: 'text', type: NODE_TYPE_TEXT, data: 'Hello'},
        0,
      ],
    ]);
    expect(receiver.root.textContent).toBe('Hello');
  });

  it.each([
    'script',
    'iframe',
    'img',
    'ui-unlisted',
    'SCRIPT',
    'constructor',
    '__proto__',
  ])('rejects unlisted %s elements', (name) => {
    const receiver = connected({elements: ['ui-button']});
    expect(() => insert(receiver, element({element: name}))).toThrow(
      /not allowed/,
    );
    expect(receiver.root.childNodes).toHaveLength(0);
  });

  it('validates the whole subtree before creating elements or retaining values', () => {
    const retain = vi.fn();
    const receiver = connected({
      elements: {'ui-button': {properties: ['label']}},
      retain,
    });
    const create = vi.spyOn(document, 'createElement');
    expect(() =>
      insert(
        receiver,
        element({
          properties: {label: 'Hello'},
          children: [element({id: 'nested', element: 'script'})],
        }),
      ),
    ).toThrow(/not allowed/);
    expect(create).not.toHaveBeenCalled();
    expect(retain).not.toHaveBeenCalled();
    expect(receiver.root.childNodes).toHaveLength(0);
    create.mockRestore();
    insert(receiver);
    expect(receiver.root.childNodes).toHaveLength(1);
  });

  it.each(['innerHTML', 'outerHTML', 'onclick', '__proto__', 'constructor'])(
    'rejects initial and updated %s properties',
    (property) => {
      const receiver = connected({elements: ['ui-button']});
      expect(() =>
        insert(receiver, element({properties: {[property]: payload}})),
      ).toThrow(/not allowed/);
      insert(receiver);
      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_PROPERTY, 'button', property, payload],
        ]),
      ).toThrow(/not allowed/);
      expect(receiver.root.firstChild?.childNodes).toHaveLength(0);
    },
  );

  it.each(['onerror', 'onclick', 'srcdoc', 'href', 'is'])(
    'rejects initial and updated %s attributes',
    (attribute) => {
      const receiver = connected({elements: ['ui-button']});
      expect(() =>
        insert(receiver, element({attributes: {[attribute]: payload}})),
      ).toThrow(/not allowed/);
      insert(receiver);
      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            'button',
            attribute,
            payload,
            UPDATE_PROPERTY_TYPE_ATTRIBUTE,
          ],
        ]),
      ).toThrow(/not allowed/);
      expect(
        (receiver.root.firstChild as Element).getAttribute(attribute),
      ).toBeNull();
    },
  );

  it.each([
    'insertAdjacentHTML',
    'setAttribute',
    'append',
    'constructor',
    '__defineGetter__',
  ])('rejects undeclared %s methods on children and the root', (method) => {
    const receiver = connected({elements: ['ui-button']});
    insert(receiver);
    for (const id of ['button', ROOT_ID]) {
      expect(() =>
        receiver.connection.call(id, method, 'beforeend', payload),
      ).toThrow(/not allowed/);
    }
    expect(receiver.root.firstChild?.childNodes).toHaveLength(0);
  });

  it('allows only the capabilities declared for each element and channel', () => {
    const click = vi.fn();
    const nextClick = vi.fn();
    const receiver = connected({
      elements: {
        'ui-button': {
          properties: ['label'],
          attributes: ['primary'],
          eventListeners: ['click'],
          methods: ['focus'],
        },
        'ui-other': {},
      },
    });
    insert(
      receiver,
      element({
        properties: {label: 'Hello'},
        attributes: {primary: ''},
        eventListeners: {click},
      }),
    );
    const button = receiver.root.firstChild as HTMLElement & {label: string};
    expect(button.label).toBe('Hello');
    expect(button.hasAttribute('primary')).toBe(true);
    button.dispatchEvent(new CustomEvent('click', {detail: 'first'}));
    expect(click).toHaveBeenCalledWith('first');

    receiver.connection.mutate([
      [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'Updated'],
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'button',
        'primary',
        null,
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      ],
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'button',
        'click',
        nextClick,
        UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
      ],
    ]);
    expect(button.label).toBe('Updated');
    expect(button.hasAttribute('primary')).toBe(false);
    button.dispatchEvent(new CustomEvent('click', {detail: 'second'}));
    expect(click).toHaveBeenCalledTimes(1);
    expect(nextClick).toHaveBeenCalledWith('second');
    const focus = vi.spyOn(button, 'focus');
    receiver.connection.call('button', 'focus');
    expect(focus).toHaveBeenCalledOnce();
    expect(() =>
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          'button',
          'primary',
          '',
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]),
    ).toThrow(/not allowed/);
    expect(() =>
      insert(
        receiver,
        element({id: 'other', element: 'ui-other', properties: {label: 'No'}}),
      ),
    ).toThrow(/not allowed/);
  });

  it('rejects text updates targeting an element property setter', () => {
    const receiver = connected({elements: ['ui-button']});
    insert(receiver);
    const set = vi.fn();
    Object.defineProperty(receiver.root.firstChild, 'data', {set});
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_TEXT, 'button', payload],
      ]),
    ).toThrow(/not allowed/);
    expect(set).not.toHaveBeenCalled();
  });

  it.each([NODE_TYPE_TEXT, NODE_TYPE_COMMENT] as const)(
    'allows text updates on node type %s',
    (type) => {
      const receiver = connected();
      receiver.connection.mutate([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {id: 'text', type, data: 'Before'},
          0,
        ],
        [MUTATION_TYPE_UPDATE_TEXT, 'text', 'After'],
      ]);
      expect((receiver.root.firstChild as Text | Comment).data).toBe('After');
    },
  );

  it('does not invoke retain or release for a rejected update', () => {
    const retain = vi.fn();
    const release = vi.fn();
    const receiver = connected({elements: ['ui-button'], retain, release});
    insert(receiver);
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'innerHTML', payload],
      ]),
    ).toThrow();
    expect(retain).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it('snapshots policies instead of accepting later allowlist changes', () => {
    const policy = {
      properties: ['label'],
      attributes: [] as string[],
      methods: [] as string[],
    };
    const elements = {'ui-button': policy};
    const receiver = connected({elements});
    policy.properties.push('innerHTML');
    policy.attributes.push('onclick');
    policy.methods.push('insertAdjacentHTML');
    Object.assign(elements, {script: {}});
    expect(() => insert(receiver, element({element: 'script'}))).toThrow(
      /not allowed/,
    );
    insert(receiver);
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'innerHTML', payload],
      ]),
    ).toThrow(/not allowed/);
    expect(() =>
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          'button',
          'onclick',
          payload,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]),
    ).toThrow(/not allowed/);
    expect(() =>
      receiver.connection.call(
        'button',
        'insertAdjacentHTML',
        'beforeend',
        payload,
      ),
    ).toThrow(/not allowed/);
  });

  it('does not inherit element names from a policy object prototype', () => {
    const elements = Object.assign(Object.create({script: {}}), {
      'ui-button': {},
    });
    const receiver = connected({elements});
    expect(() => insert(receiver, element({element: 'script'}))).toThrow(
      /not allowed/,
    );
    insert(receiver);
  });

  it('rejects undeclared events and unknown update channels', () => {
    const receiver = connected({
      elements: {'ui-button': {properties: ['label']}},
    });
    expect(() =>
      insert(receiver, element({eventListeners: {click: vi.fn()}})),
    ).toThrow(/not allowed/);
    insert(receiver);
    expect(() =>
      receiver.connection.mutate([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          'button',
          'click',
          vi.fn(),
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]),
    ).toThrow(/not allowed/);
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'value', 99 as any],
      ]),
    ).toThrow(/not allowed/);
  });

  it('rejects reserved IDs, duplicate IDs, and attempts to change an existing node policy', () => {
    const receiver = connected({
      elements: {'ui-button': {}, 'ui-other': {properties: ['innerHTML']}},
    });
    expect(() => insert(receiver, element({id: ROOT_ID}))).toThrow(
      /not allowed/,
    );
    expect(() => insert(receiver, element({children: [element()]}))).toThrow(
      /not allowed/,
    );
    insert(receiver);
    expect(() => insert(receiver, element({element: 'ui-other'}))).toThrow(
      /not allowed/,
    );
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'innerHTML', payload],
      ]),
    ).toThrow(/not allowed/);
  });

  it('does not use mutable host properties to select a policy', () => {
    const receiver = connected({
      elements: {'ui-button': {}, 'ui-other': {properties: ['innerHTML']}},
    });
    insert(receiver);
    Object.defineProperty(receiver.root.firstChild, 'localName', {
      value: 'ui-other',
    });
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'innerHTML', payload],
      ]),
    ).toThrow(/not allowed/);
  });

  it('allows prototype-named event types without reading inherited listener entries', () => {
    const listener = vi.fn();
    const receiver = connected({
      elements: {'ui-button': {eventListeners: ['__proto__', 'constructor']}},
    });
    insert(
      receiver,
      element({
        eventListeners: {['__proto__']: listener, constructor: listener},
      }),
    );
    const button = receiver.root.firstChild!;
    button.dispatchEvent(new CustomEvent('__proto__'));
    button.dispatchEvent(new CustomEvent('constructor'));
    expect(listener).toHaveBeenCalledTimes(2);
    receiver.connection.mutate([
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'button',
        '__proto__',
        null,
        UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
      ],
    ]);
    button.dispatchEvent(new CustomEvent('__proto__'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps explicit call callbacks authoritative', () => {
    const call = vi.fn((_element, method, ...args) => {
      if (method !== 'hostAction') throw new Error('Method is not allowed');
      return args[0];
    });
    const receiver = connected({elements: ['ui-button'], call});
    insert(receiver);
    expect(receiver.connection.call('button', 'hostAction', 'result')).toBe(
      'result',
    );
    expect(call).toHaveBeenCalledWith(
      receiver.root.firstChild,
      'hostAction',
      'result',
    );
    expect(() =>
      receiver.connection.call('button', 'insertAdjacentHTML'),
    ).toThrow(/not allowed/);
  });
});
