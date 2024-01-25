import type {ComponentChild, ComponentType} from 'preact';
import type {
  RemoteElementConstructor,
  RemotePropertiesFromElementConstructor,
  RemoteMethodsFromElementConstructor,
  RemoteSlotsFromElementConstructor,
} from '@remote-dom/core/elements';

export type RemoteComponentType<
  Properties extends Record<string, any> = {},
  Methods extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = ComponentType<RemoteComponentProps<Properties, Methods, Slots>>;

export type RemoteComponentProps<
  Properties extends Record<string, any> = {},
  _Methods extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = Omit<Properties, keyof Slots> & {
  [Slot in keyof Slots]: ComponentChild;
} & {children?: ComponentChild};

export type RemoteComponentPropsFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any, any>,
> = RemoteComponentProps<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteMethodsFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
>;

export type RemoteComponentTypeFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any, any>,
> = RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteMethodsFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
>;
