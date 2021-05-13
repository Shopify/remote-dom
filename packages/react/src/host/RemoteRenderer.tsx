import {cloneElement, memo, ReactElement, useMemo} from 'react';
import {KIND_COMPONENT, KIND_TEXT, RemoteReceiver} from '@remote-ui/core';

import type {Controller} from './controller';
import {useAttached} from './hooks';
import {renderText as defaultRenderText} from './RemoteText';
import {renderComponent as defaultRenderComponent} from './RemoteComponent';
import {RemoteRendererContext} from './context';
import type {RemoteComponentProps, RemoteTextProps} from './types';

export interface RemoteRendererProps {
  receiver: RemoteReceiver;
  controller: Controller;
  renderComponent?: (props: RemoteComponentProps) => ReactElement;
  renderText?: (props: RemoteTextProps) => ReactElement;
}

export const RemoteRenderer = memo(
  ({
    controller,
    receiver,
    renderComponent = defaultRenderComponent,
    renderText = defaultRenderText,
  }: RemoteRendererProps) => {
    const {children} = useAttached(receiver, receiver.attached.root)!;
    const renderContextValue = useMemo(() => ({renderText, renderComponent}), [
      renderText,
      renderComponent,
    ]);

    return (
      <RemoteRendererContext.Provider value={renderContextValue}>
        {children.map((child) => {
          let element: ReactElement | null;
          switch (child.kind) {
            case KIND_COMPONENT:
              element = renderComponent({
                component: child,
                receiver,
                controller,
              });
              break;
            case KIND_TEXT:
              element = renderText({text: child, receiver});
              break;
            default:
              element = null;
              break;
          }
          return element ? cloneElement(element, {key: child.id}) : null;
        })}
      </RemoteRendererContext.Provider>
    );
  },
);
