import React, {memo, useState, useEffect} from 'react';
import {
  Receiver,
  Serialized,
  RemoteText as RemoteTextDescription,
} from '@remote-ui/core';
import {useLazyRef, useOnValueChange} from './hooks';

interface Props {
  text: Serialized<RemoteTextDescription<any>>;
  receiver: Receiver;
}

export const RemoteText = memo(({text, receiver}: Props) => {
  const [textContent, setTextContent] = useState(() => text.text);
  const unlisten = useLazyRef(() =>
    receiver.on(text, ({text}) => setTextContent(text)),
  );

  useOnValueChange(text, (newValue) => {
    unlisten.current();
    unlisten.current = receiver.on(newValue, ({text}) => setTextContent(text));
  });

  useEffect(() => {
    return () => {
      unlisten.current();
    };
  }, [unlisten]);

  return <>{textContent}</>;
});
