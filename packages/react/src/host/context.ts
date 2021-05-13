import {createContext, ReactElement} from 'react';
import type {RemoteComponentProps, RemoteTextProps} from './types';

export const ControllerContext = createContext<
  import('./controller').Controller | null
>(null);

export const RemoteReceiverContext = createContext<
  import('@remote-ui/core').RemoteReceiver | null
>(null);

export interface RemoteRendererContextProps {
  renderComponent: (props: RemoteComponentProps) => ReactElement;
  renderText: (props: RemoteTextProps) => ReactElement;
}

export const RemoteRendererContext = createContext<RemoteRendererContextProps | null>(
  null,
);
