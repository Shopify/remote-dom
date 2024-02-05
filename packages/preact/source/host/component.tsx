import type {ComponentType} from 'preact';
import {memo, useRef, useEffect, type MutableRefObject} from 'preact/compat';
import type {RemoteReceiverElement} from '@remote-dom/core/receivers';

import {usePropsForRemoteElement} from './hooks/props-for-element.tsx';
import {REMOTE_ELEMENT_PROP} from './constants.ts';
import type {RemoteComponentRendererProps} from './types.ts';

/**
 * Additional props that are added to Preact components rendered by `createRemoteComponentRenderer`.
 */
export interface RemoteComponentRendererAdditionalProps {
  readonly [REMOTE_ELEMENT_PROP]: RemoteReceiverElement;
}

interface Internals extends Pick<RemoteComponentRendererProps, 'receiver'> {
  id: string;
  instanceRef: MutableRefObject<unknown>;
}

/**
 * Takes a Preact component, and returns a new component that can be used to render that
 * component from a remote element. This wrapper will handle subscribing to changes in that
 * element, and will normalize the properties on that remote element before passing them
 * to your Preact component.
 */
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

    const {id} = element;
    const props = usePropsForRemoteElement<Props>(element, {
      receiver,
      components,
    });

    (props as any)[REMOTE_ELEMENT_PROP] = element;

    if (internalsRef.current == null) {
      const internals: Internals = {
        id,
        receiver,
      } as any;

      internals.instanceRef = createImplementationRef(internals);
      internalsRef.current = internals;
    }

    internalsRef.current.id = id;
    internalsRef.current.receiver = receiver;

    useEffect(() => {
      const node = {id};

      receiver.implement(
        node,
        internalsRef.current?.instanceRef.current as any,
      );

      return () => {
        receiver.implement(node, null);
      };
    }, [id, receiver]);

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
