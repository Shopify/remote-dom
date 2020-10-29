import {
  createRemoteRoot,
  createRemoteComponent,
  RemoteComponent,
} from '@remote-ui/core';
import {createRender, append} from './render';

const Button = createRemoteComponent('Button');

describe('htm', () => {
  it('converts htm into RemoteRoot operations', () => {
    const root = createRemoteRoot(() => {});
    const ui = createRender(root);

    const onPress = jest.fn();
    const content = 'Buy me!';

    append(root, ui`<${Button} onPress=${onPress}>${content}<//>`);

    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toStrictEqual(
      expect.objectContaining({
        type: Button,
        props: {onPress},
      }),
    );
    expect(
      (root.children[0] as RemoteComponent<any, any>).children[0],
    ).toStrictEqual(expect.objectContaining({text: content}));
  });
});
