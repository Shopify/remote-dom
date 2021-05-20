import reactReconciler from 'react-reconciler';

import type {
  RemoteRoot,
  RemoteText,
  RemoteComponent,
  RemoteComponentType,
} from '@remote-ui/core';

const reconciler = reactReconciler<
  // type
  RemoteComponentType<string, any>,
  // props
  Record<string, unknown>,
  // root container
  RemoteRoot,
  // view instance
  RemoteComponent<any, any>,
  // text instance
  RemoteText<any>,
  // suspense instance
  never,
  // hydratable instance
  unknown,
  // public instance
  unknown,
  // host context
  {},
  // update payload
  object,
  // child set
  unknown,
  // timeout handle
  unknown,
  // notimeout
  unknown
>({
  now: Date.now,

  // Timeout
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: false,
  // @see https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js#L408
  queueMicrotask: (callback) =>
    Promise.resolve(null).then(callback).catch(handleErrorInNextTick),

  isPrimaryRenderer: true,
  supportsMutation: true,
  supportsHydration: false,
  supportsPersistence: false,

  // Context
  getRootHostContext() {
    return {};
  },
  getChildHostContext(context) {
    return context;
  },

  // Instances
  createTextInstance(text, root) {
    return root.createText(text);
  },
  createInstance(type, allProps, root) {
    const {children: _children, ...props} = allProps;
    return root.createComponent(type, props);
  },

  // Updates
  commitTextUpdate(text, _oldText, newText) {
    text.updateText(newText);
  },
  prepareUpdate(_instance, _type, oldProps, newProps) {
    const updateProps: Record<string, unknown> = {};
    let needsUpdate = false;

    for (const key in oldProps) {
      if (!has(oldProps, key) || key === 'children') {
        continue;
      }

      if (!(key in newProps)) {
        needsUpdate = true;
        updateProps[key] = undefined;
        // } else if (typeof oldProps[key] === 'function') {
        //   if (typeof newProps[key] === 'function') {
        //     fragment.controller.functions.exchange(
        //       oldProps[key] as Function,
        //       newProps[key] as Function,
        //     );
        //   } else {
        //     needsUpdate = true;
        //     fragment.controller.functions.revoke(oldProps[key] as Function);
        //     updateProps[key] = newProps[key];
        //   }
      } else if (oldProps[key] !== newProps[key]) {
        needsUpdate = true;
        updateProps[key] = newProps[key];
      }
    }

    for (const key in newProps) {
      if (!has(newProps, key) || key === 'children') {
        continue;
      }

      if (!(key in oldProps)) {
        needsUpdate = true;
        updateProps[key] = newProps[key];
      }
    }

    return needsUpdate ? updateProps : null;
  },
  commitUpdate(instance, payload) {
    instance.updateProps(payload);
  },

  // Update root
  appendChildToContainer(remoteRoot, child) {
    remoteRoot.appendChild(child);
  },
  insertInContainerBefore(remoteRoot, child, beforeChild) {
    remoteRoot.insertChildBefore(child, beforeChild);
  },
  removeChildFromContainer(remoteRoot, child) {
    remoteRoot.removeChild(child);
  },
  clearContainer(remoteRoot) {
    for (const child of remoteRoot.children) {
      remoteRoot.removeChild(child);
    }
  },

  // Update children
  appendInitialChild(parent, child) {
    parent.appendChild(child);
  },
  appendChild(parent, child) {
    parent.appendChild(child);
  },
  insertBefore(parent, newChild, beforeChild) {
    parent.insertChildBefore(newChild, beforeChild);
  },
  removeChild(parent, child) {
    parent.removeChild(child);
  },

  // Unknown
  finalizeInitialChildren() {
    return false;
  },
  shouldSetTextContent() {
    return false;
  },
  getPublicInstance() {},
  prepareForCommit() {
    return null;
  },
  resetAfterCommit() {},
  commitMount() {},
  preparePortalMount() {},
});

function handleErrorInNextTick(error: Error) {
  setTimeout(() => {
    throw error;
  });
}

const {hasOwnProperty} = {};
function has(object: object, property: string | number | symbol) {
  return hasOwnProperty.call(object, property);
}

export default reconciler;
