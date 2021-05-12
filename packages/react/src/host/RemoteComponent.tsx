import {memo, useMemo} from 'react';
import type {ComponentType} from 'react';
import {KIND_FRAGMENT, KIND_COMPONENT, KIND_TEXT} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableFragment,
  RemoteReceiverAttachableChild,
  RemoteFragmentSerialization,
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

export const RemoteComponent = memo(
  ({receiver, component, controller}: Props) => {
    const Implementation = controller.get(component.type)!;

    const attached = useAttached(receiver, component);
    const props = attached?.props;

    const fragmentProps = useMemo(
      () =>
        Object.keys(props as any).reduce((acc, key) => {
          const prop = (props as any)[key];
          if (!isRemoteFragmentSerialization(prop)) return acc;
          return {
            ...acc,
            [key]: (
              <RemoteFragment
                receiver={receiver}
                fragment={prop as any}
                controller={controller}
              />
            ),
          };
        }, {} as any),
      [receiver, controller, props, component.version],
    );

    if (attached == null) return null;

    const {children} = attached;

    return (
      <Implementation {...props} {...fragmentProps}>
        {renderChildren(receiver, controller, children)}
      </Implementation>
    );
  },
);

const RemoteFragment = memo(
  ({receiver, fragment, controller}: RemoteFragmentProps) => {
    const {children} = useAttached(receiver, fragment) ?? {};
    if (!children) return null;
    return <>{renderChildren(receiver, controller, children)}</>;
  },
);

function renderChildren(
  receiver: RemoteReceiver,
  controller: Controller,
  children: RemoteReceiverAttachableChild[],
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

function isRemoteFragmentSerialization(
  object: unknown,
): object is RemoteFragmentSerialization {
  return object != null && (object as any).kind === KIND_FRAGMENT;
}
