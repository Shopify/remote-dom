import React, {memo, createElement} from 'react';
import {
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
}

export const RemoteComponent = memo(
  ({receiver, component, controller}: Props) => {
    const {props, children} = useAttached(receiver, component);
    const Implementation = controller.get(component.type)!;

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
            />
          );
        } else {
          return <RemoteText key={child.id} text={child} receiver={receiver} />;
        }
      }),
    );
  },
);
