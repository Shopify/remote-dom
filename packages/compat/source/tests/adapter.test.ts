import '@remote-dom/core/polyfill';

import {describe, expect, it, vi, type Mocked} from 'vitest';

import {adaptToLegacyRemoteChannel} from '../adapter/host.ts';

import {
  ACTION_INSERT_CHILD,
  ACTION_MOUNT,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
} from '@remote-ui/core';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
} from '@remote-dom/core';

import {RemoteReceiver} from '@remote-dom/core/receivers';

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

    it('replaces fragments with comment nodes', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '2',
          kind: KIND_FRAGMENT,
          children: [
            {
              id: '1',
              kind: KIND_TEXT,
              text: 'First text',
            },
            {
              id: '0',
              kind: KIND_TEXT,
              text: 'Second text',
            },
          ],
        } as any,
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '2',
            type: NODE_TYPE_COMMENT,
            data: 'added by remote-ui legacy adaptor to replace a fragment rendered as a child',
          },
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_COMMENT,
          data: 'added by remote-ui legacy adaptor to replace a fragment rendered as a child',
          version: 0,
        },
      ]);
    });

    it('mounts components replacing fragment children with comment nodes', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '4',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [
            {
              id: '3',
              kind: KIND_TEXT,
              text: 'Direct text child',
            },
            {
              id: '2',
              kind: KIND_FRAGMENT,
              children: [
                {
                  id: '1',
                  kind: KIND_TEXT,
                  text: 'Text in fragment',
                },
                {
                  id: '0',
                  kind: KIND_COMPONENT,
                  type: 'Button',
                  props: {},
                  children: [],
                },
              ],
            } as any,
          ],
        },
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '4',
            type: NODE_TYPE_ELEMENT,
            element: 'Banner',
            properties: {title: 'Title'},
            children: [
              {
                id: '3',
                type: NODE_TYPE_TEXT,
                data: 'Direct text child',
              },
              {
                id: '2',
                type: NODE_TYPE_COMMENT,
                data: 'added by remote-ui legacy adaptor to replace a fragment rendered as a child',
              },
            ],
          },
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '4',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {
              id: '3',
              type: NODE_TYPE_TEXT,
              data: 'Direct text child',
              version: 0,
            },
            {
              id: '2',
              type: NODE_TYPE_COMMENT,
              data: 'added by remote-ui legacy adaptor to replace a fragment rendered as a child',
              version: 0,
            },
          ],
          properties: {title: 'Title'},
          attributes: {},
          eventListeners: {},
          version: 0,
        },
      ]);
    });

    it('mounts component nodes with fragment props', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '3',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {
            title: {
              id: '2',
              kind: KIND_FRAGMENT,
              children: [
                {
                  id: '1',
                  kind: KIND_TEXT,
                  text: 'Title in a fragment',
                },
              ],
            },
          },
          children: [{id: '0', kind: KIND_TEXT, text: 'I am a banner'}],
        },
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '3',
            type: NODE_TYPE_ELEMENT,
            element: 'Banner',
            properties: {},
            children: [
              {
                id: '0',
                type: NODE_TYPE_TEXT,
                data: 'I am a banner',
              },
              {
                id: '2',
                type: NODE_TYPE_ELEMENT,
                element: 'remote-fragment',
                attributes: {slot: 'title'},
                children: [
                  {
                    id: '1',
                    type: NODE_TYPE_TEXT,
                    data: 'Title in a fragment',
                  },
                ],
              },
            ],
          },
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '3',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am a banner',
              version: 0,
            },
            {
              id: '2',
              type: NODE_TYPE_ELEMENT,
              element: 'remote-fragment',
              children: [
                {
                  id: '1',
                  type: NODE_TYPE_TEXT,
                  data: 'Title in a fragment',
                  version: 0,
                },
              ],
              properties: {},
              attributes: {
                slot: 'title',
              },
              eventListeners: {},
              version: 0,
            },
          ],
          properties: {},
          attributes: {},
          eventListeners: {},
          version: 0,
        },
      ]);
    });

    it('mounts component nodes with nested fragment props', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '5',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {
            title: {
              id: '4',
              kind: KIND_FRAGMENT,
              children: [
                {
                  id: '3',
                  kind: KIND_COMPONENT,
                  type: 'Heading',
                  props: {
                    label: {
                      id: '2',
                      kind: KIND_FRAGMENT,
                      children: [
                        {
                          id: '1',
                          kind: KIND_TEXT,
                          text: 'Title in a nested fragment',
                        },
                      ],
                    },
                  },
                  children: [],
                },
              ],
            },
          },
          children: [{id: '0', kind: KIND_TEXT, text: 'I am a banner'}],
        },
      ]);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          {
            id: '5',
            type: NODE_TYPE_ELEMENT,
            element: 'Banner',
            children: [
              {
                id: '0',
                type: NODE_TYPE_TEXT,
                data: 'I am a banner',
              },
              {
                id: '4',
                type: NODE_TYPE_ELEMENT,
                element: 'remote-fragment',
                children: [
                  {
                    id: '3',
                    type: NODE_TYPE_ELEMENT,
                    element: 'Heading',
                    children: [
                      {
                        id: '2',
                        type: NODE_TYPE_ELEMENT,
                        element: 'remote-fragment',
                        children: [
                          {
                            id: '1',
                            type: NODE_TYPE_TEXT,
                            data: 'Title in a nested fragment',
                          },
                        ],
                        attributes: {
                          slot: 'label',
                        },
                      },
                    ],
                    properties: {},
                  },
                ],
                attributes: {
                  slot: 'title',
                },
              },
            ],
            properties: {},
          },
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '5',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am a banner',
              version: 0,
            },
            {
              id: '4',
              type: NODE_TYPE_ELEMENT,
              element: 'remote-fragment',
              children: [
                {
                  id: '3',
                  type: NODE_TYPE_ELEMENT,
                  element: 'Heading',
                  attributes: {},
                  children: [
                    {
                      id: '2',
                      type: NODE_TYPE_ELEMENT,
                      element: 'remote-fragment',
                      children: [
                        {
                          id: '1',
                          type: NODE_TYPE_TEXT,
                          data: 'Title in a nested fragment',
                          version: 0,
                        },
                      ],
                      properties: {},
                      attributes: {
                        slot: 'label',
                      },
                      eventListeners: {},
                      version: 0,
                    },
                  ],
                  eventListeners: {},
                  properties: {},
                  version: 0,
                },
              ],
              properties: {},
              attributes: {
                slot: 'title',
              },
              eventListeners: {},
              version: 0,
            },
          ],
          eventListeners: {},
          properties: {},
          attributes: {},
          version: 0,
        },
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
          kind: KIND_COMPONENT,
          type: 'Button',
          props: {},
          children: [{id: '2', kind: KIND_TEXT, text: 'I am a button'}],
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
          undefined,
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

    it('inserts a child with an id that already exists', () => {
      const receiver = new TestRemoteReceiver();
      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [
            {
              id: '2',
              kind: KIND_COMPONENT,
              type: 'Button',
              props: {},
              children: [],
            },
            {
              id: '3',
              kind: KIND_TEXT,
              text: 'I am a text',
            },
          ],
        },
      ]);

      channel(
        ACTION_INSERT_CHILD,
        '1',
        1,
        {
          id: '2',
          kind: KIND_COMPONENT,
          type: 'Button',
          props: {},
          children: [],
        },
        false,
      );

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '1', '2'],
        [
          MUTATION_TYPE_INSERT_CHILD,
          '1',
          {
            id: '2',
            type: NODE_TYPE_ELEMENT,
            element: 'Button',
            properties: {},
            children: [],
          },
          undefined,
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
              type: NODE_TYPE_TEXT,
              data: 'I am a text',
              version: 0,
            },
            {
              id: '2',
              type: NODE_TYPE_ELEMENT,
              element: 'Button',
              children: [],
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
          version: 2,
        },
      ]);
    });

    it('inserts child with fragment props', () => {
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
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {
            title: {
              id: '2',
              kind: KIND_FRAGMENT,
              children: [
                {
                  id: '1',
                  kind: KIND_TEXT,
                  text: 'Title in a fragment',
                },
              ],
            },
          },
          children: [],
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
            element: 'Banner',
            children: [
              {
                attributes: {
                  slot: 'title',
                },
                children: [
                  {
                    id: '1',
                    type: NODE_TYPE_TEXT,
                    data: 'Title in a fragment',
                  },
                ],
                id: '2',
                type: NODE_TYPE_ELEMENT,
                element: 'remote-fragment',
              },
            ],
            properties: {},
          },
          undefined,
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '1',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          attributes: {},
          children: [
            {
              id: '3',
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
                      data: 'Title in a fragment',
                      version: 0,
                    },
                  ],
                  properties: {},
                  attributes: {
                    slot: 'title',
                  },
                  eventListeners: {},
                  version: 0,
                },
              ],
              properties: {},
              attributes: {},
              eventListeners: {},
              version: 0,
            },
          ],
          eventListeners: {},
          properties: {
            title: 'Title',
          },
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
        [MUTATION_TYPE_REMOVE_CHILD, '2', '1'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          children: [],
          properties: {title: 'Title'},
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);
    });

    it('removes child with fragment props', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '3',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {
            title: {
              id: '2',
              kind: KIND_FRAGMENT,
              children: [
                {
                  id: '1',
                  kind: KIND_TEXT,
                  text: 'Title in a fragment',
                },
              ],
            },
          },
          children: [{id: '0', kind: KIND_TEXT, text: 'I am a banner'}],
        },
      ]);

      channel(ACTION_REMOVE_CHILD, '3', 1);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '3', '2'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '3',
          type: NODE_TYPE_ELEMENT,
          element: 'Banner',
          attributes: {},
          children: [
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am a banner',
              version: 0,
            },
          ],
          properties: {},
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

  describe('options', () => {
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
        ],
      ]);
    });

    it('uses custom slot wrapper when provided', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection, {
        slotProps: {
          wrapper: 'custom-fragment',
        },
      });

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
        title: {
          kind: KIND_FRAGMENT,
          id: '2',
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
      });

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          '1',
          {
            id: '2',
            type: NODE_TYPE_ELEMENT,
            element: 'custom-fragment',
            attributes: {slot: 'title'},
            children: [
              {
                id: '1',
                type: NODE_TYPE_ELEMENT,
                element: 'Button',
                children: [
                  {
                    id: '0',
                    type: NODE_TYPE_TEXT,
                    data: 'I am a button',
                  },
                ],
                properties: {},
              },
            ],
          },
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
              element: 'custom-fragment',
              children: [
                {
                  id: '1',
                  type: NODE_TYPE_ELEMENT,
                  element: 'Button',
                  children: [
                    {
                      id: '0',
                      type: NODE_TYPE_TEXT,
                      data: 'I am a button',
                      version: 0,
                    },
                  ],
                  eventListeners: {},
                  properties: {},
                  attributes: {},
                  version: 0,
                },
              ],
              properties: {},
              attributes: {
                slot: 'title',
              },
              eventListeners: {},
              version: 0,
            },
          ],
          eventListeners: {},
          properties: {
            title: 'Title',
          },
          attributes: {},
          version: 1,
        },
      ]);
    });
  });

  describe('persistNode()', () => {
    it('tracks node relationships', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '2',
          kind: KIND_COMPONENT,
          type: 'Container',
          props: {},
          children: [
            {
              id: '1',
              kind: KIND_TEXT,
              text: 'I am the first child',
            },
            {
              id: '0',
              kind: KIND_TEXT,
              text: 'I am the second child',
            },
          ],
        },
      ]);

      // Remove the first child
      channel(ACTION_REMOVE_CHILD, '2', 0);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '2', '1'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'Container',
          children: [
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am the second child',
              version: 0,
            },
          ],
          properties: {},
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);

      // Remove the second child (which is now at index 0)
      channel(ACTION_REMOVE_CHILD, '2', 0);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '2', '0'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'Container',
          children: [],
          properties: {},
          attributes: {},
          eventListeners: {},
          version: 2,
        },
      ]);
    });

    it('maintains correct indices when inserting and removing nodes', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '2',
          kind: KIND_COMPONENT,
          type: 'Container',
          props: {},
          children: [
            {
              id: '1',
              kind: KIND_TEXT,
              text: 'I am the first child',
            },
            {
              id: '0',
              kind: KIND_TEXT,
              text: 'I am the second child',
            },
          ],
        },
      ]);

      // Insert a new node in the middle
      channel(
        ACTION_INSERT_CHILD,
        '2',
        1,
        {
          id: '3',
          kind: KIND_TEXT,
          text: 'I am the third child',
        },
        false,
      );

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [
          MUTATION_TYPE_INSERT_CHILD,
          '2',
          {
            id: '3',
            type: NODE_TYPE_TEXT,
            data: 'I am the third child',
          },
          '0',
        ],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'Container',
          children: [
            {
              id: '1',
              type: NODE_TYPE_TEXT,
              data: 'I am the first child',
              version: 0,
            },
            {
              id: '3',
              type: NODE_TYPE_TEXT,
              data: 'I am the third child',
              version: 0,
            },
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am the second child',
              version: 0,
            },
          ],
          properties: {},
          attributes: {},
          eventListeners: {},
          version: 1,
        },
      ]);

      // Remove the first node
      channel(ACTION_REMOVE_CHILD, '2', 0);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '2', '1'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'Container',
          children: [
            {
              id: '3',
              type: NODE_TYPE_TEXT,
              data: 'I am the third child',
              version: 0,
            },
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am the second child',
              version: 0,
            },
          ],
          properties: {},
          attributes: {},
          eventListeners: {},
          version: 2,
        },
      ]);

      // Remove the new first node
      channel(ACTION_REMOVE_CHILD, '2', 0);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, '2', '3'],
      ]);

      expect(receiver.root.children).toStrictEqual([
        {
          id: '2',
          type: NODE_TYPE_ELEMENT,
          element: 'Container',
          children: [
            {
              id: '0',
              type: NODE_TYPE_TEXT,
              data: 'I am the second child',
              version: 0,
            },
          ],
          properties: {},
          attributes: {},
          eventListeners: {},
          version: 3,
        },
      ]);
    });
  });

  describe('cleanupNode()', () => {
    it('cleans up all children when removing a parent node', () => {
      const receiver = new TestRemoteReceiver();

      const channel = adaptToLegacyRemoteChannel(receiver.connection);

      channel(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {title: 'Title'},
          children: [
            {
              id: '3',
              kind: KIND_COMPONENT,
              type: 'Button',
              props: {},
              children: [{id: '2', kind: KIND_TEXT, text: 'I am a button'}],
            },
          ],
        },
      ]);

      channel(ACTION_REMOVE_CHILD, ROOT_ID, 0);

      expect(receiver.connection.mutate).toHaveBeenCalledWith([
        [MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, '1'],
      ]);

      expect(receiver.root.children).toStrictEqual([]);
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
    Mocked<RemoteReceiver['connection']>;

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
