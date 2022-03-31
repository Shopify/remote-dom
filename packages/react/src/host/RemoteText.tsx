import {memo} from 'react';

import type {RemoteTextProps} from './types';
import {useAttached} from './hooks';

export const RemoteText = memo(function RemoteText({
  text,
  receiver,
}: RemoteTextProps) {
  const attached = useAttached(receiver, text);
  return attached ? <>{attached.text}</> : null;
});
