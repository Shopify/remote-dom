import type {ComponentType} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverElement,
} from '@remote-dom/core/receiver';

export interface RemoteComponentRendererProps {
  element: RemoteReceiverElement;
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;
