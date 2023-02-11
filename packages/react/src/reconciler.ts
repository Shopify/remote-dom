import reactReconciler from 'react-reconciler';
import type {Reconciler as ReactReconciler} from 'react-reconciler';
import type {
  RemoteRoot,
  RemoteText,
  RemoteComponent,
  RemoteComponentType,
} from '@remote-ui/core';

type Type = RemoteComponentType<string, any>;
type Props = Record<string, unknown>;
type ViewInstance = RemoteComponent<any, any>;
type TextInstance = RemoteText<any>;
type HostContext = Record<string, never>;
type UpdatePayload = Record<string, unknown>;
type SuspenseInstance = never;
type PublicInstance = unknown;
type HydratableInstance = unknown;
type ChildSet = unknown;
type TimeoutHandle = unknown;
type NoTimeout = unknown;

export type Reconciler = ReactReconciler<
  RemoteRoot,
  ViewInstance,
  TextInstance,
  SuspenseInstance,
  PublicInstance
>;

export const createReconciler = (options?: {primary?: boolean}) =>
  reactReconciler<
    Type,
    Props,
    RemoteRoot,
    ViewInstance,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    PublicInstance,
    HostContext,
    UpdatePayload,
    ChildSet,
    TimeoutHandle,
    NoTimeout
  >({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Compat for React <= 17.x
    now: Date.now,

    // Timeout
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: false,

    // Microtask scheduling
    // @see https://github.com/facebook/react/blob/2c8a1452b82b9ec5ebfa3f370b31fda19610ae92/packages/react-dom/src/client/ReactDOMHostConfig.js#L391-L401
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - types in `@types/react-reconciler` are outdated
    supportsMicrotasks: true,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - types in `@types/react-reconciler` are outdated
    scheduleMicrotask,

    // Compat for React <= 17.x
    queueMicrotask: scheduleMicrotask,

    isPrimaryRenderer: options?.primary ?? true,
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
      text.update(newText);
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
      remoteRoot.append(child);
    },
    insertInContainerBefore(remoteRoot, child, beforeChild) {
      remoteRoot.insertBefore(child, beforeChild);
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
      parent.append(child);
    },
    appendChild(parent, child) {
      parent.append(child);
    },
    insertBefore(parent, newChild, beforeChild) {
      parent.insertBefore(newChild, beforeChild);
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
    detachDeletedInstance() {},
  });

function scheduleMicrotask(callback: () => void) {
  return typeof queueMicrotask === 'function'
    ? queueMicrotask
    : Promise.resolve(null).then(callback).catch(handleErrorInNextTick);
}

function handleErrorInNextTick(error: Error) {
  setTimeout(() => {
    throw error;
  });
}

const {hasOwnProperty} = {};

function has(object: object, property: string | number | symbol) {
  return hasOwnProperty.call(object, property);
}
