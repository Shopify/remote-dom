import type {
  RemoteReceiver,
  RemoteReceiverText,
} from '@remote-dom/core/receiver';
import {useRemoteReceived} from './hooks/remote-received.ts';

export interface RemoteTextRendererProps {
  remote: RemoteReceiverText;
  receiver: RemoteReceiver;
}

export function RemoteTextRenderer({
  remote,
  receiver,
}: RemoteTextRendererProps) {
  const text = useRemoteReceived(remote, receiver);
  return text ? <>{text.data}</> : null;
}
