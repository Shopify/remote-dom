import {extend, document} from '../client';

/** A DOM-based extension */
extend('dom', (root, api) => {
  async function onPress() {
    // We use our `api` object to get some information from the main
    // page, which in this case will be the content of a text field only
    // the main page has access to.
    const message = await api.getMessage();

    const item = document.createElement('ui-stack-item');
    item.padding = 'med';
    item.textContent = `Message from the host: ${JSON.stringify(message)}`;
    messages.append(item);
  }

  const button = document.createElement('button');
  button.textContent = 'Log the message';
  button.addEventListener('press', onPress);

  const messages = document.createElement('ui-stack');
  messages.vertical = true;

  root.append(button, messages);
});
