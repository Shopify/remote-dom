import reactReconciler from 'react-reconciler';

import {RemoteRoot, RemoteText, RemoteComponent} from '@remote-ui/core';

const reconciler = reactReconciler<
  // type
  string,
  // props
  Record<string, unknown>,
  // root container
  RemoteRoot,
  // view instance
  RemoteComponent<any, any>,
  // text instance
  RemoteText<any>,
  unknown,
  unknown,
  {},
  // update payload
  object,
  unknown,
  unknown,
  unknown
>({
  now: Date.now,
  setTimeout,
  clearTimeout,
  noTimeout: false,
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
  createTextInstance(text, fragment) {
    return fragment.createText(text);
  },
  createInstance(type, allProps, fragment) {
    const {children: _children, ...props} = allProps;
    return fragment.createComponent(type, props as any);
  },

  // Updates
  commitTextUpdate(text, _oldText, newText) {
    text.updateText(newText);
  },
  prepareUpdate(_instance, _type, oldProps, newProps) {
    const updateProps: Record<string, unknown> = {};

    let needsUpdate = false;

    for (const key in oldProps) {
      if (!Reflect.has(oldProps, key) || key === 'children') {
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
      if (!Reflect.has(newProps, key) || key === 'children') {
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

  // Update children
  appendInitialChild(parent, child) {
    (parent as any).appendChild(child);
  },
  appendChild(parent, child) {
    (parent as any).appendChild(child);
  },
  insertBefore(parent, newChild, beforeChild) {
    (parent as any).insertChildBefore(newChild, beforeChild);
  },
  removeChild(parent, child) {
    (parent as any).removeChild(child);
  },

  // Deferred callbacks
  scheduleDeferredCallback() {},
  cancelDeferredCallback() {},

  // Unknown
  finalizeInitialChildren() {
    return false;
  },
  shouldSetTextContent() {
    return false;
  },
  getPublicInstance() {},
  shouldDeprioritizeSubtree() {
    return false;
  },
  prepareForCommit() {},
  resetAfterCommit() {},
  commitMount() {},
});

export default reconciler;
