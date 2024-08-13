import {Window, HOOKS, LISTENERS, type Hooks} from '@remote-dom/polyfill';

import {
  REMOTE_CONNECTION,
  REMOTE_PROPERTIES,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_ADD_EVENT_LISTENER,
  MUTATION_TYPE_REMOVE_EVENT_LISTENER,
  REMOTE_ID,
  ROOT_ID,
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

type Node = InstanceType<(typeof window)['Node']>;

const connectedRoots = new WeakSet<RemoteConnectedNode>();

// The first time a root is seen, expose a root-global API to the host
function exposeRoot(root: RemoteConnectedNode) {
  if (connectedRoots.has(root)) return;
  connectedRoots.add(root);
  const connection = root[REMOTE_CONNECTION]!;

  function findById(parent: Node, id: string): Node | undefined {
    let child = parent.firstChild;
    while (child) {
      if ((child as any)[REMOTE_ID] === id) {
        return child;
      }
      const found = findById(child, id);
      if (found) return found;
      child = child.nextSibling;
    }
  }

  connection.call(ROOT_ID, 'expose', {
    dispatchEvent: (targetId: string, type: string, eventInit?: any) => {
      const target = findById(root as any, targetId);
      if (!target) throw Error('dispatchEvent called on invalid target');
      const event = new window.Event(type, eventInit);
      const returnValue = target.dispatchEvent(event) ?? true;
      const cancelBubble = event.cancelBubble;
      const defaultPrevented = event.defaultPrevented;
      const response = (event as any).response;
      // optimization: don't send fully default results
      if (
        returnValue === true &&
        cancelBubble === false &&
        defaultPrevented === false &&
        response == null
      )
        return;
      return {
        returnValue,
        cancelBubble,
        defaultPrevented,
        response,
      };
    },
  });
}

hooks.insertChild = (parent, node, index) => {
  const connection = (parent as RemoteConnectedNode)[REMOTE_CONNECTION];
  if (connection == null) return;

  const parentId = (parent as RemoteConnectedNode)[REMOTE_ID];
  if (parentId === ROOT_ID) exposeRoot(parent);
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

hooks.addEventListener = (
  node: RemoteConnectedNode,
  type,
  _listener,
  _options,
) => {
  const connection = (node as RemoteConnectedNode)[REMOTE_CONNECTION];
  if (connection == null) return;

  // when first listener of a type is added, notify host
  if (getListeners(node, type)?.size === 1) {
    connection.mutate([
      [MUTATION_TYPE_ADD_EVENT_LISTENER, remoteId(node as Element), type],
    ]);
  }
};

hooks.removeEventListener = (
  node: RemoteConnectedNode,
  type,
  _listener,
  _options,
) => {
  const connection = (node as RemoteConnectedNode)[REMOTE_CONNECTION];
  if (connection == null) return;

  // when last listener of a type is removed, notify host
  if (getListeners(node, type)?.size === 0) {
    (node as any)[LISTENERS]?.delete(type);
    connection.mutate([
      [MUTATION_TYPE_REMOVE_EVENT_LISTENER, remoteId(node), type],
    ]);
  }
};

function getListeners(
  node: EventTarget,
  type: string,
): Set<EventListenerOrEventListenerObject> | undefined {
  return (node as any)[LISTENERS]?.get(type);
}

export {hooks, window, type Hooks};
