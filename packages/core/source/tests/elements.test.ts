import {describe, expect, it, vi, type MockedObject} from 'vitest';
import '../polyfill.ts';

import {NAME, OWNER_DOCUMENT} from '../../../polyfill/source/constants.ts';
import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../constants.ts';
import {
  createRemoteElement,
  RemoteElement,
  RemoteEvent,
  // remoteProperties,
  // remoteProperty,
  RemoteRootElement,
  type RemoteElementConstructor,
} from '../elements.ts';
import {remoteId} from '../elements/internals.ts';
import {
  RemoteReceiver,
  type RemoteReceiverElement,
} from '../receivers/RemoteReceiver.ts';

describe('RemoteElement', () => {
  describe('properties', () => {
    it('serializes initial properties declared with a static `remoteProperties` field', () => {
      interface HelloElementProperties {
        name?: string;
      }

      class HelloElement extends RemoteElement<HelloElementProperties> {
        static remoteProperties = {
          name: {type: String},
        };
      }

      const {root, receiver} = createAndConnectRemoteRootElement();

      const name = 'Winston';
      const element = createElementFromConstructor(HelloElement);
      (element as HelloElementProperties).name = name;

      expect(receiver.connection.mutate).not.toHaveBeenCalled();

      root.append(element);

      expect(receiver.root.children).toStrictEqual([
        {
          type: 1,
          id: expect.any(String),
          element: expect.any(String),
          version: 0,
          children: [],
          properties: {name},
          attributes: {},
          eventListeners: {},
        },
      ]);
    });

    it('sends updates to properties declared with a static `remoteProperties` field', () => {
      interface HelloElementProperties {
        name?: string;
      }

      class HelloElement extends RemoteElement<HelloElementProperties> {
        static remoteProperties = {
          name: {type: String},
        };
      }

      const {element, receiver} = createAndConnectRemoteElement(HelloElement);

      const name = 'Winston';
      (element as HelloElementProperties).name = name;

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'name',
          name,
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]);
    });

    it('sends updates to properties declared with `createRemoteElement()`', () => {
      const HelloElement = createRemoteElement<{name: string}>({
        properties: {name: {attribute: true}},
      });

      const {element, receiver} = createAndConnectRemoteElement(HelloElement);

      const name = 'Winston';
      element.name = name;

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'name',
          name,
          UPDATE_PROPERTY_TYPE_PROPERTY,
        ],
      ]);
    });

    // it('sends updates to properties declared with the `@remoteProperties()` decorator', () => {
    //   @remoteProperties({
    //     name: {attribute: true},
    //   })
    //   class HelloElement extends RemoteElement<{name: string}> {
    //     name!: string;
    //   }

    //   const {element, receiver} = createAndConnectRemoteElement(HelloElement);

    //   const name = 'Winston';
    //   element.name = name;

    //   expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
    //     [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
    //   ]);
    // });

    // it('sends updates to properties declared with the `@remoteProperty()` decorator', () => {
    //   class HelloElement extends RemoteElement {
    //     @remoteProperty()
    //     accessor name!: string;
    //   }

    //   const {element, receiver} = createAndConnectRemoteElement(HelloElement);

    //   const name = 'Winston';
    //   element.name = name;

    //   expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
    //     [MUTATION_TYPE_UPDATE_PROPERTY, remoteId(element), 'name', name],
    //   ]);
    // });

    // it('serializes initial properties declared with the `@remoteProperty()` decorator', () => {
    //   const name = 'Winston';
    //   class HelloElement extends RemoteElement {
    //     @remoteProperty()
    //     accessor name = name;
    //   }

    //   const {root, receiver} = createAndConnectRemoteRootElement();

    //   const element = new HelloElement();
    //   element.name = name;

    //   expect(receiver.connection.mutate).not.toHaveBeenCalled();

    //   root.append(element);

    //   expect(receiver.root.children).toStrictEqual([
    //     {
    //       type: 1,
    //       id: expect.any(String),
    //       element: expect.any(String),
    //       version: 0,
    //       children: [],
    //       properties: {name},
    //     },
    //   ]);
    // });

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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'name',
            name,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'name',
            name,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
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
        expect(receiver.connection.mutate).not.toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'name',
            name,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'name',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'updatedAt',
            updatedAt,
            UPDATE_PROPERTY_TYPE_PROPERTY,
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'updatedAt',
            updatedAt,
            UPDATE_PROPERTY_TYPE_PROPERTY,
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'inventory',
            inventory,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);

        element.removeAttribute('inventory');

        expect(element.inventory).toBe(undefined);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'inventory',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            collection,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);

        element.removeAttribute('collection');

        expect(element.collection).toBe(undefined);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
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
        expect(receiver.connection.mutate).not.toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            expect.anything(),
            UPDATE_PROPERTY_TYPE_PROPERTY,
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
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collections',
            collections,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);

        element.removeAttribute('collections');

        expect(element.collections).toBe(undefined);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collections',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
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
        expect(receiver.connection.mutate).not.toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'collection',
            expect.anything(),
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('parses the value for a remote property from an attribute using a custom type', () => {
        const attributePrefix = 'From attribute: ';

        const TestElement = createRemoteElement<{myField: string}>({
          properties: {
            myField: {
              attribute: true,
              type: {
                parse(value: unknown) {
                  return `${attributePrefix}${value}`;
                },
              },
            },
          },
        });

        const {element, receiver} = createAndConnectRemoteElement(TestElement);

        const value = 'Hello world';
        element.setAttribute('my-field', value);

        expect(element.myField).toBe(`${attributePrefix}${value}`);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'myField',
            `${attributePrefix}${value}`,
            UPDATE_PROPERTY_TYPE_PROPERTY,
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

        const listener = vi.fn();
        element.addEventListener('press', listener);

        expect(element.onPress).toBe(undefined);
        expect(receiver.connection.mutate).not.toHaveBeenCalledWith([
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

        const listener = vi.fn();
        element.addEventListener('press', listener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            element.onPress,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('proxies event listeners for a property that is declared as an event listener', () => {
        const ButtonElement = createRemoteElement<{press(): void}>({
          properties: {press: {event: true}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = vi.fn();
        element.addEventListener('press', listener);

        expect(element.press).toBeInstanceOf(Function);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'press',
            element.press,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('proxies event listeners to a custom event name', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {event: 'click'}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = vi.fn();
        element.addEventListener('click', listener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            element.onPress,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('proxies event listeners to kebab-cased event names', () => {
        const ButtonElement = createRemoteElement<{onMouseEnter(): void}>({
          properties: {onMouseEnter: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = vi.fn();
        element.addEventListener('mouse-enter', listener);

        expect(element.onMouseEnter).toBeInstanceOf(Function);
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onMouseEnter',
            element.onMouseEnter,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('calls event listeners with a RemoteEvent containing a single function argument as the detail', () => {
        const ButtonElement = createRemoteElement<{onPress(detail: any): void}>(
          {
            properties: {onPress: {}},
          },
        );

        const {element} = createAndConnectRemoteElement(ButtonElement);

        const listener = vi.fn();
        element.addEventListener('press', listener);

        const detail = {hello: 'world'};

        element.onPress(detail);

        expect(listener).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({type: 'press', detail}),
        );
      });

      it('returns the resolved value attached to a RemoteEvent', () => {
        const ButtonElement = createRemoteElement<{
          onPress(): void;
        }>({
          properties: {onPress: {}},
        });

        const {element} = createAndConnectRemoteElement(ButtonElement);

        const response = 'Hello world';
        element.addEventListener('press', (event: RemoteEvent) => {
          event.respondWith(response);
        });

        const result = element.onPress();

        expect(result).toBe(response);
      });

      it('removes an event listener property when the last event listener is removed', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const firstListener = vi.fn();
        const secondListener = vi.fn();

        element.addEventListener('press', firstListener);

        receiver.connection.mutate.mockClear();

        element.addEventListener('press', secondListener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.connection.mutate).not.toHaveBeenCalled();

        element.removeEventListener('press', secondListener);

        expect(element.onPress).toBeInstanceOf(Function);
        expect(receiver.connection.mutate).not.toHaveBeenCalled();

        element.removeEventListener('press', firstListener);

        expect(element.onPress).toBeUndefined();
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('removes an event listener property declared with once', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = vi.fn();

        element.addEventListener('press', listener, {once: true});

        element.onPress();

        expect(element.onPress).toBeUndefined();
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });

      it('removes an event listener property declared with an abort signal', () => {
        const ButtonElement = createRemoteElement<{onPress(): void}>({
          properties: {onPress: {}},
        });

        const {element, receiver} =
          createAndConnectRemoteElement(ButtonElement);

        const listener = vi.fn();
        const abort = new AbortController();

        element.addEventListener('press', listener, {signal: abort.signal});

        abort.abort();

        expect(element.onPress).toBeUndefined();
        expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
          [
            MUTATION_TYPE_UPDATE_PROPERTY,
            remoteId(element),
            'onPress',
            undefined,
            UPDATE_PROPERTY_TYPE_PROPERTY,
          ],
        ]);
      });
    });
  });

  describe('attributes', () => {
    it('serializes initial attributes when the element is connected', () => {
      const ProductElement = createRemoteElement({
        attributes: ['name'],
      });

      const receiver = new TestRemoteReceiver();

      const root = createRemoteRootElement();
      const element = createElementFromConstructor(ProductElement);
      root.append(element);

      const name = 'Fiddle leaf fig';
      element.setAttribute('name', name);
      element.setAttribute('not-a-valid-attribute', 'foo');

      root.connect(receiver.connection);

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          remoteId(root),
          expect.objectContaining({
            attributes: {name},
          }),
        ],
      ]);
    });

    it('automatically serializes the slot attribute without any additional configuration', () => {
      const ProductElement = createRemoteElement();

      const receiver = new TestRemoteReceiver();

      const root = createRemoteRootElement();
      const element = createElementFromConstructor(ProductElement);
      root.append(element);

      const slot = 'aside';
      element.setAttribute('slot', slot);

      root.connect(receiver.connection);

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          remoteId(root),
          expect.objectContaining({
            attributes: {slot},
          }),
        ],
      ]);
    });

    it('reflects the value of a remote attribute automatically when the attribute is set', () => {
      const ProductElement = createRemoteElement({
        attributes: ['name'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ProductElement);

      const name = 'Fiddle leaf fig';
      element.setAttribute('name', name);

      expect(element.getAttribute('name')).toBe(name);
      // @ts-expect-error We are testing that there is no attribute reflection, and the
      // type therefore also complains that `name` is not a property of `element`.
      expect(element.name).toBe(undefined);
      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'name',
          name,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
    });

    it('reflects the value of a remote attribute automatically when the attribute is removed', () => {
      const ProductElement = createRemoteElement({
        attributes: ['name'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ProductElement);

      const name = 'Fiddle leaf fig';
      element.setAttribute('name', name);
      element.removeAttribute('name');

      expect(element.getAttribute('name')).toBe(null);
      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'name',
          null,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        ],
      ]);
    });
  });

  describe('event listeners', () => {
    it('proxies event listeners, passing along the original first argument of the caller and returning the result of event.response', async () => {
      const ButtonElement = createRemoteElement({
        events: ['press'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const listener = vi.fn((event: RemoteEvent) => {
        event.respondWith(Promise.resolve(`Detail: ${event.detail}`));
      });

      // We haven’t added a listener yet, so we should not have informed the host yet
      expect(receiver.connection.mutate).not.toHaveBeenCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          expect.any(Function),
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      element.addEventListener('press', listener);

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          expect.any(Function),
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      const dispatchFunction = receiver.get<RemoteReceiverElement>({
        id: remoteId(element),
      })?.eventListeners.press;
      const result = await dispatchFunction?.('Hello world');

      expect(listener).toHaveBeenCalledWith(expect.any(RemoteEvent));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          detail: 'Hello world',
        }),
      );
      expect(result).toBe('Detail: Hello world');
    });

    it('supports a `bubbles` event option that automatically listens for an event and marks it as bubbling', async () => {
      const ButtonElement = createRemoteElement({
        events: {
          press: {
            bubbles: true,
          },
        },
      });

      const {receiver, root, element} =
        createAndConnectRemoteElement(ButtonElement);

      // Attaching a listener to the root, to verify bubbling behavior.
      const listener = vi.fn();
      root.addEventListener('press', listener);

      const dispatchFunction = receiver.get<RemoteReceiverElement>({
        id: remoteId(element),
      })?.eventListeners.press;
      await dispatchFunction?.('Hello world');

      expect(listener).toHaveBeenCalledWith(expect.any(RemoteEvent));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          bubbles: true,
        }),
      );
    });

    it('uses a custom event provided by a `dispatchEvent()` event listener description', async () => {
      class CustomRemoteEvent extends RemoteEvent {}

      const dispatchListener = vi.fn();

      const ButtonElement = createRemoteElement({
        events: {
          press: {
            dispatchEvent(detail: string) {
              dispatchListener(this, detail);

              return new CustomRemoteEvent('press', {
                detail: `Detail: ${detail}`,
              });
            },
          },
        },
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const listener = vi.fn();

      element.addEventListener('press', listener);

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          expect.any(Function),
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      const dispatchFunction = receiver.get<RemoteReceiverElement>({
        id: remoteId(element),
      })?.eventListeners.press;
      await dispatchFunction?.('Hello world');

      expect(dispatchListener).toHaveBeenCalledWith(element, 'Hello world');
      expect(listener).toHaveBeenCalledWith(expect.any(CustomRemoteEvent));
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Detail: Hello world',
        }),
      );
    });

    it('removes an event listener when the last event listener is removed', () => {
      const ButtonElement = createRemoteElement({
        events: ['press'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const firstListener = vi.fn();
      const secondListener = vi.fn();

      element.addEventListener('press', firstListener);

      receiver.connection.mutate.mockClear();

      element.addEventListener('press', secondListener);

      expect(receiver.connection.mutate).not.toHaveBeenCalled();

      element.removeEventListener('press', secondListener);

      expect(receiver.connection.mutate).not.toHaveBeenCalled();

      element.removeEventListener('press', firstListener);

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          undefined,
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      element.dispatchEvent(new RemoteEvent('press'));

      expect(firstListener).not.toHaveBeenCalled();
      expect(secondListener).not.toHaveBeenCalled();
    });

    it('removes an event listener declared with once', () => {
      const ButtonElement = createRemoteElement({
        events: ['press'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const listener = vi.fn();

      element.addEventListener('press', listener, {once: true});

      element.dispatchEvent(new RemoteEvent('press'));

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          undefined,
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();

      element.dispatchEvent(new RemoteEvent('press'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('removes an event listener declared with an abort signal', () => {
      const ButtonElement = createRemoteElement({
        events: ['press'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const listener = vi.fn();
      const abort = new AbortController();

      element.addEventListener('press', listener, {signal: abort.signal});

      abort.abort();

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          undefined,
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      element.dispatchEvent(new RemoteEvent('press'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports adding event listeners using a property', () => {
      const ButtonElement = createRemoteElement<{
        onpress: ((event: Event) => void) | null;
      }>({
        events: ['press'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const listener = vi.fn();

      element.onpress = listener;

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          expect.any(Function),
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      const event = new RemoteEvent('press');

      element.dispatchEvent(event);

      expect(listener).toHaveBeenCalledWith(event);
    });

    it('supports adding event listeners using a custom property name', () => {
      const ButtonElement = createRemoteElement<{
        onPress: ((event: Event) => void) | null;
      }>({
        events: {
          press: {property: 'onPress'},
        },
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const listener = vi.fn();

      element.onPress = listener;

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          expect.any(Function),
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      element.dispatchEvent(new RemoteEvent('press'));

      expect(listener).toHaveBeenCalledOnce();
    });

    it('supports disabling a property name that maps to the event listener', () => {
      const ButtonElement = createRemoteElement({
        events: {
          press: {property: false},
        },
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);
      receiver.connection.mutate.mockClear();

      const listener = vi.fn();

      // @ts-expect-error This property is not available in this case
      element.onpress = listener;

      expect(receiver.connection.mutate).not.toHaveBeenCalled();

      element.dispatchEvent(new RemoteEvent('press'));

      expect(listener).not.toHaveBeenCalledOnce();
    });

    it('removes an event listener declared using a property when it is unset', () => {
      const ButtonElement = createRemoteElement<{
        onpress: ((event: Event) => void) | null;
      }>({
        events: ['press'],
      });

      const {element, receiver} = createAndConnectRemoteElement(ButtonElement);

      const firstListener = vi.fn();
      const secondListener = vi.fn();

      element.onpress = firstListener;

      receiver.connection.mutate.mockClear();

      element.onpress = secondListener;

      expect(receiver.connection.mutate).not.toHaveBeenCalled();

      element.onpress = null;

      expect(receiver.connection.mutate).toHaveBeenLastCalledWith([
        [
          MUTATION_TYPE_UPDATE_PROPERTY,
          remoteId(element),
          'press',
          undefined,
          UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
        ],
      ]);

      element.dispatchEvent(new RemoteEvent('press'));

      expect(firstListener).not.toHaveBeenCalled();
      expect(secondListener).not.toHaveBeenCalled();
    });
  });

  describe('methods', () => {
    it('calls a method on the remote receiver', () => {
      class HelloElement extends RemoteElement<{}, {greet(): void}> {
        greet(name: string) {
          return this.callRemoteMethod('greet', name);
        }
      }

      const {root, receiver} = createAndConnectRemoteRootElement();

      const element = new HelloElement();
      root.append(element);

      const name = 'Winston';
      const spy = vi.fn((name: string) => `Hello ${name}!`);
      const receivedElement = receiver.root
        .children[0] as RemoteReceiverElement;

      receiver.implement(receivedElement, {greet: spy});

      expect(spy).not.toHaveBeenCalled();

      const result = element.greet(name);

      expect(result).toBe(`Hello ${name}!`);
      expect(spy).toHaveBeenCalledWith(name);
    });
  });
});

class TestRemoteReceiver
  implements
    Pick<
      RemoteReceiver,
      'root' | 'connection' | 'get' | 'implement' | 'subscribe'
    >
{
  readonly #receiver = new RemoteReceiver();
  readonly connection: RemoteReceiver['connection'] &
    MockedObject<RemoteReceiver['connection']>;

  get root() {
    return this.#receiver.root;
  }

  constructor() {
    const {connection} = this.#receiver;
    this.connection = {
      mutate: vi.fn(connection.mutate),
      call: vi.fn(connection.call),
    };
  }

  get: RemoteReceiver['get'] = this.#receiver.get.bind(this.#receiver);
  implement = this.#receiver.implement.bind(this.#receiver);
  subscribe = this.#receiver.subscribe.bind(this.#receiver);
}

function createAndConnectRemoteElement<
  ElementType extends RemoteElementConstructor,
>(ElementConstructor: ElementType) {
  const {receiver, root} = createAndConnectRemoteRootElement();
  const element = createElementFromConstructor(ElementConstructor);
  root.append(element);
  return {root, element, receiver};
}

function createElementFromConstructor<
  ElementType extends CustomElementConstructor,
>(
  ElementConstructor: ElementType,
  tagName: string = 'test-custom-element',
  ownerDocument: Document = window.document,
) {
  const element = new ElementConstructor() as InstanceType<ElementType>;

  Object.defineProperties(element, {
    [NAME]: {value: tagName, writable: true, enumerable: false},
    [OWNER_DOCUMENT]: {
      value: ownerDocument,
      writable: true,
      enumerable: false,
    },
  });

  return element;
}

function createAndConnectRemoteRootElement() {
  const root = createRemoteRootElement();
  const receiver = new TestRemoteReceiver();
  root.connect(receiver.connection);
  document.body.append(root);
  return {root, receiver};
}

function createRemoteRootElement() {
  return createElementFromConstructor(RemoteRootElement, 'remote-root');
}
