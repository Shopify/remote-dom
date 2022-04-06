import {memo, useMemo} from 'react';
import {
  KIND_COMPONENT,
  KIND_TEXT,
  isRemoteReceiverAttachableFragment,
} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableChild,
  RemoteReceiverAttachableComponent,
} from '@remote-ui/core';

import {useAttached} from './hooks';
import type {
  Controller,
  RemoteComponentProps,
  RemoteFragmentProps,
} from './types';

const emptyObject = {};

export const RemoteComponent = memo(function RemoteComponent({
  receiver,
  component,
  controller,
}: RemoteComponentProps) {
  const Implementation = controller.get(component.type)!;

  const attached = useAttached(receiver, component);

  const props = useMemo(() => {
    const props = attached?.props as any;
    if (!props) return emptyObject;

    const newProps: typeof props = {};
    for (const key of Object.keys(props)) {
      const prop = props[key];
      newProps[key] = isRemoteReceiverAttachableFragment(prop) ? (
        <RemoteFragment
          parent={component}
          receiver={receiver}
          fragment={prop}
          controller={controller}
        />
      ) : (
        prop
      );
    }
    return newProps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiver, controller, attached?.props, component.version]);

  if (attached == null) return null;

  const {children} = attached;

  if (children.length === 0) {
    return <Implementation {...props} />;
  }

  return (
    <Implementation {...props}>
      {renderChildren(component, children, receiver, controller)}
    </Implementation>
  );
});

const RemoteFragment = memo(function RemoteFragment({
  parent,
  receiver,
  fragment,
  controller,
}: RemoteFragmentProps) {
  const {children} = useAttached(receiver, fragment) ?? {};
  if (!children) return null;
  return <>{renderChildren(parent, children, receiver, controller)}</>;
});

function renderChildren(
  component: RemoteReceiverAttachableComponent,
  children: RemoteReceiverAttachableChild[],
  receiver: RemoteReceiver,
  controller: Controller,
) {
  const {renderComponent, renderText} = controller.renderer;
  return [...children].map((child) => {
    switch (child.kind) {
      case KIND_COMPONENT:
        return renderComponent({
          parent: component,
          component: child,
          receiver,
          controller,
          key: child.id,
        });
      case KIND_TEXT:
        return renderText({
          parent: component,
          text: child,
          receiver,
          key: child.id,
        });
      default:
        return null;
    }
  });
}
