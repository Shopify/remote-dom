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
  type RemoteFragmentSerialization as LegacyRemoteFragmentSerialization,
} from '@remote-ui/core';

import type {
  RemoteConnection,
  RemoteMutationRecord,
  RemoteTextSerialization,
  RemoteElementSerialization,
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
  fragments?: {element?: string};
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
  const elementToFragments = new Map<string, Map<string, string>>();
  const elementToChildCount = new Map<string, number>();
  const fragmentIndexes = new Map<
    LegacyRemoteFragmentSerialization['id'],
    number
  >();

  return function remoteChannel<T extends keyof LegacyActionArgumentMap>(
    type: T,
    ...payload: LegacyActionArgumentMap[T]
  ) {
    switch (type) {
      case LEGACY_ACTION_MOUNT: {
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

        connection.mutate(records);
        break;
      }

      case LEGACY_ACTION_INSERT_CHILD: {
        const [parentId, index, child] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_INSERT_CHILD];

        connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            parentId ?? ROOT_ID,
            adaptLegacyNodeSerialization(child, options),
            index,
          ],
        ]);

        break;
      }

      case LEGACY_ACTION_REMOVE_CHILD: {
        const [parentID, removeIndex] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_REMOVE_CHILD];

        connection.mutate([
          [MUTATION_TYPE_REMOVE_CHILD, parentID ?? ROOT_ID, removeIndex],
        ]);

        break;
      }

      case LEGACY_ACTION_UPDATE_TEXT: {
        const [textId, text] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_TEXT];

        connection.mutate([[MUTATION_TYPE_UPDATE_TEXT, textId, text]]);
        break;
      }

      case LEGACY_ACTION_UPDATE_PROPS: {
        const [id, props] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_PROPS];

        const mutations: RemoteMutationRecord[] = [];
        let elementFragmentMap = elementToFragments.get(id);

        for (const [key, value] of Object.entries(props)) {
          const isFragment = isFragmentSerialization(value);
          const oldFragmentID = elementFragmentMap?.get(key);

          if (
            oldFragmentID != null &&
            (!isFragment || oldFragmentID !== value.id)
          ) {
            const oldIndex = fragmentIndexes.get(oldFragmentID)!;
            fragmentIndexes.delete(oldFragmentID);
            elementFragmentMap!.delete(key);

            mutations.push([MUTATION_TYPE_REMOVE_CHILD, id, oldIndex]);
          }

          if (isFragment) {
            const fragmentID = value.id;
            if (value.id === oldFragmentID) continue;

            if (elementFragmentMap == null) {
              elementFragmentMap = new Map();
              elementToFragments.set(id, elementFragmentMap);
            }

            const fragmentIndex =
              (elementToChildCount.get(id) ?? 0) + elementFragmentMap.size;

            elementFragmentMap.set(key, fragmentID);
            fragmentIndexes.set(fragmentID, fragmentIndex);

            mutations.push([
              MUTATION_TYPE_INSERT_CHILD,
              id,
              adaptLegacyFragmentSerialization(value, key, options),
              fragmentIndex,
            ]);

            continue;
          }

          mutations.push([MUTATION_TYPE_UPDATE_PROPERTY, id, key, value]);
        }

        if (elementFragmentMap?.size === 0) {
          elementToFragments.delete(id);
        }

        connection.mutate(mutations);
        break;
      }

      default: {
        throw new Error(`Unsupported action type: ${type}`);
      }
    }
  };
}

function isFragmentSerialization(
  value: any,
): value is LegacyRemoteFragmentSerialization {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as LegacyRemoteFragmentSerialization).kind === LEGACY_KIND_FRAGMENT
  );
}

function adaptLegacyNodeSerialization(
  node: LegacyRemoteComponentSerialization | LegacyRemoteTextSerialization,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization | RemoteTextSerialization {
  switch (node.kind) {
    case LEGACY_KIND_TEXT:
      return adaptLegacyTextSerialization(node);
    default:
      return adaptLegacyComponentSerialization(node, options);
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

  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element,
    properties: props,
    children: children.map((child) => {
      return adaptLegacyNodeSerialization(child, options);
    }),
  };
}

function adaptLegacyFragmentSerialization(
  {id, children}: LegacyRemoteFragmentSerialization,
  slot: string,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization {
  const element = options?.fragments?.element ?? 'remote-fragment';

  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element,
    properties: {slot},
    children: children.map((child) => {
      return adaptLegacyNodeSerialization(child, options);
    }),
  };
}
