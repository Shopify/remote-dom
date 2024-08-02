import {Window, HOOKS, type Hooks} from '@remote-dom/polyfill';

import {
  REMOTE_CONNECTION,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
} from './constants.ts';
import {
  remoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
  type RemoteConnectedNode,
} from './elements/internals.ts';

const window = new Window();
const hooks = window[HOOKS];

Window.setGlobal(window);

hooks.insertChild = (parent, node, index) => {
  const connection = (parent as RemoteConnectedNode)[REMOTE_CONNECTION];
  if (connection == null) return;

  connectRemoteNode(node, connection);

  connection.mutate([
    [
      MUTATION_TYPE_INSERT_CHILD,
      remoteId(parent),
      serializeRemoteNode(node),
      index,
    ],
  ]);
};

hooks.removeChild = (parent, node, index) => {
  const connection = (parent as RemoteConnectedNode)[REMOTE_CONNECTION];
  if (connection == null) return;

  disconnectRemoteNode(node);

  connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, remoteId(parent), index]]);
};

hooks.setText = (text, data) => {
  const connection = (text as RemoteConnectedNode)[REMOTE_CONNECTION];
  if (connection == null) return;

  connection.mutate([[MUTATION_TYPE_UPDATE_TEXT, remoteId(text), data]]);
};

hooks.setAttribute = (element, name, value) => {
  const callback = (element as RemoteConnectedNode)[REMOTE_CONNECTION];
  const properties = (element as RemoteConnectedNode)[REMOTE_PROPERTIES];

  if (callback == null || properties != null) return;

  callback.mutate([
    [
      MUTATION_TYPE_UPDATE_PROPERTY,
      remoteId(element),
      name,
      value ?? undefined,
    ],
  ]);
};

export {hooks, window, type Hooks};
