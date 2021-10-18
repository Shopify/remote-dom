import type {
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';

import type {Node} from '../types';

import {toHaveRemoteProps} from './props';
import {
  toContainRemoteComponent,
  toContainRemoteComponentTimes,
} from './components';
import {toContainRemoteText} from './text';

type PropsFromNode<T> = NonNullable<T> extends Node<infer U> ? U : never;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/ban-types
    interface Matchers<R, T = {}> {
      toHaveRemoteProps(props: Partial<PropsFromNode<T>>): void;
      toContainRemoteComponent<
        Type extends RemoteComponentType<string, any, any>,
      >(
        type: Type,
        props?: Partial<PropsForRemoteComponent<Type>>,
      ): void;
      toContainRemoteComponentTimes<
        Type extends RemoteComponentType<string, any, any>,
      >(
        type: Type,
        times: number,
        props?: Partial<PropsForRemoteComponent<Type>>,
      ): void;
      toContainRemoteText(text: string): void;
    }
  }
}

expect.extend({
  toHaveRemoteProps,
  toContainRemoteComponent,
  toContainRemoteComponentTimes,
  toContainRemoteText,
});
