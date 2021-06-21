import {Fragment, memo} from 'react';
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
              return (
                <Fragment key={child.id}>
                  {renderComponent({
                    component: child,
                    receiver,
                    controller,
                  })}
                </Fragment>
              );
            case KIND_TEXT:
              return (
                <Fragment key={child.id}>
                  {renderText({
                    text: child,
                    receiver,
                  })}
                </Fragment>
              );
            default:
              return null;
          }
        })}
      </>
    );
  },
);
