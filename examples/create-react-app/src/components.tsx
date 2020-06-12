import React from 'react';
import {ReactPropsFromRemoteComponentType} from '@remote-ui/react';

export function Card({
  children,
}: ReactPropsFromRemoteComponentType<typeof import('./worker/api').Card>) {
  return <div className="Card">{children}</div>;
}

export function Button({
  children,
  onPress,
}: ReactPropsFromRemoteComponentType<typeof import('./worker/api').Button>) {
  return (
    <button type="button" onClick={() => onPress()}>
      {children}
    </button>
  );
}
