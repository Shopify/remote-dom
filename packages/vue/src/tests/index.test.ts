import {h, createApp} from 'vue';
import {createRemoteRoot} from '@remote-ui/core';

import {createRenderer} from '..';
import {createRemoteReceiver, RemoteRenderer, createController} from '../host';

import Remote from './components/Remote.vue';
import Button from './components/Button.vue';

describe('vue', () => {
  let appElement!: HTMLElement;

  beforeEach(() => {
    appElement = document.createElement('div');
    document.body.appendChild(appElement);
  });

  afterEach(() => {
    appElement.remove();
  });

  it('mirrors components from a remote root', async () => {
    const receiver = createRemoteReceiver();
    const root = createRemoteRoot(receiver.receive);

    const controller = createController({
      Button,
    });
    const app = createApp({
      render() {
        return h(RemoteRenderer, {
          receiver,
          controller,
        });
      },
    });
    app.mount(appElement);

    const {createApp: createRemoteApp} = createRenderer(root);

    const spy = jest.fn();
    const remoteApp = createRemoteApp({
      render() {
        return h(Remote, {onPress: spy}, () => 'Hello!');
      },
    });
    remoteApp.mount(root);

    await root.mount();
    await receiver.flush();
    expect(appElement.innerHTML).toBe('<button>Hello!</button>');

    await appElement.querySelector('button')!.dispatchEvent(new Event('click'));
    await receiver.flush();
    expect(appElement.innerHTML).toBe('<button disabled="">Hello!</button>');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
