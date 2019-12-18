import React, {memo, Fragment, useState, useEffect, createElement} from 'react';
import {Receiver} from '@remote-ui/core';

import {Controller} from './controller';
import {useLazyRef} from './hooks';
import {RemoteText} from './RemoteText';
import {RemoteComponent} from './RemoteComponent';

interface Props {
  receiver: Receiver;
  controller: Controller;
}

export const Renderer = memo(({controller, receiver}: Props) => {
  const [children, setChildren] = useState(() => receiver.root.children);
  const unlisten = useLazyRef(() =>
    receiver.on(receiver.root, ({children}) => setChildren(children)),
  );

  useEffect(() => {
    return () => {
      unlisten.current();
    };
  }, [unlisten]);

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
