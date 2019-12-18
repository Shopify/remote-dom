import React from 'react';
import {useController} from './controller';
import {
  ReactComponentFromRemoteComponent,
  ReactPropsFromRemoteComponent,
} from './types';

export function createRemoteComponent<Type extends string>(
  type: Type,
): ReactComponentFromRemoteComponent<Type> {
  return process.env.NODE_ENV === 'production'
    ? ((type as unknown) as ReactComponentFromRemoteComponent<Type>)
    : createDevelopmentRemoteComponent(type);
}

function createDevelopmentRemoteComponent<Type extends string>(
  type: Type,
): ReactComponentFromRemoteComponent<Type> {
  function Component(props: ReactPropsFromRemoteComponent<Type>) {
    const controller = useController();
    const NativeComponent = controller.getNativeComponent(type) as any;
    return <NativeComponent {...props} />;
  }

  (Component as any).displayName = type;
  return Component;
}
