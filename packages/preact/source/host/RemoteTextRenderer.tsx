import type {
  SignalRemoteReceiver,
  SignalRemoteReceiverText,
} from '@remote-dom/signals/receiver';

export interface RemoteTextRendererProps {
  text: SignalRemoteReceiverText;
  receiver: SignalRemoteReceiver;
}

export function RemoteTextRenderer({text}: RemoteTextRendererProps) {
  const data = text.data.value;
  return data ? <>{data}</> : null;
}
