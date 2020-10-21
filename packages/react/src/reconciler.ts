import reactReconciler from 'react-reconciler';

import type {
  RemoteRoot,
  RemoteText,
  RemoteComponent,
  RemoteComponentType,
} from '@remote-ui/core';

const FUNCTION_CURRENT_IMPLEMENTATION_KEY = '__current';

type HotSwappableFunction<T extends Function> = T & {
  [FUNCTION_CURRENT_IMPLEMENTATION_KEY]: any;
};

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
  // hydratable instance
  unknown,
  // public instance
  unknown,
  // host context
  {},
  // update payload
  [object, [HotSwappableFunction<any>, any][]],
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
  createTextInstance(text, root) {
    return root.createText(text);
  },
  createInstance(type, props, root) {
    const finalProps: {[key: string]: any} = {};

    for (const key in props) {
      if (key === 'children') continue;

      const value = props[key];

      finalProps[key] =
        typeof value === 'function'
          ? wrapFunctionToHotSwapImplementation(value)
          : value;
    }

    return root.createComponent(type, finalProps);
  },

  // Updates
  commitTextUpdate(text, _oldText, newText) {
    text.updateText(newText);
  },
  prepareUpdate(instance, _type, oldProps, newProps) {
    const updateProps: Record<string, unknown> = {};
    const hotSwapFunctions: [HotSwappableFunction<any>, any][] = [];

    let needsUpdate = false;

    for (const key in oldProps) {
      if (!Reflect.has(oldProps, key) || key === 'children') {
        continue;
      }

      const oldValue = oldProps[key];
      const newValue = newProps[key];

      // oldProps is the actual props that were passed in, not the adjustments
      // we made to those props in createInstance() or previous commitUpdate()s.
      // When we have an old prop that is a function, we therefore need to get
      // the actual value of that prop from the remote-ui instance, which will be
      // the proxied version of the function (see `wrapFunctionToHotSwapImplementation()`
      // for details on why it is necessary to hot-swap functions).
      if (typeof oldValue === 'function') {
        const oldValueOnRemoteProps = (instance.props as any)[key];

        if (
          oldValueOnRemoteProps?.[FUNCTION_CURRENT_IMPLEMENTATION_KEY] ===
          oldValue
        ) {
          needsUpdate = true;
          hotSwapFunctions.push([oldValueOnRemoteProps, newValue]);
        }
      }

      if (!(key in newProps)) {
        needsUpdate = true;
        updateProps[key] = undefined;
      } else if (oldValue !== newValue) {
        needsUpdate = true;
        updateProps[key] =
          typeof newValue === 'function'
            ? wrapFunctionToHotSwapImplementation(newValue)
            : newValue;
      }
    }

    for (const key in newProps) {
      if (!Reflect.has(newProps, key) || key === 'children') {
        continue;
      }

      if (!(key in oldProps)) {
        const newValue = newProps[key];

        needsUpdate = true;
        updateProps[key] =
          typeof newValue === 'function'
            ? wrapFunctionToHotSwapImplementation(newValue)
            : newValue;
      }
    }

    return needsUpdate ? [updateProps, hotSwapFunctions] : null;
  },
  commitUpdate(instance, [props, hotSwapFunctions]) {
    for (const [hotSwap, newValue] of hotSwapFunctions) {
      hotSwap[FUNCTION_CURRENT_IMPLEMENTATION_KEY] = newValue;
    }

    instance.updateProps(props);
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

  // The react-reconciler types have not been updated to include
  // these, but we *do* need them!
  ...({
    schedulePassiveEffects(fn: Function) {
      return setTimeout(fn);
    },
    cancelPassiveEffects(handle: number) {
      clearTimeout(handle);
    },
  } as {}),

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

// Imagine the following simple React component we might render in a remote context:
//
// function MyComponent() {
//   const [value, setValue] = useState('');
//
//   return (
//     <>
//       <TextField onChange={setValue} value={value} />
//       <Button onPress={() => console.log(value)} />
//     </>
//   );
// }
//
// In this example, assume that the `TextField` `onChange` prop is run on blur.
// If this were React on the host, the following steps would happen if you pressed
// on the button:
//
// 1. The text field blurs, and so calls `onChange()` with its current value, which
//    then calls `setValue()` with the updated value.
// 2. React sees that state has changed, and so it re-runs our component. This results
//    in a new `onPress()` prop for our `Button`, which closes over the most current `value`.
// 3. Handling blur is finished, so the browser now handles the click by calling the
//    (newly-updated) `Button` `onPress()`, which logs out the new value.
//
// Because remote-ui reproduces a UI tree asynchronously from the remote context, there
// are additional steps that remote-ui takes that causes an issue here:
//
// 1. The text field blurs, and so calls `onChange()` with its current value.
// 2. Handling blur is finished **from the perspective of the main thread**, so the
//    browser now handles the click by calling the (original) `Button` `onPress()`, which
//    logs out the **initial** value.
// 3. In the remote context, we receive the `onChange()` call, which calls `setValue()` with
//    the updated `value`.
// 4. React sees that state has changed, so it re-runs our component. This results in a
//    new `onPress()` prop for our `Button`, which is messaged to the main thread, but
//    by now it's already too late, because the main thread called the original, out-of-date
//    `Button` `onPress()`.
//
// As you can see, the timing issue introduced by the asynchronous nature of remote-ui
// can cause “old props” to be called from the main thread.
//
// To protect against this, we handle function props a bit differently. When we have a
// function prop, we replace it with a new function that calls the original. However,
// we make the original mutable, by making it a property on the function itself. When
// this function subsequently updates, we don’t send the update to the main thread (as
// we just saw, this can often be "too late" to be of any use). Instead, we swap out
// the mutable reference to the current implementation of the function prop, which can
// be done synchronously. In the example above, this would all happen synchronously in
// the remote context; in our handling of `TextField onChange()`, we update `Button onPress()`,
// and swap out the implementations. Now, when the main thread attempts to call `Button onPress()`,
// it instead calls our wrapper around the function, which can refer to, and call, the
// most recently-applied implementation, instead of directly calling the old implementation.
//
// Note that this is not a silver bullet. It does not help if your original prop was not
// a function, but changes to be one after the state update. Currently, it is only applied
// to props at the "top level", so functions nested in object or array props can still
// experience this timing issue. We may deep-clone complex props to handle all functions,
// nested or not, in the future. Alternatively, a developer could solve this situation more
// generically by never updating the function they pass as props, and instead reading all
// dependencies from a ref object, instead of directly reading those values from the
// function’s containing scope.

function wrapFunctionToHotSwapImplementation<T extends Function>(
  func: T,
): HotSwappableFunction<T> {
  const wrappedFunction: HotSwappableFunction<T> = ((...args: any[]) => {
    return wrappedFunction[FUNCTION_CURRENT_IMPLEMENTATION_KEY](...args);
  }) as any;

  Object.defineProperty(wrappedFunction, FUNCTION_CURRENT_IMPLEMENTATION_KEY, {
    enumerable: false,
    configurable: false,
    writable: true,
    value: func,
  });

  return wrappedFunction;
}
