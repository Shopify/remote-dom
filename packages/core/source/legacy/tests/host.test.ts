import '../../polyfill.ts';

import {describe, expect, it} from 'vitest';

import {adaptToLegacyRemoteChannel} from '../../legacy/host.ts';
import {RemoteReceiver} from '../../receivers';

describe('adaptToLegacyRemoteChannel', () => {
  it('mounts nodes', () => {
    const receiver = new RemoteReceiver();
    const {connection, root} = receiver;

    const channel = adaptToLegacyRemoteChannel(connection);

    channel(0, [
      {
        id: '1',
        kind: 1,
        type: 'Banner',
        props: {title: 'Banner'},
        children: [{id: '0', kind: 2, text: 'I am a banner'}],
      },
    ]);

    expect(root.children).toStrictEqual([
      {
        id: '1',
        type: 1,
        element: 'Banner',
        children: [{id: '0', type: 3, data: 'I am a banner', version: 0}],
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 0,
      },
    ]);
  });

  it('inserts a child', () => {
    const receiver = new RemoteReceiver();
    const {connection, root} = receiver;

    const channel = adaptToLegacyRemoteChannel(connection);

    channel(0, [
      {
        id: '2',
        kind: 1,
        type: 'Banner',
        props: {title: 'Banner'},
        children: [
          {
            id: '1',
            kind: 1,
            type: 'Button',
            props: {},
            children: [{id: '0', kind: 2, text: 'Add child'}],
          },
        ],
      },
    ]);

    expect(root.children).toStrictEqual([
      {
        id: '2',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '1',
            type: 1,
            element: 'Button',
            children: [{id: '0', type: 3, data: 'Add child', version: 0}],
            properties: {},
            attributes: {},
            eventListeners: {},
            version: 0,
          },
        ],
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 0,
      },
    ]);

    channel(
      1,
      '2',
      1,
      {
        id: '4',
        kind: 1,
        type: 'Text',
        props: {},
        children: [{id: '3', kind: 2, text: "I'm a child"}],
      },
      false,
    );

    expect(root.children).toStrictEqual([
      {
        id: '2',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '1',
            type: 1,
            element: 'Button',
            children: [{id: '0', type: 3, data: 'Add child', version: 0}],
            properties: {},
            attributes: {},
            eventListeners: {},
            version: 0,
          },
          {
            id: '4',
            type: 1,
            element: 'Text',
            children: [{id: '3', type: 3, data: "I'm a child", version: 0}],
            properties: {},
            attributes: {},
            eventListeners: {},
            version: 0,
          },
        ],
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 1,
      },
    ]);
  });

  it('removes a child', () => {
    const receiver = new RemoteReceiver();
    const {connection, root} = receiver;

    const channel = adaptToLegacyRemoteChannel(connection);

    channel(0, [
      {
        id: '2',
        kind: 1,
        type: 'Banner',
        props: {title: 'Banner'},
        children: [
          {
            id: '1',
            kind: 1,
            type: 'Button',
            props: {},
            children: [{id: '0', kind: 2, text: 'Remove child'}],
          },
        ],
      },
    ]);

    expect(root.children).toStrictEqual([
      {
        id: '2',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '1',
            type: 1,
            element: 'Button',
            children: [{id: '0', type: 3, data: 'Remove child', version: 0}],
            properties: {},
            attributes: {},
            eventListeners: {},
            version: 0,
          },
        ],
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 0,
      },
    ]);

    channel(2, '2', 0);

    expect(root.children).toStrictEqual([
      {
        id: '2',
        type: 1,
        element: 'Banner',
        children: [],
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 1,
      },
    ]);
  });

  it('updates text', () => {
    const receiver = new RemoteReceiver();
    const {connection, root} = receiver;

    const channel = adaptToLegacyRemoteChannel(connection);

    channel(0, [
      {
        id: '3',
        kind: 1,
        type: 'Banner',
        props: {title: 'Banner'},
        children: [
          {
            id: '2',
            kind: 1,
            type: 'Button',
            props: {},
            children: [
              {
                id: '1',
                kind: 1,
                type: 'Text',
                props: {},
                children: [{id: '0', kind: 2, text: 'Update Text'}],
              },
            ],
          },
        ],
      },
    ]);

    expect(root.children).toStrictEqual([
      {
        id: '3',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '2',
            type: 1,
            element: 'Button',
            children: [
              {
                id: '1',
                type: 1,
                element: 'Text',
                children: [{id: '0', type: 3, data: 'Update Text', version: 0}],
                properties: {},
                attributes: {},
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
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 0,
      },
    ]);

    channel(3, '0', 'Revert Text');

    expect(root.children).toStrictEqual([
      {
        id: '3',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '2',
            type: 1,
            element: 'Button',
            children: [
              {
                id: '1',
                type: 1,
                element: 'Text',
                children: [{id: '0', type: 3, data: 'Revert Text', version: 1}],
                properties: {},
                attributes: {},
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
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 0,
      },
    ]);
  });

  it('updates prop', () => {
    const receiver = new RemoteReceiver();
    const {connection, root} = receiver;

    const channel = adaptToLegacyRemoteChannel(connection);

    channel(0, [
      {
        id: '2',
        kind: 1,
        type: 'Banner',
        props: {title: 'Banner'},
        children: [
          {
            id: '1',
            kind: 1,
            type: 'Button',
            props: {},
            children: [{id: '0', kind: 2, text: 'Update prop'}],
          },
        ],
      },
    ]);

    expect(root.children).toStrictEqual([
      {
        id: '2',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '1',
            type: 1,
            element: 'Button',
            children: [{id: '0', type: 3, data: 'Update prop', version: 0}],
            properties: {},
            attributes: {},
            eventListeners: {},
            version: 0,
          },
        ],
        properties: {title: 'Banner'},
        attributes: {},
        eventListeners: {},
        version: 0,
      },
    ]);

    channel(4, '2', {title: 'Banner updated'});

    expect(root.children).toStrictEqual([
      {
        id: '2',
        type: 1,
        element: 'Banner',
        children: [
          {
            id: '1',
            type: 1,
            element: 'Button',
            children: [{id: '0', type: 3, data: 'Update prop', version: 0}],
            properties: {},
            attributes: {},
            eventListeners: {},
            version: 0,
          },
        ],
        properties: {title: 'Banner updated'},
        attributes: {},
        eventListeners: {},
        version: 1,
      },
    ]);
  });
});
