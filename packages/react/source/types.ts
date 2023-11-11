import type {ReactNode, ComponentType} from 'react';
import type {
  RemoteElementConstructor,
  RemoteSlotsFromElementConstructor,
  RemotePropertiesFromElementConstructor,
} from '@remote-dom/core/elements';

export type RemoteComponentType<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = ComponentType<RemoteComponentProps<Properties, Slots>>;

export type RemoteComponentProps<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = Omit<Properties, keyof Slots> & {
  [Slot in keyof Slots]: ReactNode;
} & {children?: ReactNode};

export type RemoteComponentPropsFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any>,
> = RemoteComponentProps<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
>;

export type RemoteComponentTypeFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any>,
> = RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
>;
