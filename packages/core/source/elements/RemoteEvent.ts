/**
 * An event class that is used to store and return a potentially-asynchronous
 * result as part of a remote property call. Remote DOM uses this class to convert
 * a remote property call into event listeners on the `RemoteElement` custom
 * element base class.
 */
export class RemoteEvent<
  Detail = unknown,
  Response = unknown,
> extends CustomEvent<Detail> {
  /**
   * The last value received from a `respondWith()` call.
   */
  readonly response?: Response;

  /**
   * Provides the `response` value to be sent as the return value for
   * the remote property function that triggered this event.
   */
  respondWith(response: Response) {
    (this as any).response = response;
  }
}
