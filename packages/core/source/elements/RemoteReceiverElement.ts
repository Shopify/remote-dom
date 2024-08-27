import {DOMRemoteReceiver} from '../receivers/DOMRemoteReceiver.ts';

type DOMRemoteReceiverOptions = NonNullable<
  ConstructorParameters<typeof DOMRemoteReceiver>[0]
>;

/**
 * A custom element that can be used to simplify receiving updates to a
 * remote tree of elements in a host environment. On the host, you can create
 * a `RemoteReceiverElement` and use its `connection` property to connect
 * it to a remote environment
 *
 * @example
 * ```ts
 * import {RemoteReceiverElement} from '@remote-dom/core/elements';
 *
 * customElements.define('remote-receiver', RemoteReceiverElement);
 *
 * const element = document.createElement('remote-receiver');
 * console.log(element.connection); // RemoteConnection
 * ```
 */
export class RemoteReceiverElement extends HTMLElement {
  /**
   * The `RemoteConnection` object that connects this element to a remote
   * tree of elements.
   */
  readonly connection: DOMRemoteReceiver['connection'];

  /**
   * Called on remote properties and elements when they are accepted by this
   * element. To handle the passing of functions as remote properties, you
   * will likely want to use this callback to mark any functions contained
   * in the remote properties of the received elements as “used”, since they
   * may be called at any time by the host implementation.
   */
  retain?: DOMRemoteReceiverOptions['retain'];

  /**
   * Called on remote properties and elements when they are no longer attached
   * to the remote tree. To handle the passing of functions as remote properties,
   * you will likely want to use this callback to mark any functions contained
   * in the unused elements as “unused”, since they will no longer be called
   * by the host implementation.
   */
  release?: DOMRemoteReceiverOptions['release'];

  /**
   * Customizes how [remote methods](https://github.com/Shopify/remote-dom/blob/main/packages/core#remotemethods)
   * are called. By default, the receiver will call a matching method found on
   * the HTML element that represents the remote element. However, you may want to
   * customize this behavior in order to avoid exposing methods on your HTML
   * elements that should not be callable by the remote environment.
   *
   * @param element The HTML element representing the remote element the method is being called on.
   * @param method The name of the method being called.
   * @param args Arguments passed to the method from the remote environment.
   *
   * @example
   * customElements.define('remote-receiver', RemoteReceiverElement);
   *
   * const receiver = document.createElement('remote-receiver');
   * receiver.call = (element, method, ...args) => {
   *   // Prevent calling any methods that start with an underscore
   *   if (method.startsWith('_')) {
   *     throw new Error(`Cannot call method ${method}`);
   *   }
   *
   *   return element[method](...args);
   * };
   */
  call?: DOMRemoteReceiverOptions['call'];

  constructor() {
    super();

    const receiver = new DOMRemoteReceiver({
      root: this,
      call: (element, method, ...args) =>
        this.call
          ? this.call(element, method, ...args)
          : (element as any)[method](...args),
      retain: (value) => this.retain?.(value),
      release: (value) => this.release?.(value),
    });

    this.connection = receiver.connection;
  }
}
