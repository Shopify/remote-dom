import {
  remoteId,
  setRemoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
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
  readonly connection: RemoteConnection;
  readonly #observed: Set<Node>;

  constructor(connection: RemoteConnection) {
    super((records) => {
      const addedNodes: Node[] = [];
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

          // A mutation observer will queue some changes, so we might get one record
          // for attaching a parent element, and additional records for attaching descendants.
          // We serialize the entire tree when a new node was added, so we don’t want to
          // send additional “insert child” records when we see those descendants — they
          // will already be included the insertion of the parent.
          record.addedNodes.forEach((node, index) => {
            if (
              addedNodes.some((addedNode) => {
                return addedNode === node || addedNode.contains(node);
              })
            ) {
              return;
            }

            addedNodes.push(node);
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

    this.connection = connection;
    this.#observed = new Set();
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
       * The ID of the root element. If you do not provide an ID, a default value
       * considered to be the “root” element will be used. This means that its remote
       * attributes, properties, event listeners, and children will all be sent as the root
       * element to the remote receiver.
       *
       * You need to override the default behavior if you are wanting to observe a set of
       * nodes, and send each of them to the remote receiver. This may be needed when observing
       * a `DocumentFragment` or `<template>` element, which allow for multiple children.
       */
      id?: string;

      /**
       * Whether to send the initial state of the tree to the mutation
       * callback.
       *
       * @default true
       */
      initial?: boolean;
    },
  ) {
    const id = options?.id ?? ROOT_ID;
    setRemoteId(target, id);
    this.#observed.add(target);

    if (options?.initial !== false && target.childNodes.length > 0) {
      if (id !== ROOT_ID) {
        this.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            ROOT_ID,
            serializeRemoteNode(target),
            this.#observed.size - 1,
          ],
        ]);
      } else if (target.childNodes.length > 0) {
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
    }

    super.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      ...options,
    });
  }

  disconnect({empty = false}: {empty?: boolean} = {}) {
    if (empty && this.#observed.size > 0) {
      const records: RemoteMutationRecord[] = [];

      for (const node of this.#observed) {
        disconnectRemoteNode(node);
        const id = remoteId(node);

        if (id === ROOT_ID) {
          for (let i = 0; i < node.childNodes.length; i++) {
            records.push([MUTATION_TYPE_REMOVE_CHILD, id, 0]);
          }
        } else {
          records.push([MUTATION_TYPE_REMOVE_CHILD, ROOT_ID, 0]);
        }
      }

      this.connection.mutate(records);
    }

    this.#observed.clear();
    super.disconnect();
  }
}

function indexOf(node: Node, list: NodeList) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === node) return i;
  }

  return -1;
}
