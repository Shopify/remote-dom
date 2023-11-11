import '../polyfill.ts';
import {describe, it, expect} from '@quilted/testing';

import {
  RemoteElement,
  createRemoteElement,
  remoteProperties,
  remoteProperty,
  RemoteRootElement,
  type RemoteElementConstructor,
} from '../elements.ts';
import {RemoteReceiver} from '../receiver/basic.ts';
import {REMOTE_ID, MUTATION_TYPE_UPDATE_PROPERTY} from '../constants.ts';

describe('RemoteElement', () => {
  describe('properties', () => {
    it('serializes initial properties declared with a static `remoteProperties` field', () => {
      class HelloElement extends RemoteElement {
        static remoteProperties = {
          name: {attribute: true},
        };

        name!: string;
      }

      const {root, receiver} = createAndConnectRemoteRootElement();

      const name = 'Winston';
      const element = new HelloElement();
      element.name = name;

      expect(receiver.receive).not.toHaveBeenCalled();

      root.append(element);

      expect(receiver.root.children).toStrictEqual([
        {
          type: 1,
          id: expect.any(String),
          element: expect.any(String),
          version: 0,
          children: [],
          properties: {name},
        },
      ]);
    });

    it('sends updates to properties declared with a static `remoteProperties` field', () => {
      class HelloElement extends RemoteElement {
        static remoteProperties = {
          name: {attribute: true},
        };

        name!: string;
      }

      const {element, receiver} = createAndConnectRemoteElement(HelloElement);

      const name = 'Winston';
      element.name = name;

      expect(receiver.receive).toHaveBeenLastCalledWith([
        [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
      ]);
    });

    it('sends updates to properties declared with `createRemoteElement()`', () => {
      const HelloElement = createRemoteElement<{name: string}>({
        properties: {name: {attribute: true}},
      });

      const {element, receiver} = createAndConnectRemoteElement(HelloElement);

      const name = 'Winston';
      element.name = name;

      expect(receiver.receive).toHaveBeenLastCalledWith([
        [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
      ]);
    });

    it('sends updates to properties declared with the `@remoteProperties()` decorator', () => {
      @remoteProperties({
        name: {attribute: true},
      })
      class HelloElement extends RemoteElement<{name: string}> {
        name!: string;
      }

      const {element, receiver} = createAndConnectRemoteElement(HelloElement);

      const name = 'Winston';
      element.name = name;

      expect(receiver.receive).toHaveBeenLastCalledWith([
        [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
      ]);
    });

    it('sends updates to properties declared with the `@remoteProperty()` decorator', () => {
      class HelloElement extends RemoteElement {
        @remoteProperty()
        accessor name!: string;
      }

      const {element, receiver} = createAndConnectRemoteElement(HelloElement);

      const name = 'Winston';
      element.name = name;

      expect(receiver.receive).toHaveBeenLastCalledWith([
        [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
      ]);
    });

    it('serializes initial properties declared with the `@remoteProperty()` decorator', () => {
      const name = 'Winston';
      class HelloElement extends RemoteElement {
        @remoteProperty()
        accessor name = name;
      }

      const {root, receiver} = createAndConnectRemoteRootElement();

      const element = new HelloElement();
      element.name = name;

      expect(receiver.receive).not.toHaveBeenCalled();

      root.append(element);

      expect(receiver.root.children).toStrictEqual([
        {
          type: 1,
          id: expect.any(String),
          element: expect.any(String),
          version: 0,
          children: [],
          properties: {name},
        },
      ]);
    });

    describe('attribute reflection', () => {
      it('reflects the value of a remote property from a matching attribute by default', () => {
        const ProductElement = createRemoteElement<{name: string}>({
          properties: {name: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const name = 'Fiddle leaf fig';
        element.setAttribute('name', name);

        expect(element.name).toBe(name);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
        ]);
      });

      it('reflects the value of a remote property from a matching attribute when explicitly enabled', () => {
        const ProductElement = createRemoteElement<{name: string}>({
          properties: {name: {attribute: true}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const name = 'Fiddle leaf fig';
        element.setAttribute('name', name);

        expect(element.name).toBe(name);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
        ]);
      });

      it('does not reflect the value of a remote property from a matching attribute when explicitly disabled', () => {
        const ProductElement = createRemoteElement<{name: string}>({
          properties: {name: {attribute: false}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const name = 'Fiddle leaf fig';
        element.setAttribute('name', name);

        expect(element.name).toBe(undefined);
        expect(receiver.receive).not.toHaveBeenLastCalledWith([
          [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
        ]);
      });

      it('unsets the value of a remote property when a matching attribute is removed', () => {
        const ProductElement = createRemoteElement<{name: string}>({
          properties: {name: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const name = 'Fiddle leaf fig';
        element.setAttribute('name', name);
        element.removeAttribute('name');

        expect(element.name).toBe(undefined);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', undefined],
        ]);
      });

      it('reflects the value of a camel-cased remote property from a dash-cased attribute', () => {
        const ProductElement = createRemoteElement<{updatedAt: string}>({
          properties: {updatedAt: {attribute: true}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const updatedAt = new Date().toISOString();
        element.setAttribute('updated-at', updatedAt);

        expect(element.updatedAt).toBe(updatedAt);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'updatedAt',
            updatedAt,
          ],
        ]);
      });

      it('reflects the value of a remote property from a custom attribute name', () => {
        const attribute = 'updated';
        const ProductElement = createRemoteElement<{updatedAt: string}>({
          properties: {updatedAt: {attribute}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const updatedAt = new Date().toISOString();
        element.setAttribute(attribute, updatedAt);

        expect(element.updatedAt).toBe(updatedAt);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'updatedAt',
            updatedAt,
          ],
        ]);
      });

      it('parses the value of a remote property from a matching attribute using a number type', () => {
        const ProductElement = createRemoteElement<{inventory: number}>({
          properties: {inventory: {type: Number}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const inventory = 42;
        element.setAttribute('inventory', String(inventory));

        expect(element.inventory).toBe(inventory);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'inventory',
            inventory,
          ],
        ]);

        element.removeAttribute('inventory');

        expect(element.inventory).toBe(undefined);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'inventory',
            undefined,
          ],
        ]);
      });

      it('parses the value of a remote property from a matching attribute using an object type', () => {
        const ProductElement = createRemoteElement<{collection: {id: string}}>({
          properties: {collection: {type: Object}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const collection = {id: '1'};
        element.setAttribute('collection', JSON.stringify(collection));

        expect(element.collection).toStrictEqual(collection);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            collection,
          ],
        ]);

        element.removeAttribute('collection');

        expect(element.collection).toBe(undefined);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            undefined,
          ],
        ]);
      });

      it('parses the value of a remote property from a matching attribute using an object type that can’t be parsed as JSON', () => {
        const ProductElement = createRemoteElement<{collection: {id: string}}>({
          properties: {collection: {type: Object}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        element.setAttribute('collection', 'foo');

        expect(element.collection).toBe(undefined);
        expect(receiver.receive).not.toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            expect.anything(),
          ],
        ]);
      });

      it('parses the value of a remote property from a matching attribute using an array type', () => {
        const ProductElement = createRemoteElement<{
          collections: {id: string}[];
        }>({
          properties: {collections: {type: Array}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        const collections = [{id: '1'}];
        element.setAttribute('collections', JSON.stringify(collections));

        expect(element.collections).toStrictEqual(collections);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collections',
            collections,
          ],
        ]);

        element.removeAttribute('collections');

        expect(element.collections).toBe(undefined);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collections',
            undefined,
          ],
        ]);
      });

      it('parses the value of a remote property from a matching attribute using an array type that can’t be parsed as JSON', () => {
        const ProductElement = createRemoteElement<{
          collections: {id: string}[];
        }>({
          properties: {collections: {type: Array}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ProductElement);

        element.setAttribute('collections', 'foo');

        expect(element.collections).toBe(undefined);
        expect(receiver.receive).not.toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            expect.anything(),
          ],
        ]);
      });

      it('parses the value for a remote property from an attribute using a custom type', () => {
        const attributePrefix = 'From attribute: ';

        class TestElement extends RemoteElement {
          static remoteProperties = {
            myField: {
              attribute: true,
              type: {
                parse(value: unknown) {
                  return `${attributePrefix}${value}`;
                },
              },
            },
          };

          myField!: string;
        }

        const {element, receiver} = createAndConnectRemoteElement(TestElement);

        const value = 'Hello world';
        element.setAttribute('my-field', value);

        expect(element.myField).toBe(`${attributePrefix}${value}`);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'myField',
            `${attributePrefix}${value}`,
          ],
        ]);
      });
    });

    describe('event listeners', () => {
      it('does not create a property for an unrecognized event', () => {
        const ButtonElement = createRemoteElement<{
          onPress(): void;
          press: boolean;
        }>({
          properties: {
            press: {},
            onPress: {event: false},
          },
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('press', listener);

        expect(element.onPress).toBe(undefined);
        expect(receiver.receive).not.toHaveBeenCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            expect.anything(),
            expect.anything(),
            expect.anything(),
          ],
        ]);
      });

      it('proxies event listeners for the inferred event name of an `onX` property by default', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('press', listener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            element.onPress,
          ],
        ]);
      });

      it('proxies event listeners for a property that is declared as an event listener', () => {
        const ButtonElement = createRemoteElement<{press(): void}>({
          properties: {press: {event: true}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('press', listener);

        expect(element.press).toBeInstanceOf(Function);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'press',
            element.press,
          ],
        ]);
      });

      it('proxies event listeners to a custom event name', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {event: 'click'}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('click', listener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            element.onPress,
          ],
        ]);
      });

      it('proxies event listeners to kebab-cased event names', () => {
        const ButtonElement = createRemoteElement<{onMouseEnter(): void}>({
          properties: {onMouseEnter: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('mouse-enter', listener);

        expect(element.onMouseEnter).toBeInstanceOf(Function);
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onMouseEnter',
            element.onMouseEnter,
          ],
        ]);
      });

      it('calls event listeners with a CustomEvent containing a single function argument as the detail', () => {
        const ButtonElement = createRemoteElement<{onPress(detail: any): void}>(
          {
            properties: {onPress: {}},
          },
        );

        const {element} = createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('press', listener);

        const detail = {hello: 'world'};

        element.onPress(detail);

        expect(listener).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({type: 'press', detail}),
        );
      });

      it('calls event listeners with a CustomEvent containing multiple function argument as the detail', () => {
        const ButtonElement = createRemoteElement<{
          onPress(...detail: any[]): void;
        }>({
          properties: {onPress: {}},
        });

        const {element} = createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        element.addEventListener('press', listener);

        const detail = ['123', {hello: 'world'}];

        element.onPress(...detail);

        expect(listener).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({type: 'press', detail}),
        );
      });

      it('removes an event listener property when the last event listener is removed', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const firstListener = jest.fn();
        const secondListener = jest.fn();

        element.addEventListener('press', firstListener);

        receiver.receive.mockClear();

        element.addEventListener('press', secondListener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.receive).not.toHaveBeenCalled();

        element.removeEventListener('press', secondListener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.receive).not.toHaveBeenCalled();

        element.removeEventListener('press', firstListener);

        expect(element.onPress).toBeUndefined();
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            undefined,
          ],
        ]);
      });

      it('removes an event listener property declared with once', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();

        element.addEventListener('press', listener, {once: true});

        element.onPress();

        expect(element.onPress).toBeUndefined();
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            undefined,
          ],
        ]);
      });

      it('removes an event listener property declared with an abort signal', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = jest.fn();
        const abort = new AbortController();

        element.addEventListener('press', listener, {signal: abort.signal});

        abort.abort();

        expect(element.onPress).toBeUndefined();
        expect(receiver.receive).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            undefined,
          ],
        ]);
      });
    });
  });
});

class TestRemoteReceiver extends RemoteReceiver {
  readonly receive: RemoteReceiver['receive'] &
    jest.Mock<
      ReturnType<RemoteReceiver['receive']>,
      Parameters<RemoteReceiver['receive']>
    > = jest.fn(super.receive);
}

function createAndConnectRemoteElement<
  ElementType extends RemoteElementConstructor,
>(ElementConstructor: ElementType) {
  const {receiver, root} = createAndConnectRemoteRootElement();
  const element = new ElementConstructor() as InstanceType<ElementType>;
  root.append(element);
  return {root, element, receiver};
}

function remoteId(node: any) {
  return (node as any)[REMOTE_ID];
}

function createAndConnectRemoteRootElement() {
  const root = new RemoteRootElement() as RemoteRootElement;
  const receiver = new TestRemoteReceiver();
  root.connect(receiver.receive);
  return {root, receiver};
}
