import type {ComponentType} from 'preact';
import type {
  SignalRemoteReceiver,
  SignalRemoteReceiverElement,
} from '@remote-dom/signals/receivers';

export interface RemoteComponentRendererProps {
  element: SignalRemoteReceiverElement;
  receiver: SignalRemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;
