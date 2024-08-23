import {useState, useEffect} from 'react';

const Button = 'Button' as any;

export function RemoteApp({
  getMessage,
  destroy,
}: {
  getMessage: () => Promise<string>;
  destroy: () => void;
}) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    console.log('Remote app mounted (useEffect)');

    return () => {
      console.log('Remote app unmounted (useEffect cleanup)');
    };
  }, []);

  return (
    <>
      {message && `Message: ${message}`}
      <Button
        onPress={async () => {
          const message = await getMessage();
          setMessage(message);
          console.log(`Message from the host: ${message}`);
          console.log(`Self-destructing`);
          destroy();
        }}
      >
        Log message in remote environment and self-destruct
      </Button>
    </>
  );
}
