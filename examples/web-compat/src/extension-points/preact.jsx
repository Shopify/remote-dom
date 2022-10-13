import {extend, document} from '../client';
import {h, Fragment, render} from 'preact';
import {useState, useCallback} from 'preact/hooks';
import {signal} from '@preact/signals';

function Chat({api}) {
  const [messages, setMessages] = useState([]);

  const click = useCallback(async () => {
    const message = await api.getMessage();
    const time = new Date().toLocaleTimeString();
    const log = `Received (${time}): ${JSON.stringify(message)}`;
    setMessages((messages) => messages.concat(log));
  }, []);

  return (
    <>
      <ui-view borderWidth="base" borderRadius={5} padding="base">
        <ui-block-stack>
          <ui-block-stack>
            <ui-text size="medium">Chat</ui-text>
            <button onClick={click}>Get Message</button>
          </ui-block-stack>
          <ui-stack vertical>
            {messages.map((message) => (
              <ui-stack-item padding="med">{message}</ui-stack-item>
            ))}
          </ui-stack>
        </ui-block-stack>
      </ui-view>
    </>
  );
}

const count = signal(0);
function Counter() {
  return (
    <ui-stack align="center">
      <ui-stack-item>
        <button onPress={() => count.value++}>Increment</button>
      </ui-stack-item>
      <ui-stack-item>Count is {count}</ui-stack-item>
    </ui-stack>
  );
}

/** A Preact-based extension */
extend('preact', (root, api) => {
  const stack = document.createElement('ui-block-stack');
  stack.padding = 'lg';
  root.append(stack);

  const counter = document.createElement('ui-view');
  const chat = document.createElement('ui-view');
  stack.append(counter, chat);

  render(<Counter />, counter);
  render(<Chat api={api} />, chat);
});
