import type {RemoteReceiverElement} from '@remote-dom/core/receiver';
import {
  forwardRef,
  type ForwardRefRenderFunction,
  type ForwardRefExoticComponent,
} from 'react';

import {useRemoteReceived} from './hooks/remote-received.ts';
import {usePropsForRemoteElement} from './hooks/props-for-element.tsx';
import {
  REMOTE_ELEMENT_PROP,
  REMOTE_ELEMENT_ATTACHED_PROP,
} from './constants.ts';
import type {RemoteComponentRendererProps} from './types.ts';

export interface RemoteComponentRendererAdditionalProps {
  readonly [REMOTE_ELEMENT_PROP]: RemoteReceiverElement;
  readonly [REMOTE_ELEMENT_ATTACHED_PROP]: boolean;
}

export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
  Instance = never,
>(
  Component: ForwardRefRenderFunction<Instance, Props>,
  {name}: {name?: string} = {},
): ForwardRefExoticComponent<RemoteComponentRendererProps> {
  const RemoteComponentRenderer = forwardRef<
    Instance,
    RemoteComponentRendererProps
  >(function RemoteComponentRenderer({element, receiver, components}, ref) {
    const attachedElement = useRemoteReceived(element, receiver);
    const resolvedElement = attachedElement ?? element;
    const props = usePropsForRemoteElement<Props>(resolvedElement, {
      receiver,
      components,
    });

    (props as any)[REMOTE_ELEMENT_PROP] = resolvedElement;
    (props as any)[REMOTE_ELEMENT_ATTACHED_PROP] = attachedElement != null;

    return Component(props, ref);
  });

  RemoteComponentRenderer.displayName =
    name ??
    `RemoteComponentRenderer(${
      Component.displayName ?? Component.name ?? 'Component'
    })`;

  return RemoteComponentRenderer;
}
