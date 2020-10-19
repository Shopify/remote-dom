import React, {memo, createElement, useEffect} from 'react';
import {retain, release} from '@remote-ui/core';
import type {
  Serialized,
  RemoteReceiver,
  RemoteComponent as RemoteComponentDescription,
} from '@remote-ui/core';

import {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useAttached} from './hooks';

interface Props {
  receiver: RemoteReceiver;
  component: Serialized<RemoteComponentDescription<any, any>>;
  controller: Controller;
  __type__?: React.ReactChild;
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
