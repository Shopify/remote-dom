import type {RemoteReceiverElement} from '@remote-dom/core/receivers';

import {renderRemoteNode} from '../node.tsx';
import type {RemoteNodeRenderOptions} from '../types.ts';

/**
 * Converts a remote element into props for a React element. In addition to passing along
 * the `properties` of that element, this hook will convert any child elements with a `slot`
 * property into a prop of the same name, with the value rendered to a React element.
 */
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(element: RemoteReceiverElement, options: RemoteNodeRenderOptions): Props;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions,
): Props | undefined;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions,
): Props | undefined {
  if (!element) return undefined;

  const {children, properties, attributes, eventListeners} = element;
  const reactChildren: ReturnType<typeof renderRemoteNode>[] = [];
  const slotProperties: Record<string, any> = {...properties};

  for (const child of children) {
    if (child.type === 1 && typeof child.attributes.slot === 'string') {
      const slot = child.attributes.slot;
      const rendered = renderRemoteNode(child, options);
      slotProperties[slot] = slotProperties[slot] ? (
        <>
          {slotProperties[slot]}
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
    ...properties,
    ...attributes,
    ...Object.keys(eventListeners).reduce<Record<string, any>>(
      (listenerProps, event) => {
        listenerProps[`on${event[0]!.toUpperCase()}${event.slice(1)}`] =
          eventListeners[event];
        return listenerProps;
      },
      {},
    ),
    ...slotProperties,
    children: reactChildren,
  } as unknown as Props;
}
