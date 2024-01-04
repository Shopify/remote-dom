import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from './constants.ts';
import type {
  RemoteConnection,
  RemoteMutationRecord,
  RemoteMutationRecordInsertChild,
  RemoteMutationRecordRemoveChild,
  RemoteMutationRecordUpdateText,
  RemoteMutationRecordUpdateProperty,
} from './types.ts';

export type {RemoteConnection};

export interface RemoteConnectionHandler {
  call: RemoteConnection['call'];
  insertChild(
    id: RemoteMutationRecordInsertChild[1],
    child: RemoteMutationRecordInsertChild[2],
    index: RemoteMutationRecordInsertChild[3],
  ): void;
  removeChild(
    id: RemoteMutationRecordRemoveChild[1],
    index: RemoteMutationRecordRemoveChild[2],
  ): void;
  updateText(
    id: RemoteMutationRecordUpdateText[1],
    text: RemoteMutationRecordUpdateText[2],
  ): void;
  updateProperty(
    id: RemoteMutationRecordUpdateProperty[1],
    property: RemoteMutationRecordUpdateProperty[2],
    value: RemoteMutationRecordUpdateProperty[3],
  ): void;
}

export function createRemoteConnection({
  call,
  insertChild,
  removeChild,
  updateText,
  updateProperty,
}: RemoteConnectionHandler): RemoteConnection {
  const messageMap = new Map<RemoteMutationRecord[0], (...args: any[]) => any>([
    [MUTATION_TYPE_INSERT_CHILD, insertChild],
    [MUTATION_TYPE_REMOVE_CHILD, removeChild],
    [MUTATION_TYPE_UPDATE_TEXT, updateText],
    [MUTATION_TYPE_UPDATE_PROPERTY, updateProperty],
  ]);

  return {
    call,
    mutate(records) {
      for (const [type, ...args] of records) {
        messageMap.get(type)!(...args);
      }
    },
  };
}
