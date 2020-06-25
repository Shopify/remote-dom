import React, {memo, useMemo, Fragment, createElement} from 'react';
import {RemoteReceiver} from '@remote-ui/core';

import {Controller, ComponentMapping} from './controller';
import {useAttached} from './hooks';
import {RemoteText} from './RemoteText';
import {RemoteComponent} from './RemoteComponent';

interface Props {
  receiver: RemoteReceiver;
  components: ComponentMapping;
}

export const RemoteRenderer = memo(({components, receiver}: Props) => {
  const controller = useMemo(() => new Controller(components), [components]);
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
        />
      ) : (
        <RemoteText key={child.id} text={child} receiver={receiver} />
      ),
    ),
  );
});
