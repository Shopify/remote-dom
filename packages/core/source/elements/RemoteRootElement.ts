import {MUTATION_TYPE_INSERT_CHILD, ROOT_ID} from '../constants.ts';
import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

import {
  callRemoteElementMethod,
  connectRemoteNode,
  REMOTE_IDS,
  remoteConnection,
  serializeRemoteNode,
  updateRemoteElementProperty,
} from './internals.ts';

/**
 * A custom element that represents the root of a remote tree of elements.
 * To use this element, define it as a custom element and create it with
 * `document.createElement()`. Then, call its `connect()` method with a
 * `RemoteConnection` instance from a host environment, and start appending
 * child nodes to the tree. Any changes to the tree nested under this element
 * will be synchronized with the host environment automatically.
 *
 * @example
 * ```ts
 * import {RemoteRootElement} from '@remote-dom/core/elements';
 *
 * customElements.define('remote-root', RemoteRootElement);
 *
 * const element = document.createElement('remote-root');
 *
 * withRemoteConnectionFromHost((connection) => {
 *   element.connect(connection);
 * });
 *
 * element.append('Hello world!');
 */
export class RemoteRootElement extends HTMLElement {
  constructor() {
    super();
    REMOTE_IDS.set(this, ROOT_ID);
  }

  connect(connection: RemoteConnection): void {
    if (remoteConnection(this) === connection) return;

    connectRemoteNode(this, connection);

    if (this.childNodes.length === 0) return;

    const records: RemoteMutationRecord[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const node = this.childNodes[i]!;

      records.push([
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        serializeRemoteNode(node),
      ]);
    }

    connection.mutate(records);
  }

  updateRemoteProperty(name: string, value?: unknown) {
    updateRemoteElementProperty(this, name, value);
  }

  callRemoteMethod(method: string, ...args: any[]) {
    return callRemoteElementMethod(this, method, ...args);
  }
}
