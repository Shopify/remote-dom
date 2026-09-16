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
   * Optional host-owned element and capability allowlist, copied when an instance
   * is constructed. Override this in a host-side subclass before registering it.
   */
  static elements: DOMRemoteReceiverOptions['elements'];

  /** Additional property and attribute names excluded by the host. */
  static blockedProperties: DOMRemoteReceiverOptions['blockedProperties'];

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
   * are called. By default, custom-element methods and native focus/blur
   * can be called. This callback overrides that policy, including for the root,
   * and must enforce its own host-owned allowlist.
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
   *   // Only expose the button's focus method.
   *   if (element.localName !== 'ui-button' || method !== 'focus') {
   *     throw new Error(`Cannot call method ${method}`);
   *   }
   *
   *   return (element as HTMLElement).focus();
   * };
   */
  call?: DOMRemoteReceiverOptions['call'];

  constructor() {
    super();

    const receiverElement = this;
    const receiver = new DOMRemoteReceiver({
      root: this,
      elements: (this.constructor as typeof RemoteReceiverElement).elements,
      blockedProperties: (this.constructor as typeof RemoteReceiverElement)
        .blockedProperties,
      // Resolve the optional callback at call time so hosts can set it after
      // construction. With no override, retain the receiver's default policy.
      get call() {
        return receiverElement.call?.bind(receiverElement);
      },
      retain: (value) => this.retain?.(value),
      release: (value) => this.release?.(value),
    });

    this.connection = receiver.connection;
  }
}
