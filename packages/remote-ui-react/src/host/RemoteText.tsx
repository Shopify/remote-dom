import React, {memo, useState, useEffect} from 'react';
import {
  Serialized,
  RemoteReceiver,
  RemoteText as RemoteTextDescription,
} from '@shopify/remote-ui-core';

import {useLazyRef, useOnValueChange} from './hooks';

interface Props {
  text: Serialized<RemoteTextDescription<any>>;
  receiver: RemoteReceiver;
}

export const RemoteText = memo(({text, receiver}: Props) => {
  const [textContent, setTextContent] = useState(() => text.text);
  const unlisten = useLazyRef(() =>
    receiver.listen(text, ({text}) => setTextContent(text)),
  );

  useOnValueChange(text, (newValue) => {
    unlisten.current();
    unlisten.current = receiver.listen(newValue, ({text}) =>
      setTextContent(text),
    );
  });

  useEffect(() => {
    return () => {
      unlisten.current();
    };
  }, [unlisten]);

  return <>{textContent}</>;
});
