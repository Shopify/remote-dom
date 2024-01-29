import type {ReactNode, ComponentType, Ref} from 'react';
import type {
  RemoteElementConstructor,
  RemotePropertiesFromElementConstructor,
  RemoteMethodsFromElementConstructor,
  RemoteSlotsFromElementConstructor,
} from '@remote-dom/core/elements';

export type RemoteComponentProps<
  Properties extends Record<string, any> = {},
  _Methods extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = Omit<Properties, keyof Slots> & {
  [Slot in keyof Slots]: ReactNode;
} & {
  children?: ReactNode;
};

export type RemoteComponentPropsFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any, any>,
> = RemoteComponentProps<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteMethodsFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
> & {ref?: Ref<InstanceType<ElementConstructor>>};

export type RemoteComponentTypeFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any, any>,
> = ComponentType<
  RemoteComponentPropsFromElementConstructor<ElementConstructor>
>;
