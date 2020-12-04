import React, {memo, Fragment, createElement} from 'react';
import type {RemoteReceiver} from '@remote-ui/core';

import type {Controller} from './controller';
import {useAttached} from './hooks';
import {RemoteText} from './RemoteText';
import {RemoteComponent} from './RemoteComponent';

interface Props {
  receiver: RemoteReceiver;
  controller: Controller;
}

export const RemoteRenderer = memo(({controller, receiver}: Props) => {
  const {children} = useAttached(receiver, receiver.root)!;

  return createElement(
    Fragment,
    {},
    ...children.map((child) =>
      'type' in child ? (
        <RemoteComponent
          key={child.id}
          component={child}
          receiver={receiver}
          controller={controller}
          __type__={(controller.get(child.type) as any)?.__type__}
        />
      ) : (
        <RemoteText key={child.id} text={child} receiver={receiver} />
      ),
    ),
  );
});
