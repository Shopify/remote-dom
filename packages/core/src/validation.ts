// The remote environment is untrusted. Everything the receiver stores must be
// checked against the shape the protocol promises, because host renderers hand
// these values straight to a UI framework. Text is a string in the protocol;
// props are arbitrary data, but must never be mistaken by a framework for one
// of its own internal objects.

/**
 * Converts a value received where the protocol expects text into a string.
 * Nullish values become an empty string. Objects are described without
 * invoking any of their methods, so a remote can’t influence the result
 * beyond the primitive it sent.
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
 * Checks a prop name received from the remote environment. Names must be
 * strings and must not be able to alter the prototype of the host’s records.
 */
export function assertRemotePropName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name === '__proto__') {
    throw new Error(`Remote prop name is not allowed: ${String(name)}`);
  }
}

/**
 * Checks a prop value received from the remote environment. Props are
 * arbitrary data, but host renderers pass them directly to UI frameworks,
 * which identify their own virtual nodes by shape. Preact treats any object
 * whose `constructor` resolves to `undefined` as a virtual node; Vue treats
 * any object flagged `__v_isVNode` as one. Such objects survive `postMessage`
 * and the RPC layer, and would let a remote render arbitrary markup
 * (including `dangerouslySetInnerHTML` or `innerHTML`) on the host. No
 * legitimate data has these shapes, so they are rejected anywhere in the value.
 */
export function assertSafeRemoteProp(value: unknown): void {
  const seen = new Set<object>();
  const pending: unknown[] = [value];

  while (pending.length > 0) {
    const current = pending.pop();

    if (typeof current !== 'object' || current === null) continue;
    if (seen.has(current)) continue;
    seen.add(current);

    // Preact: a virtual node is any object whose `constructor` is undefined.
    // Vue: a virtual node is any object flagged with `__v_isVNode`.
    if (
      (current as any).constructor === undefined ||
      (current as any).__v_isVNode === true
    ) {
      throw new Error(
        'Remote prop value is not allowed: object masquerades as a framework node',
      );
    }

    if (current instanceof Map) {
      for (const [key, item] of current) {
        pending.push(key, item);
      }
    } else if (current instanceof Set) {
      for (const item of current) pending.push(item);
    }

    // Walk own enumerable keys of every object (including arrays), regardless
    // of prototype: a remote can redirect an object’s prototype on the wire,
    // so prototype-based “plain object” checks can’t be used to skip values.
    for (const key of Object.keys(current)) {
      pending.push((current as any)[key]);
    }
  }
}

/**
 * Checks a record of props received from the remote environment.
 */
export function assertSafeRemoteProps(props: unknown): void {
  if (props == null) return;

  if (typeof props !== 'object') {
    throw new Error('Remote props must be an object');
  }

  for (const name of Object.keys(props)) {
    assertRemotePropName(name);
    assertSafeRemoteProp((props as any)[name]);
  }
}

/**
 * Checks the component type of a serialized remote component. Host renderers
 * look the type up in a map of components, so it must be a string.
 */
export function assertRemoteComponentType(
  type: unknown,
): asserts type is string {
  if (typeof type !== 'string') {
    throw new Error(`Remote component type is not allowed: ${String(type)}`);
  }
}
