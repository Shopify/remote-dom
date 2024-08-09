import type {ReactNode, ComponentType, Ref} from 'react';
import type {
  RemoteElementConstructor,
  RemotePropertiesFromElementConstructor,
  RemoteMethodsFromElementConstructor,
  RemoteSlotsFromElementConstructor,
} from '@remote-dom/core/elements';

/**
 * The props that will be passed to a React component when it is rendered
 * in response to a remote element. This type includes all the remote properties
 * of the underlying element, and any slotted children, converted to React elements
 * passed as properties with the same name as their slot.
 */
export type RemoteComponentProps<
  Properties extends Record<string, any> = {},
  _Methods extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = Omit<Properties, keyof Slots> & {
  [Slot in keyof Slots]: ReactNode;
} & {
  children?: ReactNode;
};

/**
 * Converts the type for a remote element into the full set of React props that
 * will be passed to a component that renders that element.
 */
export type RemoteComponentPropsFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any, any, any>,
> = RemoteComponentProps<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteMethodsFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
> & {ref?: Ref<InstanceType<ElementConstructor>>; slot?: string};

/**
 * Converts the type for a remote element into the type of a React component that
 * can be used to render that element.
 */
export type RemoteComponentTypeFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any, any, any>,
  AdditionalProps extends Record<string, any> = {},
> = ComponentType<
  RemoteComponentPropsFromElementConstructor<ElementConstructor> &
    AdditionalProps
>;
