import {memo, useEffect} from 'react';
import type {ComponentType} from 'react';
import {
  retain,
  release,
  isRemoteFragment,
  RemoteReceiverAttachableChild,
} from '@remote-ui/core';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableFragment,
  RemoteFragmentSerialization,
} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './hooks';

interface RemoteFragmentProps {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableFragment;
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

    useEffect(() => {
      if (props === null || typeof props !== 'object') return;
      const noFragmentProps = Object.keys(props as any).reduce((acc, key) => {
        const prop = (props as any)[key];
        if (isRemoteFragmentSerialization(prop)) return acc;
        return {
          ...acc,
          [key]: prop,
        };
      }, {} as any);

      retain(noFragmentProps);

      return () => {
        release(noFragmentProps);
      };
    }, [props]);

    const fragmentProps = Object.keys(props as any).reduce((acc, key) => {
      const prop = (props as any)[key];
      if (!isRemoteFragmentSerialization(prop)) return acc;
      return {
        ...acc,
        [key]: (
          <RemoteFragment
            receiver={receiver}
            component={prop as any}
            controller={controller}
          />
        ),
      };
    }, {} as any);

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
  ({receiver, component, controller}: RemoteFragmentProps) => {
    const {children} = useAttached(receiver, component) ?? {};
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
    if ('children' in child) {
      return (
        <RemoteComponent
          key={child.id}
          receiver={receiver}
          component={child}
          controller={controller}
          __type__={(controller.get(child.type) as any)?.__type__}
        />
      );
    } else {
      return <RemoteText key={child.id} text={child} receiver={receiver} />;
    }
  });
}

function isRemoteFragmentSerialization(
  object: unknown,
): object is RemoteFragmentSerialization {
  return isRemoteFragment(object);
}
