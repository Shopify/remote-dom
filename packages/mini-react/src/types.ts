import type {RemoteRoot, RemoteComponent} from '@remote-ui/core';

export type Key = string | number | any;

export interface Context {
  [key: string]: any;
}

interface RefObject<T> {
  current?: T | null;
}
type RefCallback<T> = (instance: T | null) => void;
export type Ref<T> = RefObject<T> | RefCallback<T>;

type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;

// We remove the JSXInternal.IntrinsicElements type because there are no
// intrinsic elements in a remote-ui root.
export type ComponentProps<
  C extends ComponentType<any>
> = C extends ComponentType<infer P> ? P : never;

interface Attributes {
  key?: Key;
  jsx?: boolean;
}

interface ClassAttributes<T> extends Attributes {
  ref?: Ref<T>;
}

type RenderableProps<P, RefType = any> = P &
  Readonly<Attributes & {children?: ComponentChildren; ref?: Ref<RefType>}>;

export interface FunctionComponent<P = {}> {
  (props: RenderableProps<P>, context?: any): VNode<any> | null;
  displayName?: string;
  defaultProps?: Partial<P>;
}
interface FunctionalComponent<P = {}> extends FunctionComponent<P> {}

export interface ComponentClass<P = {}, S = {}> {
  new (props: P, context?: any): Component<P, S>;
  displayName?: string;
  defaultProps?: Partial<P>;
  contextType?: any;
  getDerivedStateFromProps?(
    props: Readonly<P>,
    state: Readonly<S>,
  ): Partial<S> | null;
  getDerivedStateFromError?(error: any): Partial<S> | null;
}

interface ComponentConstructor<P = {}, S = {}> extends ComponentClass<P, S> {}

export interface Component<P = {}, S = {}> {
  render(props: P, state: S, context: any): ComponentChild | ComponentChild[];
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
  componentDidCatch?(error: any, errorInfo: any): void;
}

export type ComponentChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;

export type ComponentChildren = ComponentChild[] | ComponentChild;

export interface VNode<P = {}> {
  type: ComponentType<P> | string | null;
  props: P & {children: ComponentChildren};
  key: Key;
  /**
   * ref is not guaranteed by React.ReactElement, for compatibility reasons
   * with popular react libs we define it as optional too
   */
  ref?: Ref<any> | null;
  /**
   * The time this `vnode` started rendering. Will only be set when
   * the devtools are attached.
   * Default value: `0`
   */
  startTime?: number;
  /**
   * The time that the rendering of this `vnode` was completed. Will only be
   * set when the devtools are attached.
   * Default value: `-1`
   */
  endTime?: number;

  constructor: any;
  _component?: any;
  _parent: VNode<any> | null;
  _depth: any;
  _dom: any;
  _nextDom: any;
  _original?: VNode<any> | string | number | null;
  _children?: (VNode<any> | null | undefined)[] | null;
}

export type RemoteNode = RemoteRoot<any, any> | RemoteComponent<any, any>;

export type ReactRemoteNode = RemoteNode & {
  _children?: VNode<any> | null;
  /** Event listeners to support event delegation */
  // _listeners: Record<string, (e: Event) => void>;

  // Preact uses this attribute to detect SVG nodes
  // ownerSVGElement?: SVGElement | null;

  // style: HTMLElement["style"]; // From HTMLElement

  data?: string | number; // From Text node
};
