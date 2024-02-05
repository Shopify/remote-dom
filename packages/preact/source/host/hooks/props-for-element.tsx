import type {SignalRemoteReceiverElement} from '@remote-dom/signals';

import {renderRemoteNode, type RenderRemoteNodeOptions} from '../node.tsx';

/**
 * Converts a remote element into props for a React element. In addition to passing along
 * the `properties` of that element, this hook will convert any child elements with a `slot`
 * property into a prop of the same name, with the value rendered to a Preact element.
 */
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement,
  options: RenderRemoteNodeOptions,
): Props;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement | undefined,
  options: RenderRemoteNodeOptions,
): Props | undefined;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: SignalRemoteReceiverElement | undefined,
  options: RenderRemoteNodeOptions,
): Props | undefined {
  if (!element) return undefined;

  const {children, properties} = element;
  const reactChildren: ReturnType<typeof renderRemoteNode>[] = [];
  const resolvedProperties: Record<string, any> = {...properties.value};

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
