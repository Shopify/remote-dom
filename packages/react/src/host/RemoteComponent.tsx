import {memo, useMemo} from 'react';
import {
  KIND_COMPONENT,
  KIND_TEXT,
  isRemoteReceiverAttachableFragment,
} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableChild,
} from '@remote-ui/core';

import {useAttached} from './hooks';
import type {
  Controller,
  RemoteComponentProps,
  RemoteFragmentProps,
} from './types';

const emptyObject = {};

export function renderComponent({
  component,
  controller,
  receiver,
  key,
}: RemoteComponentProps) {
  return (
    <RemoteComponent
      receiver={receiver}
      component={component}
      controller={controller}
      key={key}
    />
  );
}

export const RemoteComponent = memo(
  ({receiver, component, controller}: RemoteComponentProps) => {
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
            receiver={receiver}
            fragment={prop}
            controller={controller}
          />
        ) : (
          prop
        );
      }
      return newProps;
    }, [receiver, controller, attached?.props, component.version]);

    if (attached == null) return null;

    const {children} = attached;

    return (
      <Implementation {...props}>
        {renderChildren(children, receiver, controller)}
      </Implementation>
    );
  },
);

const RemoteFragment = memo(
  ({receiver, fragment, controller}: RemoteFragmentProps) => {
    const {children} = useAttached(receiver, fragment) ?? {};
    if (!children) return null;
    return <>{renderChildren(children, receiver, controller)}</>;
  },
);

function renderChildren(
  children: RemoteReceiverAttachableChild[],
  receiver: RemoteReceiver,
  controller: Controller,
) {
  const {renderComponent, renderText} = controller.renderer;
  return [...children].map((child) => {
    switch (child.kind) {
      case KIND_COMPONENT:
        return renderComponent({
          component: child,
          receiver,
          controller,
          key: child.id,
        });
      case KIND_TEXT:
        return renderText({
          text: child,
          receiver,
          key: child.id,
        });
      default:
        return null;
    }
  });
}
