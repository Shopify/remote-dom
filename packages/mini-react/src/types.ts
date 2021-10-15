import type {
  RemoteRoot,
  RemoteText,
  RemoteComponent,
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';

export interface RemoteExtensions {
  // This is used to track the vnode that backs a remote-ui node. It can
  // be useful for restarting a render from an old vnode tree, and for
  // distinguishing whether the library has previously tried to render content
  // into this remote node.
  _vnode?: VNode<any>;
}

export type RemoteTextNode = RemoteText<RemoteRoot<any, any>> &
  RemoteExtensions;

export type RemoteComponentNode = RemoteComponent<any, RemoteRoot<any, any>> &
  RemoteExtensions;

export type RemoteRootNode = RemoteRoot<any, any> & RemoteExtensions;

export type RemoteParentNode = RemoteComponentNode | RemoteRootNode;
export type RemoteChildNode = RemoteComponentNode | RemoteTextNode;
export type RemoteNode = RemoteChildNode | RemoteRootNode;

export type Key = string | number | any;

export interface RefObject<T> {
  current?: T | null;
}

export type RefCallback<T> = (instance: T | null) => void;
export type Ref<T> = RefObject<T> | RefCallback<T>;

export type ComponentChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;
export type ComponentChildren = ComponentChild[] | ComponentChild;

// In Preact, referred to as `Attributes`
export interface CommonProps {
  key?: Key;
  jsx?: boolean;
}

export type RenderableProps<P, RefType = any> = P &
  Readonly<CommonProps & {children?: ComponentChildren; ref?: Ref<RefType>}>;

export interface Component<P = {}, S = {}> {
  componentWillMount?(): void;
  componentDidMount?(): void;
  componentWillUnmount?(): void;
  getChildContext?(): object;
  componentWillReceiveProps?(nextProps: Readonly<P>, nextContext: any): void;
  shouldComponentUpdate?(
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
    nextContext: any,
  ): boolean;
  componentWillUpdate?(
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
    nextContext: any,
  ): void;
  getSnapshotBeforeUpdate?(oldProps: Readonly<P>, oldState: Readonly<S>): any;
  componentDidUpdate?(
    previousProps: Readonly<P>,
    previousState: Readonly<S>,
    snapshot: any,
  ): void;
  componentDidCatch?(error: any, errorInfo?: any): void;

  readonly state: Readonly<S>;
  readonly props: RenderableProps<P>;
  readonly context: any;

  setState<K extends keyof S>(
    state:
      | ((
          prevState: Readonly<S>,
          props: Readonly<P>,
        ) => Pick<S, K> | Partial<S> | null)
      | (Pick<S, K> | Partial<S> | null),
    callback?: () => void,
  ): void;
  render(
    props?: RenderableProps<P>,
    state?: Readonly<S>,
    context?: any,
  ): ComponentChildren;
  forceUpdate(callback?: () => void): void;
}

export interface ComponentInternal<P = {}, S = {}> extends Component<P, S> {
  // Redeclare props, state, and context as being mutable for internal purposes
  props: P;
  state: S;
  context: any;

  base?: RemoteNode | null;
  _force: boolean;
  _dirty: boolean;
  _vnode?: VNode<P> | null;
  _renderCallbacks: (() => void)[];
  _state?: S;
  _nextState?: S | null;
  _globalContext?: any;
  _remoteRoot: RemoteRoot<any, any>;

  /**
   * Pointer to the parent remote node. This is only needed for top-level Fragment
   * components or array returns.
   */
  _parentRemoteNode?: RemoteParentNode | null;

  // Always read, set only when handling error
  _processingException?: Component<any, any> | null;
  // Always read, set only when handling error. This is used to indicate at diffTime to set _processingException
  _pendingError?: Component<any, any> | null;
}

export interface ComponentClass<P = {}, S = {}> {
  new (props: P, context?: any): Component<P, S>;
  displayName?: string;
  defaultProps?: Partial<P>;
  contextType?: Context<any>;
  getDerivedStateFromProps?(
    props: Readonly<P>,
    state: Readonly<S>,
  ): Partial<S> | null;
  getDerivedStateFromError?(error: any): Partial<S> | null;
}

export interface FunctionComponent<P = {}> {
  (props: RenderableProps<P>, context?: any): ComponentChildren;
  displayName?: string;
  defaultProps?: Partial<P>;
}

export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;

export type ComponentProps<
  C extends ComponentType<any> | RemoteComponentType<any>,
> = C extends ComponentType<infer P>
  ? P
  : C extends RemoteComponentType<infer P>
  ? P
  : never;

export interface VNode<P = {}> {
  type: ComponentType<P> | string | null;
  props: P & {children?: ComponentChildren};
  key: Key;

  /**
   * ref is not guaranteed by React.ReactElement, for compatibility reasons
   * with popular react libs we define it as optional too
   */
  ref?: Ref<any>;

  _children: (VNode<any> | null | undefined)[] | null;
  _parent: VNode<any> | null;
  _depth: number;

  /**
   * The first (for Fragments) remote child of a VNode
   */
  _remoteNode?: RemoteChildNode | null;

  /**
   * The last remote child of a Fragment, or components that return a Fragment
   */
  _nextRemoteNode?: RemoteChildNode | null;
  _component?: ComponentInternal<P, any>;
  constructor: any;
  _original: VNode<any> | string | number | null;
}

// This object is meant to match an object in Preact’s implementation
// that uses camelcase keys.
/* eslint-disable @shopify/typescript/prefer-pascal-case-enums */

export enum HookType {
  useState = 1,
  useReducer = 2,
  useEffect = 3,
  useLayoutEffect = 4,
  useRef = 5,
  useImperativeHandle = 6,
  useMemo = 7,
  useCallback = 8,
  useContext = 9,
  useErrorBoundary = 10,
  // Not a real hook, but the devtools treat is as such
  useDebugvalue = 11,
}

/* eslint-enable @shopify/typescript/prefer-pascal-case-enums */

export interface Options {
  /** Attach a hook that is invoked whenever a VNode is created. */
  vnode?(vnode: VNode<any>): void;

  /** Attach a hook that is invoked immediately before a vnode is unmounted. */
  unmount?(vnode: VNode<any>): void;

  /** Attach a hook that is invoked after a vnode has rendered. */
  diffed?(vnode: VNode<any>): void;
  event?(e: Event): any;
  requestAnimationFrame?: typeof requestAnimationFrame;
  debounceRendering?(cb: () => void): void;
  useDebugValue?(value: string | number): void;
  __suspenseDidResolve?(vnode: VNode<any>, cb: () => void): void;

  //
  // INTERNAL
  //

  /** Attach a hook that is invoked before render, mainly to check the arguments. */
  _root?(vnode: ComponentChild, parent: RemoteNode): void;

  /** Attach a hook that is invoked before a vnode is diffed. */
  _diff?(vnode: VNode<any>): void;

  /** Attach a hook that is invoked after a tree was mounted or was updated. */
  _commit?(vnode: VNode<any>, commitQueue: ComponentInternal<any>[]): void;

  /** Attach a hook that is invoked before a vnode has rendered. */
  _render?(vnode: VNode<any>): void;

  /** Attach a hook that is invoked before a hook's state is queried. */
  _hook?(component: Component, index: number, type: HookType): void;

  /** Bypass effect execution. Currenty only used in devtools for hooks inspection */
  _skipEffects?: boolean;

  /** Attach a hook that is invoked after an error is caught in a component but before calling lifecycle hooks */
  _catchError(error: any, vnode: VNode<any>, oldVNode?: VNode<any>): void;
}

export interface ContextConsumerProps<T> {
  children(value: T): ComponentChildren;
}

export interface ContextProviderProps<T> {
  value: T;
  children?: ComponentChildren;
}

export interface Context<T> {
  Consumer: ComponentType<ContextConsumerProps<T>>;
  Provider: ComponentType<ContextProviderProps<T>>;
}

export interface ContextInternal<T> extends Context<T> {
  _id: string;
  _defaultValue: T;
}

export type ReactPropsFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>,
> = PropsForRemoteComponent<Type> & {children?: ComponentChildren};

export type ReactComponentTypeFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>,
> = ComponentType<ReactPropsFromRemoteComponentType<Type>>;
