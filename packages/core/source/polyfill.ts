import {
  hooks,
  Window,
  installWindowAsGlobal,
  type Hooks,
} from '@remote-dom/polyfill';

import {
  REMOTE_CALLBACK,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from './constants.ts';
import {
  remoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
} from './elements/internals.ts';

const window = new Window();

installWindowAsGlobal(window);

hooks.insertChild = (parent, node, index) => {
  const callback = (parent as any)[REMOTE_CALLBACK];
  if (callback == null) return;

  connectRemoteNode(node, callback);

  callback([
    [
      MUTATION_TYPE_INSERT_CHILD,
      remoteId(parent),
      serializeRemoteNode(node),
      index,
    ],
  ]);
};

hooks.removeChild = (parent, node, index) => {
  const callback = (parent as any)[REMOTE_CALLBACK];
  if (callback == null) return;

  disconnectRemoteNode(node);

  callback([[MUTATION_TYPE_REMOVE_CHILD, remoteId(parent), index]]);
};

hooks.setText = (text, data) => {
  const callback = (text as any)[REMOTE_CALLBACK];
  if (callback == null) return;

  callback([[MUTATION_TYPE_UPDATE_TEXT, remoteId(text), data]]);
};

hooks.setAttribute = (element, name, value) => {
  const callback = (element as any)[REMOTE_CALLBACK];
  const properties = (element as any)[REMOTE_PROPERTIES];

  if (callback == null || properties != null) return;

  callback([
    [
      MUTATION_TYPE_UPDATE_PROPERTY,
      remoteId(element),
      name,
      value ?? undefined,
    ],
  ]);
};

export {hooks, window, type Hooks};
