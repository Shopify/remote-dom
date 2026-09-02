/**
 * A compatibility implementation of the browser `MutationObserver` interface.
 *
 * This polyfill does not collect mutation records or invoke the callback. Its
 * methods are provided so that code which feature-detects `MutationObserver`,
 * including subclasses, can run in a polyfilled environment.
 */
export class MutationObserver {
  constructor(_callback: MutationCallback) {}

  /**
   * Does not observe mutations in the polyfill.
   */
  observe(_target: Node, _options?: MutationObserverInit) {}

  /**
   * Stops observing mutations. This is a no-op because mutations are not
   * observed by this compatibility implementation.
   */
  disconnect() {}

  /**
   * Returns no records because mutation records are not supported.
   */
  takeRecords(): MutationRecord[] {
    return [];
  }
}
