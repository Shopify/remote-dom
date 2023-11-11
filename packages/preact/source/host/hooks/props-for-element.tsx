import type {SignalRemoteReceiverElement} from '@remote-dom/signals/receiver';

import {renderRemoteNode, type RenderRemoteNodeOptions} from '../node.tsx';

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
