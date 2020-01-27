import React, {
  memo,
  useMemo,
  Fragment,
  useState,
  useEffect,
  createElement,
} from 'react';
import {RemoteReceiver} from '@remote-ui/core';

import {Controller, ComponentMapping} from './controller';
import {useLazyRef} from './hooks';
import {RemoteText} from './RemoteText';
import {RemoteComponent} from './RemoteComponent';

interface Props {
  receiver: RemoteReceiver;
  components: ComponentMapping;
}

export const RemoteRenderer = memo(({components, receiver}: Props) => {
  const [children, setChildren] = useState(() => receiver.root.children);
  const unlisten = useLazyRef(() =>
    receiver.on(receiver.root, ({children}) => setChildren(children)),
  );

  const controller = useMemo(() => new Controller(components), [components]);

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
