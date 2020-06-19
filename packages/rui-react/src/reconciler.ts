import reactReconciler from 'react-reconciler';
import {
  RemoteRoot,
  RemoteText,
  RemoteComponent,
  RemoteComponentType,
} from '@shopify/rui-core';

const reconciler = reactReconciler<
  // type
  RemoteComponentType<any, any>,
  // props
  Record<string, unknown>,
  // root container
  RemoteRoot,
  // view instance
  RemoteComponent<any, any>,
  // text instance
  RemoteText<any>,
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

  // NOTE: must ignore the addition of schedulePassiveEffects because
  // @types/react-reconciler is several versions out of date (0.18 vs 0.25) and
  // doesn't know about schedulePassiveEffects (which was added in 0.20)
  //
  // TS Lint we're ignoring:
  // Object literal may only specify known properties, and 'schedulePassiveEffects'
  // does not exist in type 'HostConfig<...>'
  //
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  schedulePassiveEffects(fn: Function) {
    return setTimeout(fn);
  },
  cancelPassiveEffects(handle: number) {
    clearTimeout(handle);
  },

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
