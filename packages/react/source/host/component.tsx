import type {RemoteReceiverElement} from '@remote-dom/core/receivers';
import {
  memo,
  useRef,
  useEffect,
  type MutableRefObject,
  type ComponentType,
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

interface Internals extends Pick<RemoteComponentRendererProps, 'receiver'> {
  id: string;
  instanceRef: MutableRefObject<unknown>;
}

export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
>(
  Component: ComponentType<Props>,
  {name}: {name?: string} = {},
): ComponentType<RemoteComponentRendererProps> {
  const RemoteComponentRenderer = memo(function RemoteComponentRenderer({
    element,
    receiver,
    components,
  }: RemoteComponentRendererProps) {
    const internalsRef = useRef<Internals>();

    const attachedElement = useRemoteReceived(element, receiver);
    const resolvedElement = attachedElement ?? element;
    const resolvedId = resolvedElement.id;

    const props = usePropsForRemoteElement<Props>(resolvedElement, {
      receiver,
      components,
    });

    (props as any)[REMOTE_ELEMENT_PROP] = resolvedElement;
    (props as any)[REMOTE_ELEMENT_ATTACHED_PROP] = attachedElement != null;

    if (internalsRef.current == null) {
      const internals: Internals = {
        id: resolvedId,
        receiver,
      } as any;

      internals.instanceRef = createImplementationRef(internals);
      internalsRef.current = internals;
    }

    internalsRef.current.id = resolvedId;
    internalsRef.current.receiver = receiver;

    useEffect(() => {
      const node = {id: resolvedId};

      receiver.implement(
        node,
        internalsRef.current?.instanceRef.current as any,
      );

      return () => {
        receiver.implement(node, null);
      };
    }, [resolvedId, receiver]);

    return <Component ref={internalsRef.current.instanceRef} {...props} />;
  });

  RemoteComponentRenderer.displayName =
    name ??
    `RemoteComponentRenderer(${
      Component.displayName ?? Component.name ?? 'Component'
    })`;

  return RemoteComponentRenderer;
}

function createImplementationRef(
  internals: Pick<Internals, 'id' | 'receiver'>,
): MutableRefObject<unknown> {
  let current: unknown = null;

  return {
    get current() {
      return current;
    },
    set current(implementation) {
      current = implementation;
      internals.receiver.implement(internals, implementation as any);
    },
  };
}
