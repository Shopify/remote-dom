import {h, defineComponent} from 'vue';
import type {RemoteComponentType} from '@remote-ui/core';

import type {VueComponentTypeFromRemoteComponentType} from './types';

type KeysWithFunctionValues<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: any[]) => any
    ? K
    : never;
}[keyof T];

interface Options<Props> {
  emits?: {[key: string]: KeysWithFunctionValues<Props>};
}

export function createRemoteVueComponent<
  Type extends string,
  Props = Record<string, never>,
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true,
>(
  componentType: Type | RemoteComponentType<Type, Props, AllowedChildren>,
  {emits: emitMap}: Options<Props> = {},
): VueComponentTypeFromRemoteComponentType<
  RemoteComponentType<Type, Props, AllowedChildren>
> {
  const emits = emitMap ? Object.keys(emitMap) : undefined;
  const emitMethods =
    emits && emits.length > 0
      ? emits.reduce<Record<string, (...args: any[]) => any>>(
          (methods, eventName) => {
            const propName = emitMap![eventName as keyof typeof emitMap];
            methods[`emitter_${propName}`] = function (...args: any[]) {
              this.$emit(eventName, ...args);
            };
            return methods;
          },
          {},
        )
      : undefined;

  const props = (instance: any) => {
    return emits && emits.length > 0
      ? {
          ...instance.$attrs,
          ...emits.reduce<Record<string, (...args: any[]) => any>>(
            (emitProps, eventName) => {
              const propName = emitMap![eventName as keyof typeof emitMap];
              emitProps[propName as string] = instance[`emitter_${propName}`];
              return emitProps;
            },
            {},
          ),
        }
      : instance.$attrs;
  };

  return defineComponent({
    name: componentType,
    emits,
    inheritAttrs: false,
    render() {
      return h(componentType, props(this), this.$slots.default?.());
    },
    methods: emitMethods,
  });
}
