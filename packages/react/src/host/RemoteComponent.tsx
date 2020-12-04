import React, {memo, createElement, useEffect} from 'react';
import {retain, release} from '@remote-ui/core';
import type {
  Serialized,
  RemoteReceiver,
  RemoteComponent as RemoteComponentDescription,
} from '@remote-ui/core';

import type {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './hooks';

interface Props {
  receiver: RemoteReceiver;
  component: Serialized<RemoteComponentDescription<any, any>>;
  controller: Controller;
  // Type override allows components to bypass default wrapping behavior, specifically in Argo Admin which uses Polaris to render on the host. Ex: Stack, ResourceList...
  // See https://github.com/Shopify/app-extension-libs/issues/996#issuecomment-710437088
  __type__?: React.ComponentType;
}

export const RemoteComponent = memo(
  ({receiver, component, controller}: Props) => {
    const Implementation = controller.get(component.type)!;

    const attached = useAttached(receiver, component);
    const props = attached?.props;

    useEffect(() => {
      retain(props);

      return () => {
        release(props);
      };
    }, [props]);

    if (attached == null) return null;

    const {children} = attached;

    return createElement(
      Implementation,
      props,
      ...[...children].map((child) => {
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
      }),
    );
  },
);
