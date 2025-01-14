import '../../polyfill.ts';

import {beforeEach, describe, expect, it, vi, type MockedObject} from 'vitest';

import {adaptToLegacyRemoteChannel} from '../../legacy/host.ts';

import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_TEXT,
  ACTION_UPDATE_PROPS,
  KIND_TEXT,
  KIND_FRAGMENT,
  KIND_COMPONENT,
  RemoteComponentType,
  RemoteComponentSerialization,
  RemoteTextSerialization,
} from '@remote-ui/core';

import {
  ROOT_ID,
  NODE_TYPE_TEXT,
  NODE_TYPE_ELEMENT,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from '../../constants';

import {
  RemoteElement,
  createRemoteElement,
  RemoteEvent,
  // remoteProperties,
  // remoteProperty,
  RemoteRootElement,
  type RemoteElementConstructor,
} from '../../elements.ts';
import {remoteId} from '../elements/internals.ts';
import {
  RemoteReceiver,
  type RemoteReceiverElement,
} from '../../receivers/RemoteReceiver.ts';

import {NAME, OWNER_DOCUMENT} from '../../../../polyfill/source/constants.ts';

describe('adaptToLegacyRemoteChannel()', () => {
  describe('ACTION_MOUNT', () => {
    it('mounts text nodes', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '0',
          kind: KIND_TEXT,
          text: 'I am a text',
        },
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '0',
            type: NODE_TYPE_TEXT,
            data: 'I am a text',
          },
          0,
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '0',
          type: NODE_TYPE_TEXT,
          data: 'I am a text',
          version: 0,
        },
      ]);
    });

    it('mounts component nodes', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [{id: '0', kind: KIND_TEXT, text: 'I am a banner'}],
        },
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'Banner',
            properties: {title: 'Title'},
            children: [
              {
                id: '0',
                type: NODE_TYPE_TEXT,
                data: 'I am a banner',
              },
            ],
          },
          0,
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {id: '0', type: NODE_TYPE_TEXT, data: 'I am a banner', version: 0},
          ],
          properties: {title: 'Title'},
          attributes: {},
          eventListeners: {},
          version: 0,
        },
      ]);
    });

    it('uses custom element mappings when provided', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection, {
        elements: {
          Button: 'MappedButton',
        },
      });

      channel(ACTION_MOUNT, [
        {
          kind: KIND_COMPONENT,
          id: '1',
          type: 'Button',
          props: {},
          children: [],
        },
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '1',
            type: NODE_TYPE_ELEMENT,
            element: 'MappedButton',
            properties: {},
            children: [],
          },
          0,
        ],
      ]);
    });
  });

  describe('ACTION_INSERT_CHILD', () => {
    it('inserts child', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [],
        },
      ]);

      channel(
        ACTION_INSERT_CHILD,
        '1',
        1,
        {
          id: '3',
          kind: 1,
          type: 'Button',
          props: {},
          children: [{id: '2', kind: 2, text: 'I am a button'}],
        },
        false,
      );

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          '1',
          {
            id: '3',
            type: NODE_TYPE_ELEMENT,
            element: 'Button',
            properties: {},
            children: [{id: '2', type: NODE_TYPE_TEXT, data: 'I am a button'}],
          },
          1,
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {
              id: '3',
              type: NODE_TYPE_ELEMENT,
              element: 'Button',
              children: [
                {
                  id: '2',
                  type: NODE_TYPE_TEXT,
                  data: 'I am a button',
                  version: 0,
                },
              ],
              properties: {},
              attributes: {},
              eventListeners: {},
              version: 0,
            },
          ],
          properties: {
            title: 'Title',
          },
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);
    });
  });

  describe('ACTION_REMOVE_CHILD', () => {
    it('removes child', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '2',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [
            {
              id: '1',
              kind: KIND_COMPONENT,
              type: 'Button',
              props: {},
              children: [{id: '0', kind: KIND_TEXT, text: 'I am a button'}],
            },
          ],
        },
      ]);

      channel(ACTION_REMOVE_CHILD, '2', 0);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '2', 0],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: 1,
          element: 'Banner',
          children: [],
          properties: {title: 'Title'},
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);
    });
  });

  describe('ACTION_UPDATE_TEXT', () => {
    it('updates text', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [{id: '0', kind: KIND_TEXT, text: 'I am a banner'}],
        },
      ]);

      channel(ACTION_UPDATE_TEXT, '0', 'I am an updated banner');

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_UPDATE_TEXT, '0', 'I am an updated banner'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am an updated banner',
              version: 1,
            },
          ],
          properties: {title: 'Title'},
          attributes: {},
          eventListeners: {},
          version: 0,
        },
      ]);
    });
  });

  describe('ACTION_UPDATE_PROPS', () => {
    it('update props with regular props', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [],
        },
      ]);

      channel(ACTION_UPDATE_PROPS, '1', {
        title: 'New title',
      });

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_UPDATE_PROPERTY, '1', 'title', 'New title'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [],
          properties: {title: 'New title'},
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);
    });

    it('update props with fragments', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [],
        },
      ]);

      channel(ACTION_UPDATE_PROPS, '1', {
        children: {
          kind: KIND_FRAGMENT,
          id: '2',
          children: [
            {
              kind: KIND_TEXT,
              id: '1',
              text: 'Fragment text',
            },
          ],
        },
      });

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          '1',
          {
            id: '2',
            type: NODE_TYPE_ELEMENT,
            element: 'remote-fragment',
            attributes: {slot: 'children'},
            children: [
              {
                id: '1',
                type: NODE_TYPE_TEXT,
                data: 'Fragment text',
              },
            ],
          },
          0,
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {
              id: '2',
              type: NODE_TYPE_ELEMENT,
              element: 'remote-fragment',
              children: [
                {
                  id: '1',
                  type: NODE_TYPE_TEXT,
                  data: 'Fragment text',
                  version: 0,
                },
              ],
              properties: {},
              attributes: {slot: 'children'},
              eventListeners: {},
              version: 0,
            },
          ],
          properties: {title: 'Title'},
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);
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
