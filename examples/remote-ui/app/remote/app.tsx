/** @jsxRuntime automatic */
/** @jsxImportSource react */

import {useState} from 'react';
import {Button, Modal, Stack, Text} from './components';

export function App({api}: {api: any}) {
  const [showModal, setShowModal] = useState(false);
  const [count, setCount] = useState(0);

  function removeModal() {
    setShowModal(false);
  }

  return (
    <Stack spacing>
      <>
        <Text>
          Rendering example: <Text emphasis>remote-ui legacy</Text>
        </Text>
        <Button
          onPress={() => setShowModal(true)}
          modal={
            showModal ? (
              <Modal
                primaryAction={
                  <Button
                    onPress={() => {
                      removeModal();
                      if (count > 0) {
                        void api.showAlert(`You clicked ${count} times!`);
                      }
                    }}
                  >
                    Close
                  </Button>
                }
              >
                <Stack spacing>
                  <Text>
                    Click count: <Text emphasis>{count}</Text>
                  </Text>
                  <Button
                    onPress={() => {
                      setCount((count) => count + 1);
                    }}
                  >
                    Click me!
                  </Button>
                </Stack>
              </Modal>
            ) : undefined
          }
        >
          Open modal
        </Button>
      </>
    </Stack>
  );
}
