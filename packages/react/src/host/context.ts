import {createContext, useContext} from 'react';

export const ControllerContext = createContext<
  import('./controller').Controller | null
>(null);

export const ReceiverContext = createContext<
  import('@remote-ui/core').Receiver | null
>(null);

export function useController() {
  const controller = useContext(ControllerContext);

  if (controller == null) {
    throw new Error('No remote-ui Controller instance found in context');
  }

  return controller;
}

export function useReceiver() {
  const receiver = useContext(ReceiverContext);

  if (receiver == null) {
    throw new Error('No remote-ui Receiver instance found in context');
  }

  return receiver;
}
