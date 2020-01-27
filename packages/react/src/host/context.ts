import {createContext} from 'react';

export const ControllerContext = createContext<
  import('./controller').Controller | null
>(null);

export const RemoteReceiverContext = createContext<
  import('@remote-ui/core').RemoteReceiver | null
>(null);
