import React, {memo} from 'react';
import {
  Serialized,
  RemoteReceiver,
  RemoteText as RemoteTextDescription,
} from '@shopify/remote-ui-core';

import {useAttached} from './hooks';

interface Props {
  text: Serialized<RemoteTextDescription<any>>;
  receiver: RemoteReceiver;
}

export const RemoteText = memo(({text, receiver}: Props) => {
  const {text: textContent} = useAttached(receiver, text);
  return <>{textContent}</>;
});
