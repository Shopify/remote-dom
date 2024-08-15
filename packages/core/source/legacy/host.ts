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

import {
  LEGACY_KIND_TEXT,
  LEGACY_ACTION_MOUNT,
  LEGACY_ACTION_INSERT_CHILD,
  LEGACY_ACTION_REMOVE_CHILD,
  LEGACY_ACTION_UPDATE_PROPS,
  LEGACY_ACTION_UPDATE_TEXT,
  type LegacyRemoteChannel,
  type LegacyActionArgumentMap,
  type LegacyRemoteComponentSerialization,
  type LegacyRemoteTextSerialization,
} from './remote-ui.ts';

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

        connection.mutate(records);
        break;

      case LEGACY_ACTION_INSERT_CHILD:
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

        const propRecords = Object.entries(props).map(
          ([key, value]) =>
            [
              MUTATION_TYPE_UPDATE_PROPERTY,
              id,
              key,
              value,
            ] satisfies RemoteMutationRecord,
        );

        connection.mutate(propRecords);
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
