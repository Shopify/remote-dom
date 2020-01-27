import React, {memo, useEffect, createElement} from 'react';
import {
  Serialized,
  RemoteReceiver,
  RemoteComponent as RemoteComponentDescription,
} from '@remote-ui/core';

import {Controller} from './controller';
import {RemoteText} from './RemoteText';
import {useForceUpdate, useLazyRef, useOnValueChange} from './hooks';

interface Props {
  receiver: RemoteReceiver;
  component: Serialized<RemoteComponentDescription<any, any>>;
  controller: Controller;
}

export const RemoteComponent = memo(
  ({receiver, component, controller}: Props) => {
    const forceUpdate = useForceUpdate();
    const unlisten = useLazyRef(() => receiver.on(component, forceUpdate));

    useOnValueChange(component, (newValue) => {
      unlisten.current();
      unlisten.current = receiver.on(newValue, forceUpdate);
    });

    useEffect(() => {
      return () => {
        unlisten.current();
      };
    }, [unlisten]);

    const Implementation = controller.get(component.type)!;

    return createElement(
      Implementation,
      component.props,
      ...[...component.children].map((child) => {
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
