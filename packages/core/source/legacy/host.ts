import type {
  RemoteConnection,
  RemoteMutationRecord,
  RemoteTextSerialization,
  RemoteElementSerialization,
} from '../types.ts'; // Adjust this import path as needed
import {
  ROOT_ID,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
} from '../constants.ts';

import {
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

export function adaptToLegacyRemoteChannel(
  connection: RemoteConnection,
): LegacyRemoteChannel {
  return function remoteChannel<T extends keyof LegacyActionArgumentMap>(
    type: T,
    ...payload: LegacyActionArgumentMap[T]
  ) {
    switch (type) {
      case LEGACY_ACTION_MOUNT:
        const [nodes] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_MOUNT];

        const records: RemoteMutationRecord[] = nodes.map((node, index) => [
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          node,
          index,
        ]);

        connection.mutate(records);
        break;

      case LEGACY_ACTION_INSERT_CHILD:
        const [parentId, index, child] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_INSERT_CHILD];

        connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            parentId ?? ROOT_ID,
            child as
              | LegacyRemoteTextSerialization
              | LegacyRemoteElementSerialization,
            index,
          ],
        ]);

        break;

      case LEGACY_ACTION_REMOVE_CHILD: {
        const [removeParentId, removeIndex] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_REMOVE_CHILD];

        connection.mutate([
          [MUTATION_TYPE_REMOVE_CHILD, removeParentId ?? ROOT_ID, removeIndex],
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
        const [propsId, props] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_PROPS];

        const propRecords: RemoteMutationRecord[] = Object.entries(props).map(
          ([key, value]) => [
            MUTATION_TYPE_UPDATE_PROPERTY,
            propsId,
            key,
            value,
          ],
        );

        connection.mutate(propRecords);
        break;
      }

      default:
        throw new Error(`Unsupported action type: ${type}`);
    }
  };
}
