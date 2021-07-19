import {memo} from 'react';

import type {RemoteTextProps} from './types';
import {useAttached} from './hooks';

export function renderText({text, receiver, key}: RemoteTextProps) {
  return <RemoteText key={key} text={text} receiver={receiver} />;
}

export const RemoteText = memo(({text, receiver}: RemoteTextProps) => {
  const attached = useAttached(receiver, text);
  return attached ? <>{attached.text}</> : null;
});
