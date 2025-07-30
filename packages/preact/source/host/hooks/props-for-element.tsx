import type {SignalRemoteReceiverElement} from '@remote-dom/signals';

import {renderRemoteNode} from '../node.tsx';
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
 * Converts a remote element into props for a Preact element. In addition to passing along
 * the `properties` of that element, this hook will convert any child elements with a `slot`
 * property into a prop of the same name, with the value rendered to a Preact element.
 */
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement,
  options: RemoteNodeRenderOptions & RemoteElementPropsOptions<Props>,
): Props;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions & RemoteElementPropsOptions<Props>,
): Props | undefined;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions & RemoteElementPropsOptions<Props>,
): Props | undefined {
  if (!element) return undefined;

  const {children, properties, attributes, eventListeners} = element;
  const resolvedEventListeners = eventListeners.value;
  
  // Get listener counts from the dedicated signal first, then fallback to properties
  const eventListenerCounts = (element as any).eventListenerCounts?.value || properties.value.__eventListenerCounts || {};

  const reactChildren: ReturnType<typeof renderRemoteNode>[] = [];

  const resolvedProperties: Record<string, any> = {
    ...properties.value,
    ...attributes.value,
  };

  if (options.eventProps) {
    for (const [prop, eventDescription] of Object.entries(options.eventProps)) {
      const eventName = eventDescription?.event;
      if (eventName == null) continue;

      const listener = resolvedEventListeners[eventName];
      if (listener) {
        resolvedProperties[prop] = wrapEventListenerForCallback(listener);
      }
    }
  } else {
    // Assume all event listeners are allowed, and write each one as a conventional
    // Preact callback prop.
    for (const [eventName, listener] of Object.entries(
      resolvedEventListeners,
    )) {
      resolvedProperties[
        `on${eventName[0]!.toUpperCase()}${eventName.slice(1)}`
      ] = wrapEventListenerForCallback(listener);
    }
  }

  for (const child of children.value) {
    let slot: string | undefined =
      child.type === 1 ? (child.attributes.peek().slot as any) : undefined;

    if (typeof slot !== 'string') slot = undefined;

    if (slot) {
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

  return {
    ...resolvedProperties,
    children: reactChildren,
    // Expose listener counts as a special property for monitoring
    __eventListenerCounts: eventListenerCounts,
  } as unknown as Props;
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
