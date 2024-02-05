import type {RemoteReceiverText} from '@remote-dom/core/receivers';

import {useRemoteReceived} from './hooks/remote-received.ts';
import type {RemoteNodeRenderOptions} from './types.ts';

export interface RemoteTextRendererProps
  extends Pick<RemoteNodeRenderOptions, 'receiver'> {
  /**
   * The remote text node to render.
   */
  remote: RemoteReceiverText;
}

/**
 * Renders a remote React element to the host using React.
 */
export function RemoteTextRenderer({
  remote,
  receiver,
}: RemoteTextRendererProps) {
  const text = useRemoteReceived(remote, receiver);
  return text ? <>{text.data}</> : null;
}
