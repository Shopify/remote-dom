import {memo, useMemo} from 'react';
import type {ComponentType} from 'react';
import {
  KIND_COMPONENT,
  KIND_TEXT,
  isRemoteReceiverAttachableFragment,
} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableFragment,
  RemoteReceiverAttachableChild,
} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './hooks';

interface RemoteFragmentProps {
  receiver: RemoteReceiver;
  fragment: RemoteReceiverAttachableFragment;
  controller: Controller;
}

interface Props {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
  // Type override allows components to bypass default wrapping behavior, specifically in Argo Admin which uses Polaris to render on the host. Ex: Stack, ResourceList...
  // See https://github.com/Shopify/app-extension-libs/issues/996#issuecomment-710437088
  __type__?: ComponentType;
}

const emptyObject = {};

export const RemoteComponent = memo(
  ({receiver, component, controller}: RemoteComponentProps) => {
    const {renderComponent, renderText} = useRemoteRenderer();
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
<<<<<<< HEAD
        {renderChildren(children, receiver, controller)}
=======
        {[...children].map((child) => {
          let element: ReactElement | null;
          switch (child.kind) {
            case KIND_COMPONENT:
              element = renderComponent({
                component: child,
                receiver,
                controller,
              });
              break;
            case KIND_TEXT:
              element = renderText({text: child, receiver});
              break;
            default:
              element = null;
              break;
          }
          return element ? cloneElement(element, {key: child.id}) : null;
        })}
>>>>>>> a2eb711 (Add the ability for consumers to render custom components)
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
  return [...children].map((child) => {
    switch (child.kind) {
      case KIND_COMPONENT:
        return (
          <RemoteComponent
            key={child.id}
            receiver={receiver}
            component={child}
            controller={controller}
            __type__={(controller.get(child.type) as any)?.__type__}
          />
        );
      case KIND_TEXT:
        return <RemoteText key={child.id} text={child} receiver={receiver} />;
      default:
        return null;
    }
  });
}
