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
}
