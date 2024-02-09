import {useState} from 'react';

const Button = 'Button' as any;
const File = 'File' as any;

export function RemoteApp({getMessage}: {getMessage: () => Promise<string>}) {
  const [message, setMessage] = useState('');

  return (
    <>
      {message && `Message: ${message}`}
      <Button
        onPress={async () => {
          const message = await getMessage();
          setMessage(message);
          console.log(`Message from the host: ${message}`);
        }}
      >
        Log message in remote environment
      </Button>
      <File
        onChange={(files) => {
          const file = files[0];
          console.log(URL.createObjectURL(file));
        }}
      ></File>
    </>
  );
}
