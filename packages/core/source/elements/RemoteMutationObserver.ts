import {
  remoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
} from './internals.ts';
import {
  ROOT_ID,
  REMOTE_ID,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from '../constants.ts';
import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

export class RemoteMutationObserver extends MutationObserver {
  constructor(private readonly connection: RemoteConnection) {
    super((records) => {
      const remoteRecords: RemoteMutationRecord[] = [];

      for (const record of records) {
        const targetId = remoteId(record.target);

        if (record.type === 'childList') {
          const position = record.previousSibling
            ? indexOf(record.previousSibling, record.target.childNodes) + 1
            : 0;

          record.removedNodes.forEach((node) => {
            disconnectRemoteNode(node);

            remoteRecords.push([
              MUTATION_TYPE_REMOVE_CHILD,
              targetId,
              position,
            ]);
          });

          record.addedNodes.forEach((node, index) => {
            connectRemoteNode(node, connection);

            remoteRecords.push([
              MUTATION_TYPE_INSERT_CHILD,
              targetId,
              serializeRemoteNode(node),
              position + index,
            ]);
          });
        } else if (record.type === 'characterData') {
          remoteRecords.push([
            MUTATION_TYPE_UPDATE_TEXT,
            targetId,
            record.target.textContent ?? '',
          ]);
        } else if (
          record.type === 'attributes' &&
          record.attributeName != null &&
          !(REMOTE_PROPERTIES in record.target)
        ) {
          remoteRecords.push([
            MUTATION_TYPE_UPDATE_PROPERTY,
            targetId,
            record.attributeName,
            (record.target as Element).getAttribute(record.attributeName),
          ]);
        }
      }

      connection.mutate(remoteRecords);
    });
  }

  observe(
    target: Node,
    options?: MutationObserverInit & {
      /**
       * Whether to send the initial state of the tree to the mutation
       * callback.
       *
       * @default true
       */
      initial?: boolean;
    },
  ) {
    Object.defineProperty(target, REMOTE_ID, {value: ROOT_ID});

    if (options?.initial !== false && target.childNodes.length > 0) {
      const records: RemoteMutationRecord[] = [];

      for (let i = 0; i < target.childNodes.length; i++) {
        const node = target.childNodes[i]!;
        connectRemoteNode(node, this.connection);

        records.push([
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          serializeRemoteNode(node),
          i,
        ]);
      }

      this.connection.mutate(records);
    }

    super.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      ...options,
    });
  }
}

function indexOf(node: Node, list: NodeList) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === node) return i;
  }

  return -1;
}
