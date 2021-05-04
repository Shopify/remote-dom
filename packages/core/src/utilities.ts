import type {RemoteComponentType} from '@remote-ui/types';
import {
  RemoteRoot,
  RemoteComponent,
  RemoteText,
  RemoteFragment,
  KIND_COMPONENT,
  KIND_TEXT,
  KIND_FRAGMENT,
} from './types';

export function isRemoteComponent<
  Type extends RemoteComponentType<string, any, any> = any,
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>
>(child: unknown): child is RemoteComponent<Type, Root> {
  return child != null && (child as any).kind === KIND_COMPONENT;
}

export function isRemoteText<
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>
>(child: unknown): child is RemoteText<Root> {
  return child != null && (child as any).kind === KIND_TEXT;
}

export function isRemoteFragment<
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>
>(object: unknown): object is RemoteFragment<Root> {
  return object != null && (object as any).kind === KIND_FRAGMENT;
}

export function reduceObject(
  object: any,
  validator: (object: any) => boolean,
  callback: (object: any) => any,
): any {
  if (validator(object)) {
    return callback(object);
  }
  if (Array.isArray(object)) {
    return object.map((item) => reduceObject(item, validator, callback));
  }
  if (typeof object === 'object' && object !== null) {
    return Object.keys(object).reduce((acc, key) => {
      const item = (object as any)[key];
      return {
        ...acc,
        [key]: reduceObject(item, validator, callback),
      };
    }, {});
  }
  return object;
}
