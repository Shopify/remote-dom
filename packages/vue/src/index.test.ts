import {createVNode} from 'vue';
import {createRemoteRoot, createRemoteComponent} from '@remote-ui/core';
import {createRenderer} from './index';

describe('vue', () => {
  it('works', () => {
    const Button = createRemoteComponent('Button');

    const root = createRemoteRoot(console.log);
    const {createApp} = createRenderer(root);

    createApp({
      setup() {
        return {message: 'hello!'};
      },
      render() {
        return createVNode(Button, {primary: true}, ['Hello!']);
      },
      components: {
        Button,
      },
    }).mount(root);
  });
});
