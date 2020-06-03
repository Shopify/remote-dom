import {
  createRemoteRoot,
  createRemoteComponent,
  RemoteComponent,
} from '@remote-ui/core';
import {htm, render} from './render';

const Button = createRemoteComponent('Button');

describe('htm', () => {
  it('converts htm into RemoteRoot operations', () => {
    const root = createRemoteRoot(() => {});
    const onPress = jest.fn();
    const content = 'Buy now';

    render(htm`<${Button} onPress=${onPress}>${content}<//>`, root);

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
