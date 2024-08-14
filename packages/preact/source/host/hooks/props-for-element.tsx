import type {SignalRemoteReceiverElement} from '@remote-dom/signals';

import {renderRemoteNode} from '../node.tsx';
import type {RemoteNodeRenderOptions} from '../types.ts';

/**
 * Converts a remote element into props for a Preact element. In addition to passing along
 * the `properties` of that element, this hook will convert any child elements with a `slot`
 * property into a prop of the same name, with the value rendered to a Preact element.
 */
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement,
  options: RemoteNodeRenderOptions,
): Props;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions,
): Props | undefined;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement | undefined,
  options: RemoteNodeRenderOptions,
): Props | undefined {
  if (!element) return undefined;

  const {children, properties, attributes, eventListeners} = element;
  const resolvedEventListeners = eventListeners.value;

  const reactChildren: ReturnType<typeof renderRemoteNode>[] = [];

  const resolvedProperties: Record<string, any> = {
    ...properties.value,
    ...attributes.value,
    ...Object.keys(resolvedEventListeners).reduce<Record<string, any>>(
      (listenerProps, event) => {
        listenerProps[`on${event[0]!.toUpperCase()}${event.slice(1)}`] =
          resolvedEventListeners[event];
        return listenerProps;
      },
      {},
    ),
  };

  for (const child of children.value) {
    let slot: string | undefined =
      child.type === 1 ? (child.properties.peek().slot as any) : undefined;

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
  } as unknown as Props;
}
