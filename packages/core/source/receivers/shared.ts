/**
 * Return this sentinel from error handlers to fall through to the default
 * error case.
 */
export const THROW_DEFAULT: unique symbol = Symbol.for(
  'remote-dom.throw-default',
);

/**
 * Context passed to the `onMissingImplementationError` callback.
 */
export interface MissingImplementationContext {
  /** The ID of the node the method was called on. */
  id: string;
  /** The name of the method that was called. */
  method: string;
  /** The arguments passed to the method call. */
  args: readonly unknown[];
  /**
   * The element type of the node (e.g. `'s-modal'`, `'s-sheet'`), or
   * `undefined` if the node is not an element or is not found in the tree.
   */
  element: string | undefined;
}

/**
 * Options that are useful for all remote receiver implementations. All of the
 * receivers in `@remote-dom/core/receivers` accept these options.
 */
export interface RemoteReceiverOptions {
  /**
   * Called on remote properties and elements when they are accepted by the
   * receiver. To handle the passing of functions as remote properties, you
   * will likely want to use this callback to mark any functions contained
   * in the remote properties of the received elements as “used”, since they
   * may be called at any time by the host implementation.
   */
  retain?(value: any): void;

  /**
   * Called on remote properties and elements when they are no longer attached
   * to the remote tree. To handle the passing of functions as remote properties,
   * you will likely want to use this callback to mark any functions contained
   * in the unused elements as “unused”, since they will no longer be called
   * by the host implementation.
   */
  release?(value: any): void;

  /**
   * Called when `connection.call()` is invoked on a node with no registered
   * implementation for the requested method. By default, an error is thrown.
   * No-ops on receivers that don't implement `implement()` (`DOMRemoteReceiver`).
   *
   * Return a value to use as the method's return value. Return
   * `THROW_DEFAULT` to fall through to the default error. Throw to
   * replace the error entirely.
   */
  onMissingImplementationError?(context: MissingImplementationContext): unknown;
}
