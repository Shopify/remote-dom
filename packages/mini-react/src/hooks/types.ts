import type {HookType, ComponentInternal} from '../types';

export type Inputs = ReadonlyArray<unknown>;

export type StateUpdater<S> = (value: S | ((prevState: S) => S)) => void;
export type Reducer<S, A> = (prevState: S, action: A) => S;
export type EffectCallback = () => void | (() => void);

export interface PropRef<T> {
  current?: T;
}

export interface Ref<T> {
  current: T;
}

/**
 * The type of arguments passed to a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
export type HookArgs = any;

/**
 * The return type of a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
export type HookReturnValue = any;

/** The public function a user invokes to use a Hook */
export type Hook = (...args: HookArgs[]) => HookReturnValue;

// Hook tracking

export interface ComponentHooks {
  /** The list of hooks a component uses */
  _list: HookState[];

  /** List of Effects to be invoked after the next frame is rendered */
  _pendingEffects: EffectHookState[];
}

export interface Component
  extends Omit<ComponentInternal<any, any>, '_renderCallbacks'> {
  __hooks?: ComponentHooks;
  _renderCallbacks: ((() => void) | EffectHookState)[];
}

export type HookState =
  | EffectHookState
  | MemoHookState
  | ReducerHookState
  | ContextHookState;

export type Effect = () => void | Cleanup;
export type Cleanup = () => void;

export interface EffectHookState {
  _value?: Effect;
  _args?: ReadonlyArray<any>;
  _cleanup?: Cleanup;
}

export interface MemoHookState {
  _value?: any;
  _args?: ReadonlyArray<any>;
  _factory?: () => any;
}

export interface ReducerHookState {
  _value?: any;
  _component?: Component;
  _reducer?: Reducer<any, any>;
}

export interface ContextHookState {
  _value?: true;
}

export interface HookTypeMap {
  [HookType.useMemo]: MemoHookState;
  [HookType.useEffect]: EffectHookState;
  [HookType.useLayoutEffect]: EffectHookState;
  [HookType.useReducer]: ReducerHookState;
  [HookType.useContext]: ContextHookState;
}
