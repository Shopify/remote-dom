import {
  KIND_TEXT as LEGACY_KIND_TEXT,
  KIND_FRAGMENT as LEGACY_KIND_FRAGMENT,
  ACTION_MOUNT as LEGACY_ACTION_MOUNT,
  ACTION_INSERT_CHILD as LEGACY_ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD as LEGACY_ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS as LEGACY_ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT as LEGACY_ACTION_UPDATE_TEXT,
  type RemoteChannel as LegacyRemoteChannel,
  type ActionArgumentMap as LegacyActionArgumentMap,
  type RemoteComponentSerialization as LegacyRemoteComponentSerialization,
  type RemoteTextSerialization as LegacyRemoteTextSerialization,
} from '@remote-ui/core';

import type {
  RemoteMutationRecord,
  RemoteTextSerialization,
  RemoteElementSerialization,
  RemoteConnection,
} from '../types.ts'; // Adjust this import path as needed
import {
  ROOT_ID,
  NODE_TYPE_TEXT,
  NODE_TYPE_ELEMENT,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
} from '../constants.ts';

export interface LegacyRemoteChannelElementMap {
  [key: string]: string;
}

export interface LegacyRemoteChannelOptions {
  elements?: LegacyRemoteChannelElementMap;
}

/**
 * Adapts a Remote DOM `RemoteConnection` object into a `remote-ui` `RemoteChannel`.
 * This allows you to use a Remote DOM receiver class on the host, even if the remote
 * environment is using `remote-ui`.
 *
 * @example
 * ```tsx
 * import {DOMRemoteReceiver} from '@remote-dom/core/receivers';
 * import {adaptToLegacyRemoteChannel} from '@remote-dom/core/legacy';
 *
 * const receiver = new DOMRemoteReceiver();
 * const channel = adaptToLegacyRemoteChannel(receiver.connection);
 *
 * // Do something with the channel
 * sendChannelToRemoteEnvironment(channel);
 * ```
 */
export function adaptToLegacyRemoteChannel(
  connection: RemoteConnection,
  options?: LegacyRemoteChannelOptions,
): LegacyRemoteChannel {
  const tree: Record<string, any> = {};

  function persistNode(parentId: string, node: any, index: number) {
    tree[parentId] = tree[parentId] ?? [];
    tree[parentId].splice(index, 0, {
      id: node.id,
      slot: node?.attributes?.slot,
    });

    if (node.children) {
      for (const [childIndex, child] of node.children.entries()) {
        persistNode(node.id, child, childIndex);
      }
    }
  }

  function removeNode(parentId: string, index: number) {
    const id = tree[parentId][index].id;
    tree[parentId].splice(index, 1);
    cleanupNode(id);
  }

  function cleanupNode(id: string) {
    if (tree[id]) {
      for (const child of tree[id]) {
        cleanupNode(child.id);
      }

      delete tree[id];
    }
  }

  function mutate(records: RemoteMutationRecord[]) {
    for (const record of records) {
      const [mutationType, parentId] = record;

      switch (mutationType) {
        case MUTATION_TYPE_INSERT_CHILD: {
          const node = record[2];
          const index = record[3];
          persistNode(parentId, node, index);
          break;
        }
        case MUTATION_TYPE_REMOVE_CHILD:
          const index = record[2];
          removeNode(parentId, index);
          break;
      }

      connection.mutate(records);
    }
  }

  return function remoteChannel<T extends keyof LegacyActionArgumentMap>(
    type: T,
    ...payload: LegacyActionArgumentMap[T]
  ) {
    switch (type) {
      case LEGACY_ACTION_MOUNT:
        const [nodes] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_MOUNT];

        const records = nodes.map(
          (node, index) =>
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              adaptLegacyNodeSerialization(node, options),
              index,
            ] satisfies RemoteMutationRecord,
        );

        mutate(records);

        break;

      case LEGACY_ACTION_INSERT_CHILD:
        const [parentId, index, child] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_INSERT_CHILD];

        mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            parentId ?? ROOT_ID,
            adaptLegacyNodeSerialization(child, options),
            index,
          ],
        ]);

        break;

      case LEGACY_ACTION_REMOVE_CHILD: {
        const [parentID, removeIndex] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_REMOVE_CHILD];

        mutate([
          [MUTATION_TYPE_REMOVE_CHILD, parentID ?? ROOT_ID, removeIndex],
        ]);

        break;
      }

      case LEGACY_ACTION_UPDATE_TEXT: {
        const [textId, text] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_TEXT];

        mutate([[MUTATION_TYPE_UPDATE_TEXT, textId, text]]);

        break;
      }

      case LEGACY_ACTION_UPDATE_PROPS: {
        const [id, props] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_PROPS];

        const records = [];

        for (const [key, value] of Object.entries(props)) {
          if (isFragment(value)) {
            const index =
              tree[id]?.findIndex(({slot}: any) => slot === key) ?? -1;

            if (index !== -1) {
              records.push([
                MUTATION_TYPE_REMOVE_CHILD,
                id,
                index,
              ] satisfies RemoteMutationRecord);
            }

            records.push([
              MUTATION_TYPE_INSERT_CHILD,
              id,
              adaptLegacyFragmentSerialization(key, value, options),
              tree[id]?.length ?? 0,
            ] satisfies RemoteMutationRecord);
          } else {
            const index =
              tree[id]?.findIndex(({slot}: any) => slot === key) ?? -1;
            if (index !== -1) {
              records.push([
                MUTATION_TYPE_REMOVE_CHILD,
                id,
                index,
              ] satisfies RemoteMutationRecord);
            } else {
              records.push([
                MUTATION_TYPE_UPDATE_PROPERTY,
                id,
                key,
                value,
              ] satisfies RemoteMutationRecord);
            }
          }
        }

        mutate(records);

        break;
      }

      default:
        throw new Error(`Unsupported action type: ${type}`);
    }
  };
}

function adaptLegacyNodeSerialization(
  child: LegacyRemoteComponentSerialization | LegacyRemoteTextSerialization,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization | RemoteTextSerialization {
  if (child.kind === LEGACY_KIND_TEXT) {
    return adaptLegacyTextSerialization(child);
  } else {
    return adaptLegacyComponentSerialization(child, options);
  }
}

function adaptLegacyTextSerialization({
  id,
  text,
}: LegacyRemoteTextSerialization): RemoteTextSerialization {
  return {
    id,
    type: NODE_TYPE_TEXT,
    data: text,
  };
}

function adaptLegacyComponentSerialization(
  {id, type, props, children}: LegacyRemoteComponentSerialization,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization {
  const element = options?.elements?.[type] ?? type;

  const [fragments, properties] = adaptFragmentsInProps(props);

  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element,
    properties,
    children: [
      ...children.map((child) => {
        return adaptLegacyNodeSerialization(child, options);
      }),
      ...adaptLegacyFragmentsSerialization(fragments, options),
    ],
  };
}

function adaptFragmentsInProps(props: any) {
  const fragments: any = {};
  const properties: any = {};

  for (const [key, value] of Object.entries(props)) {
    if (isFragment(value)) {
      fragments[key] = value;
    } else {
      properties[key] = value;
    }
  }

  return [fragments, properties];
}

function isFragment(prop: any) {
  return (
    prop != null &&
    typeof prop === 'object' &&
    'kind' in prop &&
    prop.kind === LEGACY_KIND_FRAGMENT
  );
}

function adaptLegacyFragmentsSerialization(
  fragments: any,
  options?: LegacyRemoteChannelOptions,
) {
  return Object.entries(fragments).map(([slot, fragment]) => {
    return adaptLegacyFragmentSerialization(slot, fragment, options);
  });
}

function adaptLegacyFragmentSerialization(
  slot: string,
  fragment: any,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization {
  return {
    id: fragment.id,
    element: 'remote-fragment',
    attributes: {
      slot,
    },
    type: NODE_TYPE_ELEMENT,
    children: fragment.children.map((child: any) => {
      return adaptLegacyNodeSerialization(child, options);
    }),
  };
}
