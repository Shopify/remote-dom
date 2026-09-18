// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest';
import {DOMRemoteReceiver} from '../DOMRemoteReceiver.ts';
import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
} from '../../constants.ts';

function insert(
  receiver: DOMRemoteReceiver,
  properties = {},
  attributes = {},
  element = 'ui-button',
) {
  receiver.connection.mutate([
    [
      MUTATION_TYPE_INSERT_CHILD,
      ROOT_ID,
      {
        id: 'button',
        type: NODE_TYPE_ELEMENT,
        element,
        properties,
        attributes,
        children: [],
      },
      0,
    ],
  ]);
}

class CompatibilityButton extends HTMLElement {
  label = '';
  disabled = false;
  activate(value: string) {
    return value;
  }
  set content(value: string) {
    this.innerHTML = value;
  }
  renderMarkup(value: string) {
    this.innerHTML = value;
  }
}
customElements.define('compatibility-button', CompatibilityButton);

describe('DOMRemoteReceiver compatibility defaults', () => {
  it.each([undefined, ['ui-button']])(
    'preserves ordinary properties and attributes with elements %j',
    (elements) => {
      const receiver = new DOMRemoteReceiver({elements});
      insert(
        receiver,
        {label: 'Hello', disabled: true},
        {primary: '', 'aria-label': 'Hello'},
      );
      const button = receiver.root.firstChild as HTMLElement & {
        label: string;
        disabled: boolean;
      };
      expect(button.label).toBe('Hello');
      expect(button.disabled).toBe(true);
      expect(button.hasAttribute('primary')).toBe(true);
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'Updated'],
      ]);
      expect(button.label).toBe('Updated');
    },
  );

  it('supports per-element property definitions and additional attributes', () => {
    const receiver = new DOMRemoteReceiver({
      elements: {
        'ui-button': {
          properties: {disabled: {type: 'boolean'}, label: {type: 'string'}},
          attributes: ['primary'],
        },
      },
    });
    insert(receiver, {disabled: false, label: 'Hello'}, {primary: ''});
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'internalState', true],
      ]),
    ).toThrow(/not allowed/);
    receiver.connection.mutate([
      [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'Updated'],
    ]);
  });

  it.each([
    'innerHTML',
    'outerHTML',
    'srcdoc',
    'onerror',
    'ONCLICK',
    'onxyz',
    '__proto__',
    'constructor',
    'appendChild',
    'setAttribute',
    '__defineSetter__',
  ])(
    'blocks initial and updated %s properties without configuration',
    (name) => {
      const receiver = new DOMRemoteReceiver();
      expect(() => insert(receiver, {[name]: 'value'})).toThrow(/not allowed/);
      insert(receiver);
      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_PROPERTY, 'button', name, 'value'],
        ]),
      ).toThrow(/not allowed/);
    },
  );

  it.each(['onclick', 'OnErRoR', 'onxyz', 'srcdoc', 'is'])(
    'blocks initial and updated %s attributes without configuration',
    (name) => {
      const receiver = new DOMRemoteReceiver();
      expect(() => insert(receiver, {}, {[name]: 'value'})).toThrow(
        /not allowed/,
      );
      insert(receiver);
      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            'button',
            name,
            'value',
            UPDATE_PROPERTY_TYPE_ATTRIBUTE,
          ],
        ]),
      ).toThrow(/not allowed/);
    },
  );

  it('adds host exclusions without replacing built-in defaults or retaining rejected values', () => {
    const blockedProperties = ['internalState'];
    const retain = vi.fn();
    const receiver = new DOMRemoteReceiver({
      blockedProperties,
      retain,
      elements: {
        'ui-button': {
          properties: {label: {}, internalState: {}, innerHTML: {}},
        },
      },
    });
    blockedProperties.length = 0;
    for (const property of ['internalState', 'innerHTML']) {
      expect(() => insert(receiver, {[property]: 'value'})).toThrow(
        /not allowed/,
      );
    }
    expect(() => insert(receiver, {}, {INTERNALSTATE: 'value'})).toThrow(
      /not allowed/,
    );
    expect(retain).not.toHaveBeenCalled();
    insert(receiver);
    for (const property of ['internalState', 'innerHTML']) {
      expect(() =>
        receiver.connection.mutate([
          [MUTATION_TYPE_UPDATE_PROPERTY, 'button', property, 'value'],
        ]),
      ).toThrow(/not allowed/);
    }
    expect(retain).not.toHaveBeenCalled();
  });

  it('keeps additional exclusions separate for each receiver', () => {
    const restricted = new DOMRemoteReceiver({
      elements: ['ui-button'],
      blockedProperties: ['LABEL'],
    });
    const ordinary = new DOMRemoteReceiver({elements: ['ui-button']});
    expect(() => insert(restricted, {label: 'Restricted'})).toThrow(
      /not allowed/,
    );
    expect(() => insert(restricted, {}, {label: 'Restricted'})).toThrow(
      /not allowed/,
    );
    insert(ordinary, {label: 'Allowed'});
    expect(
      (ordinary.root.firstChild as HTMLElement & {label: string}).label,
    ).toBe('Allowed');
    expect(() =>
      ordinary.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'innerHTML', 'value'],
      ]),
    ).toThrow(/not allowed/);
  });

  it('preserves custom methods and focus, but rejects inherited DOM methods', () => {
    const receiver = new DOMRemoteReceiver({
      elements: ['compatibility-button'],
    });
    insert(receiver, {}, {}, 'compatibility-button');
    expect(receiver.connection.call('button', 'activate', 'result')).toBe(
      'result',
    );
    expect(() => receiver.connection.call('button', 'focus')).not.toThrow();
    for (const method of [
      'insertAdjacentHTML',
      'setAttribute',
      'append',
      'replaceChildren',
      'attachShadow',
      'getRootNode',
      '__lookupGetter__',
    ]) {
      expect(() => receiver.connection.call('button', method)).toThrow(
        /not allowed/,
      );
    }
  });

  it('applies host restrictions to custom setters and methods', () => {
    const receiver = new DOMRemoteReceiver({
      elements: {'compatibility-button': {methods: ['activate']}},
      blockedProperties: ['content'],
    });
    expect(() =>
      insert(receiver, {content: '<b>content</b>'}, {}, 'compatibility-button'),
    ).toThrow(/not allowed/);
    insert(receiver, {}, {}, 'compatibility-button');
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'content', '<b>content</b>'],
      ]),
    ).toThrow(/not allowed/);
    expect(() =>
      receiver.connection.call('button', 'renderMarkup', '<b>content</b>'),
    ).toThrow(/not allowed/);
    expect(receiver.root.firstChild?.childNodes).toHaveLength(0);
    expect(receiver.connection.call('button', 'activate', 'result')).toBe(
      'result',
    );
  });

  it.each([
    ['form', 'requestSubmit'],
    ['select', 'add'],
    ['input', 'showPicker'],
  ])('rejects native %s.%s without invoking it', (element, method) => {
    const receiver = new DOMRemoteReceiver({elements: [element]});
    insert(receiver, {}, {}, element);
    expect(() => receiver.connection.call('button', method)).toThrow(
      /not allowed/,
    );
  });

  it('does not allow member lists to opt back into built-in excluded methods', () => {
    const receiver = new DOMRemoteReceiver({
      elements: {'ui-button': {methods: ['insertAdjacentHTML']}},
    });
    insert(receiver);
    expect(() =>
      receiver.connection.call(
        'button',
        'insertAdjacentHTML',
        'beforeend',
        '<img>',
      ),
    ).toThrow(/not allowed/);
  });

  it('keeps omitted and empty element configurations distinct', () => {
    const receiver = new DOMRemoteReceiver();
    insert(receiver, {}, {}, 'div');
    expect((receiver.root.firstChild as Element).localName).toBe('div');
    expect(() => insert(new DOMRemoteReceiver({elements: []}))).toThrow(
      /not allowed/,
    );
  });
});
