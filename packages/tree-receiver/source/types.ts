import type {RemoteReceiverOptions} from '@remote-dom/core/receivers';

/** React/Preact/etc declare this when imported. */
declare global {
  namespace JSX {
    interface Element {}
  }
}

export interface TreeReceiverOptions<AnyNodeType = any, Element = JSX.Element>
  extends RemoteReceiverOptions {
  /**
   * Invoke every time the tree is invalidated.
   */
  rerender(root: Element): void;

  /**
   * Expose components as elements available to the remote environment.
   * Keys are element names, values are their (p)react component implementations.
   */
  components?: Map<string, AnyNodeType>;

  /**
   * Register listeners for the given event types across the whole tree.
   * This optimization avoids the need to invalidate large subtrees when
   * event listeners are added or removed after attachment.
   */
  events?: Record<string, true>;

  /**
   * The JSX element factory to use when materializing the tree.
   */
  createElement?(
    type: AnyNodeType,
    props: {children?: Element[]} | null,
  ): Element;
}
