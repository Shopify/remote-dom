import {createContext} from 'react';

export const ControllerContext = createContext<
  import('./controller').Controller | null
>(null);

export const RemoteReceiverContext = createContext<
  import('@shopify/rui-core').RemoteReceiver | null
>(null);
