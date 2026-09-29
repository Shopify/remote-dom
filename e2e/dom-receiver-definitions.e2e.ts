import {resolve} from 'node:path';
import {test, expect} from '@playwright/test';

const receiverModule = `/@fs/${resolve('packages/core/source/receivers/DOMRemoteReceiver.ts')}`;
const constantsModule = `/@fs/${resolve('packages/core/source/constants.ts')}`;

test.beforeEach(async ({page}) => {
  await page.route('**/receiver-definitions-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>',
    }),
  );
  await page.goto('/receiver-definitions-test');
});

test('validates property types before constructing elements or updating setters', async ({
  page,
}) => {
  const result = await page.evaluate(
    async ({receiverModule, constantsModule}) => {
      const {DOMRemoteReceiver} = await import(receiverModule);
      const C = await import(constantsModule);
      let constructed = 0;
      const assigned: unknown[] = [];
      const retained: unknown[] = [];
      customElements.define(
        'typed-button',
        class extends HTMLElement {
          constructor() {
            super();
            constructed++;
          }
          set label(value: unknown) {
            assigned.push(value);
          }
        },
      );
      const root = document.body.appendChild(document.createElement('div'));
      const receiver = new DOMRemoteReceiver({
        root,
        retain: (value: unknown) => retained.push(value),
        elements: {
          'typed-button': {
            properties: {
              label: {type: 'string'},
              disabled: {type: 'boolean'},
              count: {type: 'number'},
            },
          },
        },
      });
      const node = {
        id: 'button',
        type: C.NODE_TYPE_ELEMENT,
        element: 'typed-button',
        children: [],
      };
      const insert = (properties: object) =>
        receiver.connection.mutate([
          [C.MUTATION_TYPE_INSERT_CHILD, C.ROOT_ID, {...node, properties}, 0],
        ]);
      const errors: string[] = [];
      try {
        insert({label: 'Before', disabled: 'false'});
      } catch (error) {
        errors.push(String(error));
      }
      const before = {
        constructed,
        assigned: assigned.length,
        retained: retained.length,
        children: root.childNodes.length,
      };
      insert({label: 'Before', disabled: false, count: 0});
      const retainedBeforeUpdates = retained.length;
      for (const [name, value] of [
        ['label', 1],
        ['disabled', 'false'],
        ['count', '1'],
      ]) {
        try {
          receiver.connection.mutate([
            [C.MUTATION_TYPE_UPDATE_PROPERTY, 'button', name, value],
          ]);
        } catch (error) {
          errors.push(String(error));
        }
      }
      const retainedAfterUpdates = retained.length;
      receiver.connection.mutate([
        [C.MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'label', 'After'],
      ]);
      const button = root.firstElementChild as HTMLElement & {
        disabled: boolean;
        count: number;
      };
      return {
        before,
        errors,
        constructed,
        assigned,
        retainedBeforeUpdates,
        retainedAfterUpdates,
        disabled: button.disabled,
        count: button.count,
      };
    },
    {receiverModule, constantsModule},
  );
  expect(result.before).toEqual({
    constructed: 0,
    assigned: 0,
    retained: 0,
    children: 0,
  });
  expect(result.errors).toHaveLength(4);
  for (const error of result.errors) expect(error).toContain('not allowed');
  expect(result.constructed).toBe(1);
  expect(result.assigned).toEqual(['Before', 'After']);
  expect(result.retainedAfterUpdates).toBe(result.retainedBeforeUpdates);
  expect(result.disabled).toBe(false);
  expect(result.count).toBe(0);
});

test('supports attribute aliases, raw event names, and selected methods without reflection', async ({
  page,
}) => {
  const result = await page.evaluate(
    async ({receiverModule, constantsModule}) => {
      const {DOMRemoteReceiver} = await import(receiverModule);
      const C = await import(constantsModule);
      let focused = 0;
      customElements.define(
        'typed-button',
        class extends HTMLElement {
          label = '';
          disabled = false;
          focus() {
            focused++;
          }
        },
      );
      const root = document.body.appendChild(document.createElement('div'));
      const receiver = new DOMRemoteReceiver({
        root,
        elements: {
          'typed-button': {
            properties: {
              disabled: {type: 'boolean'},
              label: {type: 'string', attribute: 'accessible-label'},
            },
            attributes: ['slot'],
            events: {click: {}},
            methods: ['focus'],
          },
        },
      });
      const clicks: unknown[] = [];
      receiver.connection.mutate([
        [
          C.MUTATION_TYPE_INSERT_CHILD,
          C.ROOT_ID,
          {
            id: 'button',
            type: C.NODE_TYPE_ELEMENT,
            element: 'typed-button',
            children: [],
            properties: {label: 'Property label', disabled: false},
            attributes: {
              'accessible-label': 'Attribute label',
              disabled: 'false',
              slot: 'main',
            },
            eventListeners: {click: (detail: unknown) => clicks.push(detail)},
          },
          0,
        ],
      ]);
      const button = root.firstElementChild as HTMLElement & {
        label: string;
        disabled: boolean;
      };
      button.dispatchEvent(new CustomEvent('click', {detail: 'first'}));
      receiver.connection.call('button', 'focus');
      const update = (
        name: string,
        value: unknown,
        type = C.UPDATE_PROPERTY_TYPE_PROPERTY,
      ) =>
        receiver.connection.mutate([
          [C.MUTATION_TYPE_UPDATE_PROPERTY, 'button', name, value, type],
        ]);
      const before = {
        label: button.label,
        disabled: button.disabled,
        attribute: button.getAttribute('accessible-label'),
        booleanAttribute: button.getAttribute('disabled'),
        slot: button.getAttribute('slot'),
      };
      update('label', 'Updated property');
      const attributeAfterPropertyUpdate =
        button.getAttribute('accessible-label');
      update(
        'accessible-label',
        'Updated attribute',
        C.UPDATE_PROPERTY_TYPE_ATTRIBUTE,
      );
      const propertyAfterAttributeUpdate = button.label;
      update('disabled', null, C.UPDATE_PROPERTY_TYPE_ATTRIBUTE);
      update('click', null, C.UPDATE_PROPERTY_TYPE_EVENT_LISTENER);
      button.dispatchEvent(new CustomEvent('click', {detail: 'second'}));
      const errors: string[] = [];
      for (const action of [
        () => update('accessible-label', 'value'),
        () => update('label', 'value', C.UPDATE_PROPERTY_TYPE_ATTRIBUTE),
        () => update('change', () => {}, C.UPDATE_PROPERTY_TYPE_EVENT_LISTENER),
        () => receiver.connection.call('button', 'blur'),
      ]) {
        try {
          action();
        } catch (error) {
          errors.push(String(error));
        }
      }
      return {
        before,
        attributeAfterPropertyUpdate,
        propertyAfterAttributeUpdate,
        removed: !button.hasAttribute('disabled'),
        clicks,
        focused,
        errors,
      };
    },
    {receiverModule, constantsModule},
  );
  expect(result.before).toEqual({
    label: 'Property label',
    disabled: false,
    attribute: 'Attribute label',
    booleanAttribute: 'false',
    slot: 'main',
  });
  expect(result.attributeAfterPropertyUpdate).toBe('Attribute label');
  expect(result.propertyAfterAttributeUpdate).toBe('Updated property');
  expect(result.removed).toBe(true);
  expect(result.clicks).toEqual(['first']);
  expect(result.focused).toBe(1);
  expect(result.errors).toHaveLength(4);
  for (const error of result.errors) expect(error).toContain('not allowed');
});
