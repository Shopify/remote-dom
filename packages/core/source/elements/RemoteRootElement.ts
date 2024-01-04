import {
  ROOT_ID,
  REMOTE_ID,
  REMOTE_CONNECTION,
  MUTATION_TYPE_INSERT_CHILD,
} from '../constants.ts';
import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

import {connectRemoteNode, serializeRemoteNode} from './internals.ts';

export class RemoteRootElement extends HTMLElement {
  readonly [REMOTE_ID] = ROOT_ID;

  [REMOTE_CONNECTION]?: RemoteConnection;

  connect(connection: RemoteConnection): void {
    if (this[REMOTE_CONNECTION] === connection) return;

    connectRemoteNode(this, connection);

    if (this.childNodes.length === 0) return;

    const records: RemoteMutationRecord[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const node = this.childNodes[i]!;

      records.push([
        MUTATION_TYPE_INSERT_CHILD,
        ROOT_ID,
        serializeRemoteNode(node),
        i,
      ]);
    }
  }
}
