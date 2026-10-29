import type {RemoteReceiverElement} from '@remote-dom/core/receivers';

import {renderRemoteNode} from '../node.tsx';
import {RESERVED_PROPS} from '../constants.ts';
import type {RemoteNodeRenderOptions} from '../types.ts';

export interface RemoteElementPropsOptions<Props = {}> {
  /**
   * Customizes the props your wrapper React component will have for event listeners
   * on the underlying custom element. The key is the prop name on the React component,
   * and the value is an options object containing the event name on the custom element.
   *
   * @example
   * ```tsx
   * const props = usePropsForRemoteElement(element, {
   *   eventProps: {
   *     onClick: {event: 'click'},
   *   },
   * });
   * ```
   */
  eventProps?: {
    [K in keyof Props]?: {
      /**
       * The event name that corresponds to this prop.
       */
      event: string;
    };
  };
}

/**
 * Converts a remote element into props for a React element. In addition to passing along
 * the `properties` of that element, this hook will convert any child elements with a `slot`
 * property into a prop of the same name, with the value rendered to a React element.
 */
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteReceiverElement,
  options: RemoteNodeRenderOptions & RemoteElementPropsOptions<Props>,
): Props;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions & RemoteElementPropsOptions<Props>,
): Props | undefined;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions & RemoteElementPropsOptions<Props>,
): Props | undefined {
  if (!element) return undefined;

  const {children, properties, attributes, eventListeners} = element;
  const reactChildren: ReturnType<typeof renderRemoteNode>[] = [];
  const resolvedProperties: Record<string, any> = {};

  // Remote data never gets to set props the renderer or the framework owns.
  // Attributes are additionally required to be strings, which is what the
  // receiver guarantees; anything else is dropped rather than rendered.
  for (const name of Object.keys(properties)) {
    if (RESERVED_PROPS.has(name)) continue;
    resolvedProperties[name] = properties[name];
  }

  for (const name of Object.keys(attributes)) {
    const value = attributes[name];
    if (RESERVED_PROPS.has(name) || typeof value !== 'string') continue;
    resolvedProperties[name] = value;
  }

  resolvedProperties.children = reactChildren;

  if (options.eventProps) {
    for (const [prop, eventDescription] of Object.entries(options.eventProps)) {
      const eventName = eventDescription?.event;
      if (eventName == null) continue;

      const listener = eventListeners[eventName];
      if (listener) {
        resolvedProperties[prop] = wrapEventListenerForCallback(listener);
      }
    }
  } else {
    // Assume all event listeners are allowed, and write each one as a conventional
    // Preact callback prop.
    for (const [eventName, listener] of Object.entries(eventListeners)) {
      resolvedProperties[
        `on${eventName[0]!.toUpperCase()}${eventName.slice(1)}`
      ] = wrapEventListenerForCallback(listener);
    }
  }

  for (const child of children) {
    if (
      child.type === 1 &&
      typeof child.attributes.slot === 'string' &&
      !RESERVED_PROPS.has(child.attributes.slot)
    ) {
      const slot = child.attributes.slot;
      const rendered = renderRemoteNode(child, options);
      resolvedProperties[slot] = resolvedProperties[slot] ? (
        <>
          {resolvedProperties[slot]}
          {rendered}
        </>
      ) : (
        rendered
      );
    } else {
      reactChildren.push(renderRemoteNode(child, options));
    }
  }

  return resolvedProperties as unknown as Props;
}

function wrapEventListenerForCallback(listener: (...args: any[]) => any) {
  return function eventListenerCallbackWrapper(...args: any[]) {
    if (args.length === 1 && args[0] instanceof Event) {
      const event = args[0];
      if (event.target !== event.currentTarget) return;

      return 'detail' in event ? listener(event.detail) : listener();
    }

    return listener(...args);
  };
}
