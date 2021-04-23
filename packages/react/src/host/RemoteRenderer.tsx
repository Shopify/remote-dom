import {memo, useMemo, createContext, useContext} from 'react';
import {KIND_COMPONENT, KIND_TEXT, RemoteReceiver} from '@remote-ui/core';

import type {Controller} from './controller';
import {useAttached} from './hooks';
import {RemoteText} from './RemoteText';
import {RemoteComponent} from './RemoteComponent';

interface Props {
  receiver: RemoteReceiver;
  controller: Controller;
}

const RemoteRendererContext = createContext<Props>({} as any);

export function useRemoteRender() {
  return useContext(RemoteRendererContext);
}

export const RemoteRenderer = memo(({controller, receiver}: Props) => {
  const value = useMemo<Props>(
    () => ({
      controller,
      receiver,
    }),
    [controller],
  );
  const {children} = useAttached(receiver, receiver.attached.root)!;

  return (
    <RemoteRendererContext.Provider value={value}>
      {children.map((child) => {
        switch (child.kind) {
          case KIND_COMPONENT:
            return (
              <RemoteComponent
                key={child.id}
                component={child}
                receiver={receiver}
                controller={controller}
                __type__={(controller.get(child.type) as any)?.__type__}
              />
            );
          case KIND_TEXT:
            return (
              <RemoteText key={child.id} text={child} receiver={receiver} />
            );
          default:
            return null;
        }
      })}
    </RemoteRendererContext.Provider>
  );
});
