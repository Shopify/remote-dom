import type {
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';

import type {Node} from '../types';

import {toHaveReactProps} from './props';
import {
  toContainRemoteComponent,
  toContainRemoteComponentTimes,
} from './components';
import {toContainReactText} from './text';

type PropsFromNode<T> = NonNullable<T> extends Node<infer U> ? U : never;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T = {}> {
      toHaveReactProps(props: Partial<PropsFromNode<T>>): void;
      toContainRemoteComponent<
        Type extends RemoteComponentType<string, any, any>
      >(
        type: Type,
        props?: Partial<PropsForRemoteComponent<Type>>,
      ): void;
      toContainRemoteComponentTimes<
        Type extends RemoteComponentType<string, any, any>
      >(
        type: Type,
        times: number,
        props?: Partial<PropsForRemoteComponent<Type>>,
      ): void;
      toContainReactText(text: string): void;
    }
  }
}

expect.extend({
  toHaveReactProps,
  toContainRemoteComponent,
  toContainRemoteComponentTimes,
  toContainReactText,
});
