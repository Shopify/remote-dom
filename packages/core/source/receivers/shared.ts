import {
  UPDATE_PROPERTY_TYPE_ATTRIBUTE,
  UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
  UPDATE_PROPERTY_TYPE_PROPERTY,
} from '../constants.ts';
import type {RemoteElementSerialization} from '../types.ts';

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

// The remote environment is untrusted. Everything a receiver stores must be
// checked against the shape the protocol promises, because host renderers
// hand these values straight to a UI framework. Text and attributes are
// strings in the protocol; properties are arbitrary data, but must never be
// mistaken by a framework for one of its own internal objects.

/**
 * Converts a value received where the protocol expects text (the content of
 * a text or comment node) into a string. Nullish values become an empty
 * string. Objects are described without invoking any of their methods, so a
 * remote can’t influence the result beyond the primitive it sent.
 */
export function normalizeRemoteText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object' || typeof value === 'function') {
    return Object.prototype.toString.call(value);
  }
  return String(value);
}

/**
 * Converts a value received where the protocol expects an attribute value
 * into a string. Nullish values are returned as `undefined`, which receivers
 * treat as removing the attribute.
 */
export function normalizeRemoteAttribute(value: unknown): string | undefined {
  if (value == null) return undefined;
  return normalizeRemoteText(value);
}

/**
 * Converts the serialized attributes of a remote element into a record whose
 * values are all strings.
 */
export function normalizeRemoteAttributes(
  attributes: RemoteElementSerialization['attributes'] | undefined,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (attributes == null) return normalized;

  for (const name of Object.keys(attributes)) {
    assertRemotePropertyName(name);
    const value = normalizeRemoteAttribute(attributes[name]);
    if (value !== undefined) normalized[name] = value;
  }

  return normalized;
}

/**
 * Checks a property, attribute, or event listener name received from the
 * remote environment. Names must be strings and must not be able to alter
 * the prototype of the host’s record objects.
 */
export function assertRemotePropertyName(
  name: unknown,
): asserts name is string {
  if (typeof name !== 'string' || name === '__proto__') {
    throw new Error(`Remote property name is not allowed: ${String(name)}`);
  }
}

/**
 * Checks a property value received from the remote environment. Property
 * values are arbitrary data, but host renderers pass them directly to UI
 * frameworks, which identify their own virtual nodes by shape. Preact, for
 * example, treats any object whose `constructor` resolves to `undefined` as a
 * virtual node. Such objects can’t be expressed as JSON but do survive
 * `postMessage`, and would let a remote render arbitrary markup (including
 * `dangerouslySetInnerHTML`) on the host. No legitimate data has this shape,
 * so it is rejected anywhere in the value.
 */
export function assertSafeRemoteProperty(value: unknown): void {
  const seen = new Set<object>();
  const pending: unknown[] = [value];

  while (pending.length > 0) {
    const current = pending.pop();

    if (typeof current !== 'object' || current === null) continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if ((current as any).constructor === undefined) {
      throw new Error(
        'Remote property value is not allowed: object masquerades as a framework node',
      );
    }

    if (current instanceof Map) {
      for (const [key, item] of current) {
        pending.push(key, item);
      }
    } else if (current instanceof Set) {
      for (const item of current) pending.push(item);
    }

    // Error causes survive structured cloning but are not enumerable.
    if (current instanceof Error) pending.push(current.cause);

    // A wire deserializer can assign a `__proto__` key, putting remote data
    // on an object's prototype instead of directly on the object. Check the
    // prototype too, even if the object shadows its constructor or another
    // inherited property.
    pending.push(Object.getPrototypeOf(current));

    // Walk own enumerable keys of every object (including arrays).
    for (const key of Object.keys(current)) {
      pending.push((current as any)[key]);
    }
  }
}

/**
 * Checks the properties record of a serialized remote element.
 */
export function assertSafeRemoteProperties(
  properties: RemoteElementSerialization['properties'] | undefined,
): void {
  if (properties == null) return;

  for (const name of Object.keys(properties)) {
    assertRemotePropertyName(name);
    assertSafeRemoteProperty(properties[name]);
  }
}

/**
 * Checks an event listener received from the remote environment. Listeners
 * must be functions (the remote-side dispatcher), or nullish to remove.
 */
export function assertRemoteEventListener(
  value: unknown,
): asserts value is ((...args: any[]) => any) | null | undefined {
  if (value != null && typeof value !== 'function') {
    throw new Error('Remote event listener is not a function');
  }
}

/**
 * Checks the event listeners record of a serialized remote element.
 */
export function assertRemoteEventListeners(
  eventListeners: RemoteElementSerialization['eventListeners'] | undefined,
): void {
  if (eventListeners == null) return;

  for (const name of Object.keys(eventListeners)) {
    assertRemotePropertyName(name);
    assertRemoteEventListener(eventListeners[name]);
  }
}

/**
 * Checks the element name of a serialized remote element. Host renderers
 * look the name up in a map of components, so it must be a string.
 */
export function assertRemoteElementName(
  element: unknown,
): asserts element is string {
  if (typeof element !== 'string') {
    throw new Error(`Remote element name is not allowed: ${String(element)}`);
  }
}

/**
 * Validates and normalizes a single `updateProperty` mutation, returning the
 * value a receiver should store. For attributes, `undefined` means remove.
 */
export function normalizeRemotePropertyUpdate(
  name: unknown,
  value: unknown,
  type:
    | typeof UPDATE_PROPERTY_TYPE_PROPERTY
    | typeof UPDATE_PROPERTY_TYPE_ATTRIBUTE
    | typeof UPDATE_PROPERTY_TYPE_EVENT_LISTENER,
): unknown {
  assertRemotePropertyName(name);

  switch (type) {
    case UPDATE_PROPERTY_TYPE_PROPERTY:
      assertSafeRemoteProperty(value);
      return value;
    case UPDATE_PROPERTY_TYPE_ATTRIBUTE:
      return normalizeRemoteAttribute(value);
    case UPDATE_PROPERTY_TYPE_EVENT_LISTENER:
      assertRemoteEventListener(value);
      return value;
    default:
      throw new Error(`Remote property update type is not allowed: ${type}`);
  }
}
