import {ROOT_ID, MUTATION_TYPE_INSERT_CHILD} from '../constants.ts';
import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

import {
  remoteConnection,
  connectRemoteNode,
  serializeRemoteNode,
  updateRemoteElementProperty,
  callRemoteElementMethod,
  REMOTE_IDS,
} from './internals.ts';

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
        i,
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
