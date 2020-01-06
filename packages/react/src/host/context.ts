import {createContext} from 'react';

export const ControllerContext = createContext<
  import('./controller').Controller | null
>(null);

export const ReceiverContext = createContext<
  import('@remote-ui/core').Receiver | null
>(null);
