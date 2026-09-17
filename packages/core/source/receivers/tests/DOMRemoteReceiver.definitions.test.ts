// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest';
import {
  DOMRemoteReceiver,
  type DOMRemoteElementPolicy,
  type DOMRemotePropertyPolicy,
} from '../../receivers.ts';
import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../../constants.ts';

function create(policy: DOMRemoteElementPolicy) {
  return new DOMRemoteReceiver({elements: {'ui-field': policy}});
}

function insert(receiver: DOMRemoteReceiver, properties = {}, attributes = {}) {
  receiver.connection.mutate([
    [
      MUTATION_TYPE_INSERT_CHILD,
      ROOT_ID,
      {
        id: 'field',
        type: NODE_TYPE_ELEMENT,
        element: 'ui-field',
        properties,
        attributes,
        children: [],
      },
      0,
    ],
  ]);
}

function update(
  receiver: DOMRemoteReceiver,
  name: string,
  value: unknown,
  type:
    | typeof UPDATE_PROPERTY_TYPE_PROPERTY
    | typeof UPDATE_PROPERTY_TYPE_ATTRIBUTE
    | typeof UPDATE_PROPERTY_TYPE_EVENT_LISTENER = UPDATE_PROPERTY_TYPE_PROPERTY,
) {
  receiver.connection.mutate([
    [MUTATION_TYPE_UPDATE_PROPERTY, 'field', name, value, type],
  ]);
}

const types: {
  type: NonNullable<DOMRemotePropertyPolicy['type']>;
  valid: unknown;
  invalid: unknown[];
}[] = [
  {
    type: 'string',
    valid: 'Hello',
    invalid: [1, false, [], {}, new String('Hello')],
  },
  {
    type: 'boolean',
    valid: false,
    invalid: ['false', 0, {}, new Boolean(false)],
  },
  {type: 'number', valid: 0, invalid: ['0', true, [], new Number(0)]},
  {type: 'array', valid: [1, 'two'], invalid: [{length: 0}, '', 0]},
  {type: 'object', valid: {label: 'Hello'}, invalid: [[], 'value', 0]},
  {
    type: 'function',
    valid: () => 'Hello',
    invalid: [{call() {}}, 'function', 0],
  },
];

describe('DOMRemoteReceiver member definitions', () => {
  it.each(types)(
    'validates initial and updated $type properties without coercion',
    ({type, valid, invalid}) => {
      const receiver = create({properties: {value: {type}}});
      for (const value of invalid) {
        expect(() => insert(receiver, {value})).toThrow(/not allowed/);
        expect(receiver.root.childNodes).toHaveLength(0);
      }
      insert(receiver, {value: valid});
      const field = receiver.root.firstChild as any;
      expect(field.value).toBe(valid);
      for (const value of invalid) {
        expect(() => update(receiver, 'value', value)).toThrow(/not allowed/);
        expect(field.value).toBe(valid);
      }
      for (const value of [undefined, null, valid]) {
        update(receiver, 'value', value);
        expect(field.value).toBe(value);
      }
    },
  );

  it.each(types)(
    'accepts nullish initial $type property values unchanged',
    ({type}) => {
      for (const value of [undefined, null]) {
        const receiver = create({properties: {value: {type}}});
        insert(receiver, {value});
        expect((receiver.root.firstChild as any).value).toBe(value);
      }
    },
  );

  it('keeps an omitted type unconstrained', () => {
    const receiver = create({properties: {value: {}}});
    insert(receiver, {value: 'Hello'});
    for (const value of [false, 1, {}, [], () => {}, null, undefined]) {
      update(receiver, 'value', value);
      expect((receiver.root.firstChild as any).value).toBe(value);
    }
  });

  it('validates nested types before constructing nodes or retaining values', () => {
    const retain = vi.fn();
    const receiver = new DOMRemoteReceiver({
      elements: {'ui-field': {properties: {value: {type: 'boolean'}}}},
      retain,
    });
    const construct = vi.spyOn(document, 'createElement');
    try {
      expect(() =>
        receiver.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            {
              id: 'parent',
              type: NODE_TYPE_ELEMENT,
              element: 'ui-field',
              properties: {value: true},
              children: [
                {
                  id: 'child',
                  type: NODE_TYPE_ELEMENT,
                  element: 'ui-field',
                  properties: {value: 'false'},
                  children: [],
                },
              ],
            },
            0,
          ],
        ]),
      ).toThrow(/not allowed/);
      expect(construct).not.toHaveBeenCalled();
      expect(retain).not.toHaveBeenCalled();
    } finally {
      construct.mockRestore();
    }
  });

  it('does not call setters, retain, release, or coercion hooks for a rejected type', () => {
    const retain = vi.fn();
    const release = vi.fn();
    const receiver = new DOMRemoteReceiver({
      elements: {'ui-field': {properties: {value: {type: 'string'}}}},
      retain,
      release,
    });
    insert(receiver, {value: 'Before'});
    retain.mockClear();
    release.mockClear();
    const set = vi.fn();
    Object.defineProperty(receiver.root.firstChild, 'value', {set});
    const toString = vi.fn(() => 'After');
    expect(() => update(receiver, 'value', {toString})).toThrow(/not allowed/);
    expect(set).not.toHaveBeenCalled();
    expect(retain).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
    expect(toString).not.toHaveBeenCalled();
  });

  it('authorizes default, explicit, and additional attribute names without reflecting properties', () => {
    const receiver = create({
      properties: {
        disabled: {type: 'boolean'},
        label: {type: 'string', attribute: 'accessible-label'},
        tabIndex: {type: 'number', attribute: true},
        value: {attribute: false},
      },
      attributes: ['slot'],
    });
    insert(
      receiver,
      {disabled: false, label: 'Property label'},
      {
        disabled: '',
        'accessible-label': 'Attribute label',
        'tab-index': '2',
        slot: 'main',
      },
    );
    const field = receiver.root.firstChild as HTMLElement & {
      label: string;
      disabled: boolean;
    };
    expect(field.label).toBe('Property label');
    expect(field.disabled).toBe(false);
    expect(field.getAttribute('accessible-label')).toBe('Attribute label');
    expect(field.hasAttribute('label')).toBe(false);
    expect(field.getAttribute('slot')).toBe('main');
    update(receiver, 'disabled', 'false', UPDATE_PROPERTY_TYPE_ATTRIBUTE);
    expect(field.getAttribute('disabled')).toBe('false');
    expect(field.disabled).toBe(false);
    update(receiver, 'label', 'Updated');
    expect(field.getAttribute('accessible-label')).toBe('Attribute label');
    update(
      receiver,
      'accessible-label',
      'Updated attribute',
      UPDATE_PROPERTY_TYPE_ATTRIBUTE,
    );
    expect(field.label).toBe('Updated');
    for (const name of ['label', 'value', 'unlisted']) {
      expect(() =>
        update(receiver, name, '', UPDATE_PROPERTY_TYPE_ATTRIBUTE),
      ).toThrow(/not allowed/);
    }
    expect(() => update(receiver, 'accessible-label', 'value')).toThrow(
      /not allowed/,
    );
    expect(() => update(receiver, 'slot', 'other')).toThrow(/not allowed/);
    for (const value of [null, undefined]) {
      update(receiver, 'disabled', '', UPDATE_PROPERTY_TYPE_ATTRIBUTE);
      update(receiver, 'disabled', value, UPDATE_PROPERTY_TYPE_ATTRIBUTE);
      expect(field.hasAttribute('disabled')).toBe(false);
    }
  });

  it('does not convert raw attribute values to strings', () => {
    const receiver = create({properties: {disabled: {type: 'boolean'}}});
    for (const value of [false, 1, {}, []]) {
      expect(() => insert(receiver, {}, {disabled: value})).toThrow(
        /not allowed/,
      );
    }
    insert(receiver, {}, {disabled: ''});
    expect(() =>
      update(receiver, 'disabled', false, UPDATE_PROPERTY_TYPE_ATTRIBUTE),
    ).toThrow(/not allowed/);
    expect((receiver.root.firstChild as Element).getAttribute('disabled')).toBe(
      '',
    );
  });

  it('keeps omitted channels distinct from empty maps and lists', () => {
    const receiver = create({
      properties: {},
      attributes: ['slot'],
      events: {},
      methods: [],
    });
    insert(receiver, {}, {slot: 'main'});
    expect(() => update(receiver, 'value', 1)).toThrow(/not allowed/);
    expect(() =>
      update(receiver, 'title', 'Hello', UPDATE_PROPERTY_TYPE_ATTRIBUTE),
    ).toThrow(/not allowed/);
    expect(() =>
      update(receiver, 'click', vi.fn(), UPDATE_PROPERTY_TYPE_EVENT_LISTENER),
    ).toThrow(/not allowed/);
    expect(() => receiver.connection.call('field', 'focus')).toThrow(
      /not allowed/,
    );
    const defaults = create({});
    insert(defaults, {value: 1}, {title: 'Hello'});
    expect(() => defaults.connection.call('field', 'focus')).not.toThrow();
  });

  it('snapshots nested definitions, derived attributes, and event keys', () => {
    const value: {
      type: DOMRemotePropertyPolicy['type'];
      attribute: string | boolean;
    } = {type: 'string', attribute: 'value-label'};
    const properties: Record<string, DOMRemotePropertyPolicy> = {value};
    const events: Record<string, Record<string, never>> = {click: {}};
    const receiver = create({properties, events});
    value.type = 'boolean';
    value.attribute = 'other-label';
    properties.other = {};
    delete events.click;
    events.change = {};
    insert(receiver, {value: 'Hello'}, {'value-label': 'Hello'});
    expect(() => update(receiver, 'value', false)).toThrow(/not allowed/);
    expect(() => update(receiver, 'other', 'value')).toThrow(/not allowed/);
    expect(() =>
      update(receiver, 'other-label', 'value', UPDATE_PROPERTY_TYPE_ATTRIBUTE),
    ).toThrow(/not allowed/);
    const click = vi.fn();
    update(receiver, 'click', click, UPDATE_PROPERTY_TYPE_EVENT_LISTENER);
    receiver.root.firstChild!.dispatchEvent(
      new CustomEvent('click', {detail: 'value'}),
    );
    expect(click).toHaveBeenCalledWith('value');
    expect(() =>
      update(receiver, 'change', vi.fn(), UPDATE_PROPERTY_TYPE_EVENT_LISTENER),
    ).toThrow(/not allowed/);
  });

  it('does not inherit property or event names from definition prototypes', () => {
    const receiver = create({
      properties: Object.assign(Object.create({inherited: {}}), {label: {}}),
      events: Object.create({click: {}}),
    });
    insert(receiver, {label: 'Hello'});
    expect(() => update(receiver, 'inherited', 'value')).toThrow(/not allowed/);
    expect(() =>
      update(receiver, 'click', vi.fn(), UPDATE_PROPERTY_TYPE_EVENT_LISTENER),
    ).toThrow(/not allowed/);
  });

  it('applies default checks to actual attribute aliases as well as properties', () => {
    const receiver = create({
      properties: {
        innerHTML: {type: 'string'},
        value: {type: 'string', attribute: 'onclick'},
        destination: {type: 'string', attribute: 'href'},
      },
    });
    insert(receiver);
    expect(() => update(receiver, 'innerHTML', 'value')).toThrow(/not allowed/);
    expect(() =>
      update(receiver, 'onclick', 'value', UPDATE_PROPERTY_TYPE_ATTRIBUTE),
    ).toThrow(/not allowed/);
    expect(() =>
      update(
        receiver,
        'href',
        'javascript:void 0',
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      ),
    ).toThrow(/not allowed/);
  });
});
