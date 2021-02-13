import {memo} from 'react';
import type {
  Serialized,
  RemoteReceiver,
  RemoteText as RemoteTextDescription,
} from '@remote-ui/core';

import {useAttached} from './hooks';

interface Props {
  text: Serialized<RemoteTextDescription<any>>;
  receiver: RemoteReceiver;
}

export const RemoteText = memo(({text, receiver}: Props) => {
  const attached = useAttached(receiver, text);
  return attached ? <>{attached.text}</> : null;
});
