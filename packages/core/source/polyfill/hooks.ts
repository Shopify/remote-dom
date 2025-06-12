import {HOOKS, type Hooks} from '@remote-dom/polyfill';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
} from '../constants.ts';

import {
  remoteId,
  remoteConnection,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
  updateRemoteElementAttribute,
} from '../elements/internals.ts';

import {window} from './window.ts';

const hooks = window[HOOKS];

hooks.insertChild = (parent, node, index) => {
  const connection = remoteConnection(parent);
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
  const connection = remoteConnection(parent);
  if (connection == null) return;

  disconnectRemoteNode(node);

  connection.mutate([[MUTATION_TYPE_REMOVE_CHILD, remoteId(parent), index]]);
};

hooks.setText = (text, data) => {
  const connection = remoteConnection(text);
  if (connection == null) return;

  connection.mutate([[MUTATION_TYPE_UPDATE_TEXT, remoteId(text), data]]);
};

// When an attribute is updated, we will send a message to the host to update the
// attribute, but only for native HTML elements. Custom elements are expected to
// handle their own attribute updates (which is done automatically in the `RemoteElement`
// base class).

hooks.setAttribute = (element, name, value) => {
  // Custom elements need to define their own logic for handling attribute
  // updates.
  if (element.tagName.includes('-')) return;

  updateRemoteElementAttribute(element, name, value);
};

hooks.removeAttribute = (element, name) => {
  // Custom elements need to define their own logic for handling attribute
  // updates.
  if (element.tagName.includes('-')) return;

  updateRemoteElementAttribute(element, name);
};

export {hooks, type Hooks};
