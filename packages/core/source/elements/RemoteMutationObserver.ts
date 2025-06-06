import {
  remoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
  REMOTE_IDS,
} from './internals.ts';
import {
  ROOT_ID,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from '../constants.ts';
import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

/**
 * Builds on the browser’s [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
 * to detect changes in a remote element, and to communicate those changes in a way
 * that Remote DOM can understand. You create this object from a “remote
 * connection”, which you’ll generally get from the [`@remote-dom/core/receiver`](/packages/core#remote-domcorereceiver)
 * package. Then, you’ll observe changes in the HTML element that contains your
 * tree of remote elements.
 *
 * @example
 * import {RemoteMutationObserver} from '@remote-dom/core/elements';
 *
 * const observer = new RemoteMutationObserver(connection);
 *
 * // Now, any changes to the `body` element will be communicated
 * // to the host environment.
 * observer.observe(document.body);
 */
export class RemoteMutationObserver extends MutationObserver {
  constructor(private readonly connection: RemoteConnection) {
    super((records) => {
      const remoteRecords: RemoteMutationRecord[] = [];

      for (const record of records) {
        const targetId = remoteId(record.target);

        if (record.type === 'childList') {
          record.removedNodes.forEach((node) => {
            if (!REMOTE_IDS.has(node)) {
              /**
               * This happens if the node was not recognized during the
               * `serializeRemoteNode` of a (probably direct and extensive)
               * previous mutation-record, when it was no longer in the DOM
               * at that time of processing.
               */
              return;
            }

            disconnectRemoteNode(node);

            remoteRecords.push([
              MUTATION_TYPE_REMOVE_CHILD,
              targetId,
              remoteId(node),
            ]);
          });

          record.addedNodes.forEach((node) => {
            connectRemoteNode(node, connection);

            remoteRecords.push([
              MUTATION_TYPE_INSERT_CHILD,
              targetId,
              serializeRemoteNode(node),
              record.nextSibling ? remoteId(record.nextSibling) : undefined,
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
          record.target instanceof Element &&
          !record.target.tagName.includes('-')
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

  /**
   * Starts watching changes to the element, and communicates changes to the
   * host environment. By default, this method will also communicate any initial
   * children of the element to the host environment.
   */
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
    REMOTE_IDS.set(target, ROOT_ID);

    if (options?.initial !== false && target.childNodes.length > 0) {
      const records: RemoteMutationRecord[] = [];

      for (let i = 0; i < target.childNodes.length; i++) {
        const node = target.childNodes[i]!;
        connectRemoteNode(node, this.connection);

        records.push([
          MUTATION_TYPE_INSERT_CHILD,
          ROOT_ID,
          serializeRemoteNode(node),
          undefined,
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
