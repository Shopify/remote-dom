import {forwardRef, type ForwardFn} from 'preact/compat';
import type {RemoteReceiverElement} from '@remote-dom/core/receiver';

import {usePropsForRemoteElement} from './hooks/props-for-element.tsx';
import {REMOTE_ELEMENT_PROP} from './constants.ts';
import type {RemoteComponentRendererProps} from './types.ts';

export interface RemoteComponentRendererAdditionalProps {
  readonly [REMOTE_ELEMENT_PROP]: RemoteReceiverElement;
}

export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
  Instance = never,
>(
  Component: ForwardFn<Props, Instance>,
  {name}: {name?: string} = {},
): ReturnType<typeof forwardRef<Instance, Props>> {
  const RemoteComponentRenderer = forwardRef<
    Instance,
    RemoteComponentRendererProps
  >(function RemoteComponentRenderer({element, receiver, components}, ref) {
    const props = usePropsForRemoteElement<Props>(element, {
      receiver,
      components,
    });

    (props as any)[REMOTE_ELEMENT_PROP] = element;

    return Component(props, ref);
  });

  RemoteComponentRenderer.displayName =
    name ??
    `RemoteComponentRenderer(${
      Component.displayName ?? Component.name ?? 'Component'
    })`;

  return RemoteComponentRenderer as any;
}
