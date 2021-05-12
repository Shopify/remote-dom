import {isValidElement} from 'react';
import reactReconciler from 'react-reconciler';

import type {
  RemoteRoot,
  RemoteText,
  RemoteComponent,
  RemoteComponentType,
  RemoteFragment,
} from '@remote-ui/core';
import {KIND_FRAGMENT} from '@remote-ui/core';

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
    return root.createComponent(type, normalizeProps(props, root));
  },

  // Updates
  commitTextUpdate(text, _oldText, newText) {
    text.updateText(newText);
  },
  prepareUpdate(instance, _type, oldProps, newProps, root) {
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

    // eslint-disable-next-line guard-for-in
    for (const key in updateProps) {
      const element = updateProps[key] as any;
      if (!isValidElement(element)) continue;

      let fragmentContainer:
        | RemoteReactFragment
        | undefined = (instance.props as any)[key];
      if (isRemoteReactFragment(fragmentContainer)) {
        delete updateProps[key];
      } else {
        fragmentContainer = createRemoteReactFragment(root);
        updateProps[key] = fragmentContainer;
      }
      fragmentContainer.render(element);
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

function normalizeProps(props: unknown, root: RemoteRoot) {
  if (props === null || typeof props !== 'object') return props;
  return Object.keys(props as any).reduce((acc, key) => {
    const element = (props as any)[key];
    if (!isValidElement(element)) return {...acc, [key]: element};

    const fragmentContainer = createRemoteReactFragment(root);
    fragmentContainer.render(element);
    return {
      ...acc,
      [key]: fragmentContainer,
    };
  }, {} as any);
}

type RemoteReactFragment = RemoteFragment & {
  render: (element: React.ReactElement) => void;
};

function isRemoteReactFragment(object: any): object is RemoteReactFragment {
  return (
    object !== null &&
    typeof object === 'object' &&
    (object as any).kind === KIND_FRAGMENT &&
    'render' in object
  );
}

function createRemoteReactFragment(root: RemoteRoot): RemoteReactFragment {
  const fragment = root.createFragment();
  const subTree: RemoteRoot = {
    ...root,
    get children() {
      return fragment.children as any;
    },
    appendChild(child) {
      return fragment.appendChild(child);
    },
    removeChild(child) {
      return fragment.removeChild(child);
    },
    insertChildBefore(child, before) {
      return fragment.insertChildBefore(child, before);
    },
    mount() {
      return Promise.resolve();
    },
  };
  const container = reconciler.createContainer(subTree, 0, false, null);
  const render: RemoteReactFragment['render'] = (element) => {
    reconciler.updateContainer(element, container, null, () => {});
  };
  Object.assign(fragment, {render});
  return fragment as any;
}

export default reconciler;
