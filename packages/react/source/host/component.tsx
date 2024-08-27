import type {RemoteReceiverElement} from '@remote-dom/core/receivers';
import {
  memo,
  useRef,
  useEffect,
  type MutableRefObject,
  type ComponentType,
} from 'react';

import {useRemoteReceived} from './hooks/remote-received.ts';
import {
  usePropsForRemoteElement,
  type RemoteElementPropsOptions,
} from './hooks/props-for-element.tsx';
import {
  REMOTE_ELEMENT_PROP,
  REMOTE_ELEMENT_ATTACHED_PROP,
} from './constants.ts';
import type {RemoteComponentRendererProps} from './types.ts';

/**
 * Additional props that are added to React components rendered by `createRemoteComponentRenderer`.
 */
export interface RemoteComponentRendererAdditionalProps {
  /**
   * The remote element that this component is rendering.
   */
  readonly [REMOTE_ELEMENT_PROP]: RemoteReceiverElement;
  readonly [REMOTE_ELEMENT_ATTACHED_PROP]: boolean;
}

export interface RemoteComponentRendererOptions<Props = {}>
  extends RemoteElementPropsOptions<Props> {
  /**
   * The display name of the resulting wrapper component. By default, a name derived
   * from the wrapped component is used, with a fallback to `RemoteComponentRenderer(Component)`.
   */
  name?: string;

  /**
   * Customizes the props your wrapper React component will have for event listeners
   * on the underlying custom element. The key is the prop name on the React component,
   * and the value is an options object containing the event name on the custom element.
   *
   * @example
   * ```tsx
   * const Button = createRemoteComponent(ButtonImplementation, {
   *   eventProps: {
   *     onClick: {event: 'click'},
   *   },
   * });
   *
   * function ButtonImplementation({children, onClick}) {
   *   // Default behavior: dispatch the `detail` of the event to the remote environment
   *   return <button onClick={onClick}>{children}</button>;
   *
   *   // Alternatively, dispatch a custom value to the remote environment, including potentially
   *   // omitting the event details entirely, like we do below:
   *   return <button onClick={() => onClick()}>{children}</button>;
   * }
   * ```
   */
  eventProps?: RemoteElementPropsOptions<Props>['eventProps'];
}

interface Internals extends Pick<RemoteComponentRendererProps, 'receiver'> {
  id: string;
  instanceRef: MutableRefObject<unknown>;
}

/**
 * Takes a React component, and returns a new component that can be used to render that
 * component from a remote element. This wrapper will handle subscribing to changes in that
 * element, and will normalize the properties on that remote element before passing them
 * to your React component.
 */
export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
>(
  Component: ComponentType<Props>,
  {name, eventProps}: NoInfer<RemoteComponentRendererOptions<Props>> = {},
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
      eventProps,
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
