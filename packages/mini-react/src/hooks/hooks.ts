import options from '../options';
import type {
  HookType,
  Ref as ReactRef,
  ContextInternal as ReactContext,
} from '../types';

import type {
  Inputs,
  Ref,
  PropRef,
  Reducer,
  HookState,
  EffectHookState,
  Component,
  HookTypeMap,
  StateUpdater,
  EffectCallback,
} from './types';

let currentHook = 0;
let currentIndex: number;
let currentComponent: Component | undefined;
let afterPaintEffects: Component[] = [];

const oldBeforeRender = options._render;
const oldAfterDiff = options.diffed;
const oldCommit = options._commit;
const oldBeforeUnmount = options.unmount;

const RAF_TIMEOUT = 100;
let prevRaf: typeof options['requestAnimationFrame'];

options._render = (vnode) => {
  if (oldBeforeRender) oldBeforeRender(vnode);

  currentComponent = vnode._component;
  currentIndex = 0;

  const hooks = currentComponent!.__hooks;
  if (hooks) {
    hooks._pendingEffects.forEach(invokeCleanup);
    hooks._pendingEffects.forEach(invokeEffect);
    hooks._pendingEffects = [];
  }
};

options.diffed = (vnode) => {
  oldAfterDiff?.(vnode);

  const component = vnode._component as Component;
  if (component?.__hooks?._pendingEffects.length) {
    afterPaint(afterPaintEffects.push(component));
  }
};

options._commit = (vnode, commitQueue) => {
  let newCommitQueue = commitQueue;

  commitQueue.some((component: Component) => {
    try {
      component._renderCallbacks.forEach(invokeCleanup);
      component._renderCallbacks = component._renderCallbacks.filter((cb) =>
        '_value' in cb ? invokeEffect(cb) : true,
      );
    } catch (error) {
      for (const component of commitQueue) {
        if (component._renderCallbacks) component._renderCallbacks = [];
      }

      newCommitQueue = [];
      options._catchError(error, component._vnode!);
    }
  });

  oldCommit?.(vnode, newCommitQueue);
};

options.unmount = (vnode) => {
  oldBeforeUnmount?.(vnode);

  const component = vnode._component as Component;

  if (component?.__hooks) {
    try {
      component.__hooks._list.forEach(invokeCleanup);
    } catch (error) {
      options._catchError(error, component._vnode!);
    }
  }
};

/**
 * Get a hook's state from the currentComponent
 */
function getHookState<T extends HookType>(
  index: number,
  type: T,
): T extends keyof HookTypeMap ? HookTypeMap[T] : never {
  options._hook?.(currentComponent!, index, currentHook || type);
  currentHook = 0;

  // Largely inspired by:
  // * https://github.com/michael-klein/funcy.js/blob/f6be73468e6ec46b0ff5aa3cc4c9baf72a29025a/src/hooks/core_hooks.mjs
  // * https://github.com/michael-klein/funcy.js/blob/650beaa58c43c33a74820a3c98b3c7079cf2e333/src/renderer.mjs
  // Other implementations to look at:
  // * https://codesandbox.io/s/mnox05qp8

  if (currentComponent!.__hooks == null) {
    currentComponent!.__hooks = {
      _list: [],
      _pendingEffects: [],
    };
  }

  const hooks = currentComponent!.__hooks;

  if (index >= hooks._list.length) {
    hooks._list.push({});
  }

  return hooks._list[index] as any;
}

/**
 * Returns a stateful value, and a function to update it.
 * @param initialState The initial value (or a function that returns the initial value)
 */
export function useState<S>(initialState: S | (() => S)): [S, StateUpdater<S>] {
  currentHook = 1;
  return useReducer(invokeOrReturn as any, initialState) as any;
}

/**
 * An alternative to `useState`.
 *
 * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
 * multiple sub-values. It also lets you optimize performance for components that trigger deep
 * updates because you can pass `dispatch` down instead of callbacks.
 * @param reducer Given the current state and an action, returns the new state
 * @param initialState The initial value to store as state
 */
export function useReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
): [S, (action: A) => void];

/**
 * An alternative to `useState`.
 *
 * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
 * multiple sub-values. It also lets you optimize performance for components that trigger deep
 * updates because you can pass `dispatch` down instead of callbacks.
 * @param reducer Given the current state and an action, returns the new state
 * @param initialArg The initial argument to pass to the `init` function
 * @param init A function that, given the `initialArg`, returns the initial value to store as state
 */
export function useReducer<S, A, I>(
  reducer: Reducer<S, A>,
  initialArg: I,
  init: (arg: I) => S,
): [S, (action: A) => void];

export function useReducer<S, A, I>(
  reducer: Reducer<S, A>,
  initialArg: I,
  init?: (arg: I) => S,
): [S, (action: A) => void] {
  const hookState = getHookState<HookType.useReducer>(currentIndex++, 2);
  hookState._reducer = reducer;

  if (!hookState._component) {
    hookState._component = currentComponent;

    hookState._value = [
      init ? init(initialArg) : invokeOrReturn(undefined, initialArg),

      (action: A) => {
        const nextValue = hookState._reducer!(hookState._value[0], action);
        if (hookState._value[0] !== nextValue) {
          hookState._value = [nextValue, hookState._value[1]];
          hookState._component!.setState({});
        }
      },
    ];
  }

  return hookState._value;
}

/**
 * Accepts a function that contains imperative, possibly effectful code.
 * The effects run after browser paint, without blocking it.
 *
 * @param effect Imperative function that can return a cleanup function
 * @param inputs If present, effect will only activate if the values in the list change (using ===).
 */
export function useEffect(effect: EffectCallback, inputs?: Inputs): void {
  const state = getHookState<HookType.useEffect>(currentIndex++, 3);

  if (!options._skipEffects && argsChanged(state._args, inputs ?? [])) {
    state._value = effect;
    state._args = inputs;

    currentComponent!.__hooks!._pendingEffects.push(state);
  }
}

/**
 * Accepts a function that contains imperative, possibly effectful code.
 * Use this to read layout from the DOM and synchronously re-render.
 * Updates scheduled inside `useLayoutEffect` will be flushed synchronously, after all DOM mutations but before the browser has a chance to paint.
 * Prefer the standard `useEffect` hook when possible to avoid blocking visual updates.
 *
 * @param effect Imperative function that can return a cleanup function
 * @param inputs If present, effect will only activate if the values in the list change (using ===).
 */
export function useLayoutEffect(effect: EffectCallback, inputs?: Inputs): void {
  const state = getHookState<HookType.useLayoutEffect>(currentIndex++, 4);

  if (!options._skipEffects && argsChanged(state._args, inputs ?? [])) {
    state._value = effect;
    state._args = inputs;

    currentComponent!._renderCallbacks.push(state);
  }
}

/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 */
export function useRef<T>(initialValue?: T | null): Ref<T>;

/**
 * `useRef` without an initial value is the special case handling `ref` props.
 * If you want a non prop-based, mutable ref, you can explicitly give it an initial value of undefined/null/etc.
 * You should explicitly set the type parameter for the expected ref value to either a DOM Element like `HTMLInputElement` or a `Component`
 */
export function useRef<T = unknown>(): PropRef<T>;

export function useRef(initialValue?: any): any {
  currentHook = 5;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({current: initialValue}), []);
}

/**
 * @param ref The ref that will be mutated
 * @param create The function that will be executed to get the value that will be attached to
 * ref.current
 * @param inputs If present, effect will only activate if the values in the list change (using ===).
 */
export function useImperativeHandle<T, R extends T>(
  ref: ReactRef<T>,
  create: () => R,
  inputs?: Inputs,
): void {
  currentHook = 6;
  useLayoutEffect(
    () => {
      if (typeof ref === 'function') {
        ref(create());
      } else if (ref) {
        ref.current = create();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    inputs == null ? inputs : [...inputs, ref],
  );
}

/**
 * Pass a factory function and an array of inputs.
 * useMemo will only recompute the memoized value when one of the inputs has changed.
 * This optimization helps to avoid expensive calculations on every render.
 * If no array is provided, a new value will be computed whenever a new function instance is passed as the first argument.
 */
// for `inputs`, allow undefined, but don't make it optional as that is very likely a mistake
export function useMemo<T>(factory: () => T, inputs: Inputs | undefined): T {
  const state = getHookState<HookType.useMemo>(currentIndex++, 7);

  if (argsChanged(state._args, inputs ?? [])) {
    state._args = inputs;
    state._factory = factory;
    return (state._value = factory());
  }

  return state._value;
}

export function useCallback<T extends Function>(
  callback: T,
  inputs: Inputs,
): T {
  currentHook = 8;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => callback, inputs);
}

/**
 * Returns the current context value, as given by the nearest context provider for the given context.
 * When the provider updates, this Hook will trigger a rerender with the latest context value.
 *
 * @param context The context you want to use
 */
export function useContext<T>(context: ReactContext<T>): T {
  const provider = currentComponent!.context[context._id];
  const state = getHookState<HookType.useContext>(currentIndex++, 9);

  // The devtools needs access to the context object to
  // be able to pull of the default value when no provider
  // is present in the tree.
  // state._context = context;

  if (!provider) return context._defaultValue;

  // This is probably not safe to convert to "!"
  if (state._value == null) {
    state._value = true;
    provider.sub(currentComponent);
  }

  return provider.props.value;
}

/**
 * Customize the displayed value in the devtools panel.
 *
 * @param value Custom hook name or object that is passed to formatter
 * @param formatter Formatter to modify value before sending it to the devtools
 */
export function useDebugValue<T>(
  value: T,
  formatter?: (value: T) => any,
): void {
  options.useDebugValue?.(formatter ? formatter(value) : value);
}

/**
 * After paint effects consumer.
 */
function flushAfterPaintEffects() {
  for (const component of afterPaintEffects) {
    if (component._parentRemoteNode) {
      try {
        component.__hooks!._pendingEffects.forEach(invokeCleanup);
        component.__hooks!._pendingEffects.forEach(invokeEffect);
        component.__hooks!._pendingEffects = [];
      } catch (error) {
        component.__hooks!._pendingEffects = [];
        options._catchError(error, component._vnode!);
        return true;
      }
    }
  }

  afterPaintEffects = [];
}

const HAS_RAF = typeof requestAnimationFrame === 'function';

/**
 * Schedule a callback to be invoked after the browser has a chance to paint a new frame.
 * Do this by combining requestAnimationFrame (rAF) + setTimeout to invoke a callback after
 * the next browser frame.
 *
 * Also, schedule a timeout in parallel to the the rAF to ensure the callback is invoked
 * even if RAF doesn't fire (for example if the browser tab is not visible)
 */
function afterNextFrame(callback: () => void) {
  const done = () => {
    clearTimeout(timeout);
    if (HAS_RAF) cancelAnimationFrame(raf);
    setTimeout(callback);
  };

  const timeout = setTimeout(done, RAF_TIMEOUT);

  let raf: ReturnType<typeof requestAnimationFrame>;

  if (HAS_RAF) {
    raf = requestAnimationFrame(done);
  }
}

// Note: if someone used options.debounceRendering = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
/**
 * Schedule afterPaintEffects flush after the browser paints
 */
function afterPaint(newQueueLength: number) {
  if (newQueueLength === 1 || prevRaf !== options.requestAnimationFrame) {
    prevRaf = options.requestAnimationFrame;
    (prevRaf || afterNextFrame)(flushAfterPaintEffects);
  }
}

function invokeCleanup(hook: HookState | (() => void)) {
  if ('_cleanup' in hook && typeof hook._cleanup === 'function')
    hook._cleanup();
}

function invokeEffect(hook: EffectHookState) {
  hook._cleanup = hook._value!() as any;
}

function argsChanged(
  oldArgs: any[] | ReadonlyArray<any> | undefined,
  newArgs: any[] | ReadonlyArray<any>,
) {
  return (
    !oldArgs ||
    oldArgs.length !== newArgs.length ||
    newArgs.some((arg, index) => arg !== oldArgs[index])
  );
}

function invokeOrReturn<T>(
  arg: any,
  maybeFunction: T,
): T extends (...args: any) => any ? ReturnType<T> : T {
  return typeof maybeFunction === 'function'
    ? maybeFunction(arg)
    : maybeFunction;
}
