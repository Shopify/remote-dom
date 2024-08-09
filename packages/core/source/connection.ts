import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from './constants.ts';
import type {
  RemoteConnection,
  RemoteMutationRecordInsertChild,
  RemoteMutationRecordRemoveChild,
  RemoteMutationRecordUpdateText,
  RemoteMutationRecordUpdateProperty,
} from './types.ts';

export type {RemoteConnection};

export interface RemoteConnectionHandler {
  /**
   * Handles the `call()` operation on the `RemoteConnection`.
   */
  call: RemoteConnection['call'];

  /**
   * Handles the `MUTATION_TYPE_INSERT_CHILD` mutation record.
   */
  insertChild(
    id: RemoteMutationRecordInsertChild[1],
    child: RemoteMutationRecordInsertChild[2],
    index: RemoteMutationRecordInsertChild[3],
  ): void;

  /**
   * Handles the `MUTATION_TYPE_REMOVE_CHILD` mutation record.
   */
  removeChild(
    id: RemoteMutationRecordRemoveChild[1],
    index: RemoteMutationRecordRemoveChild[2],
  ): void;

  /**
   * Handles the `MUTATION_TYPE_UPDATE_TEXT` mutation record.
   */
  updateText(
    id: RemoteMutationRecordUpdateText[1],
    text: RemoteMutationRecordUpdateText[2],
  ): void;

  /**
   * Handles the `MUTATION_TYPE_UPDATE_PROPERTY` mutation record.
   */
  updateProperty(
    id: RemoteMutationRecordUpdateProperty[1],
    property: RemoteMutationRecordUpdateProperty[2],
    value: RemoteMutationRecordUpdateProperty[3],
    type?: RemoteMutationRecordUpdateProperty[4],
  ): void;
}

/**
 * A helper for creating a `RemoteConnection` object. The `RemoteConnection`
 * protocol is pretty low-level; this function provides more human-friendly
 * naming on top of the protocol.
 */
export function createRemoteConnection({
  call,
  insertChild,
  removeChild,
  updateText,
  updateProperty,
}: RemoteConnectionHandler): RemoteConnection {
  const handlers = {
    [MUTATION_TYPE_INSERT_CHILD]: insertChild,
    [MUTATION_TYPE_REMOVE_CHILD]: removeChild,
    [MUTATION_TYPE_UPDATE_TEXT]: updateText,
    [MUTATION_TYPE_UPDATE_PROPERTY]: updateProperty,
  };

  return {
    call,
    mutate(records) {
      for (const [type, ...args] of records) {
        (handlers[type] as any)(...args);
      }
    },
  };
}
