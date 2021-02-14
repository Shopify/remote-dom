import {memo} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableText,
} from '@remote-ui/core';

import {useAttached} from './hooks';

interface Props {
  text: RemoteReceiverAttachableText;
  receiver: RemoteReceiver;
}

export const RemoteText = memo(({text, receiver}: Props) => {
  const attached = useAttached(receiver, text);
  return attached ? <>{attached.text}</> : null;
});
