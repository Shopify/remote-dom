import {memo} from 'react';
import {KIND_COMPONENT, KIND_TEXT, RemoteReceiver} from '@remote-ui/core';

import type {Controller} from './types';
import {useAttached} from './hooks';

export interface RemoteRendererProps {
  receiver: RemoteReceiver;
  controller: Controller;
}

export const RemoteRenderer = memo(
  ({controller, receiver}: RemoteRendererProps) => {
    const {children} = useAttached(receiver, receiver.attached.root)!;
    const {renderComponent, renderText} = controller.renderer;

    return (
      <>
        {children.map((child) => {
          switch (child.kind) {
            case KIND_COMPONENT:
              return renderComponent({
                component: child,
                receiver,
                controller,
                key: child.id,
              });
            case KIND_TEXT:
              return renderText({
                text: child,
                receiver,
                key: child.id,
              });
            default:
              return null;
          }
        })}
      </>
    );
  },
);
