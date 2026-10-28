/**
 * The property name used to pass a remote element instance to the React component
 * that is configured to render it.
 */
export const REMOTE_ELEMENT_PROP = Symbol.for('remote-dom.element');
export const REMOTE_ELEMENT_ATTACHED_PROP = Symbol.for(
  'remote-dom.element.attached',
);

/**
 * Prop names that are controlled by the host renderer or by the UI framework
 * itself. The remote environment can name properties, attributes, and slots
 * freely, so these names are never taken from remote data: `children`, `ref`,
 * and `key` would override the renderer’s own wiring, and
 * `dangerouslySetInnerHTML`, `innerHTML`, and `outerHTML` would let a remote
 * inject markup into any host component that spreads its props onto a DOM
 * element.
 */
export const RESERVED_PROPS: ReadonlySet<string> = new Set([
  'children',
  'ref',
  'key',
  'dangerouslySetInnerHTML',
  'innerHTML',
  'outerHTML',
  '__proto__',
]);
