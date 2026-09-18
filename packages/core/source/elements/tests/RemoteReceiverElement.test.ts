// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  NODE_TYPE_ELEMENT,
  ROOT_ID,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
} from '../../constants.ts';
import {RemoteReceiverElement} from '../RemoteReceiverElement.ts';

class ConfiguredReceiver extends RemoteReceiverElement {
  static elements = {'ui-button': {methods: ['focus']}};
}

class TypedReceiver extends RemoteReceiverElement {
  static elements: typeof RemoteReceiverElement.elements = {
    'ui-button': {
      properties: {label: {type: 'string', attribute: 'accessible-label'}},
      events: {click: {}},
    },
  };
}
customElements.define('test-typed-receiver', TypedReceiver);

class ExcludedReceiver extends RemoteReceiverElement {
  static elements = ['ui-button'];
  static blockedProperties = ['internalState'];
}

customElements.define('test-excluded-receiver', ExcludedReceiver);
customElements.define('test-remote-receiver', RemoteReceiverElement);
customElements.define('test-configured-receiver', ConfiguredReceiver);

afterEach(() => document.body.replaceChildren());

function insert(receiver: RemoteReceiverElement, element = 'ui-button') {
  receiver.connection.mutate([
    [
      MUTATION_TYPE_INSERT_CHILD,
      ROOT_ID,
      {id: 'button', type: NODE_TYPE_ELEMENT, element, children: []},
      0,
    ],
  ]);
}

describe('RemoteReceiverElement host policy', () => {
  it('accepts elements but denies root calls by default', () => {
    const receiver = new RemoteReceiverElement();
    document.body.append(receiver);
    insert(receiver);
    expect(() =>
      receiver.connection.call(
        ROOT_ID,
        'insertAdjacentHTML',
        'beforeend',
        '<img>',
      ),
    ).toThrow(/not allowed/);
    expect(receiver.childNodes).toHaveLength(1);
  });

  it('uses the host subclass policy without restoring unrestricted dispatch', () => {
    const receiver = new ConfiguredReceiver();
    document.body.append(receiver);
    expect(() => insert(receiver, 'script')).toThrow(/not allowed/);
    insert(receiver);
    const button = receiver.firstChild as HTMLElement;
    const focus = vi.spyOn(button, 'focus');
    receiver.connection.call('button', 'focus');
    expect(focus).toHaveBeenCalledOnce();
    expect(() =>
      receiver.connection.call(
        'button',
        'insertAdjacentHTML',
        'beforeend',
        '<img>',
      ),
    ).toThrow(/not allowed/);
    expect(button.childNodes).toHaveLength(0);
  });

  it('uses property types, attribute aliases, and events from the host subclass', () => {
    const receiver = new TypedReceiver();
    insert(receiver);
    const click = vi.fn();
    receiver.connection.mutate([
      [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'Property label'],
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'button',
        'accessible-label',
        'Attribute label',
        UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      ],
      [
        MUTATION_TYPE_UPDATE_PROPERTY,
        'button',
        'click',
        click,
        UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
      ],
    ]);
    const button = receiver.firstChild as HTMLElement & {label: string};
    expect(button.label).toBe('Property label');
    expect(button.getAttribute('accessible-label')).toBe('Attribute label');
    button.dispatchEvent(new CustomEvent('click', {detail: 'Clicked'}));
    expect(click).toHaveBeenCalledWith('Clicked');
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 1],
      ]),
    ).toThrow(/not allowed/);
    expect(button.label).toBe('Property label');
  });

  it('uses additional exclusions from the host subclass', () => {
    const receiver = new ExcludedReceiver();
    insert(receiver);
    expect(() =>
      receiver.connection.mutate([
        [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'internalState', 'value'],
      ]),
    ).toThrow(/not allowed/);
    receiver.connection.mutate([
      [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'Hello'],
    ]);
  });

  it('honors callbacks assigned after construction, and restores policy when removed', () => {
    const receiver = new ConfiguredReceiver();
    insert(receiver);
    receiver.call = vi.fn(function (
      this: RemoteReceiverElement,
      _element,
      method,
    ) {
      expect(this).toBe(receiver);
      if (method !== 'hostAction') throw new Error('Method is not allowed');
      return 'result';
    });
    expect(receiver.connection.call('button', 'hostAction')).toBe('result');
    expect(receiver.connection.call(ROOT_ID, 'hostAction')).toBe('result');
    expect(() =>
      receiver.connection.call('button', 'insertAdjacentHTML'),
    ).toThrow(/not allowed/);
    receiver.call = undefined;
    expect(() => receiver.connection.call('button', 'hostAction')).toThrow(
      /not allowed/,
    );
  });
});
