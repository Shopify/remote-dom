import {createContext, useContext} from 'react';
import {RemoteRoot} from '@remote-ui/core';
import {ReactComponentFromRemoteComponent} from './types';

export class Controller {
  constructor(private readonly root: RemoteRoot) {}

  getNativeComponent<Type extends string>(
    component: Type,
  ): ReactComponentFromRemoteComponent<Type> {
    // if (this.root.supports(component)) {
    //   return component as any;
    // }

    // throw new Error(
    //   `You attempted to create a ${component} component, but it is not supported by the remote root.`,
    // );

    return component as any;
  }
}

export const ControllerContext = createContext<Controller | null>(null);

export function useController() {
  const controller = useContext(ControllerContext);

  if (controller == null) {
    throw new Error('No controller found');
  }

  return controller;
}
