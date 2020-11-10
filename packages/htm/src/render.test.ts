import {
  createRemoteRoot,
  createRemoteComponent,
  RemoteComponent,
} from '@remote-ui/core';
import {createHtm, append} from './render';

const Button = createRemoteComponent('Button');

describe('htm', () => {
  it('converts htm into RemoteRoot operations', () => {
    const root = createRemoteRoot(() => {});
    const htm = createHtm(root);

    const onPress = jest.fn();
    const content = 'Buy me!';

    append(htm`<${Button} onPress=${onPress}>${content}<//>`, root);

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

  it('can append to RemoteComponents', () => {
    const root = createRemoteRoot(() => {});
    const htm = createHtm(root);

    const onPress = jest.fn();
    const content = 'Buy me!';

    const Stack = createRemoteComponent('Stack');
    const stack = root.createComponent(Stack);

    append(htm`<${Button} onPress=${onPress}>${content}<//>`, stack);

    expect(stack.children).toHaveLength(1);
    expect(stack.children[0]).toStrictEqual(
      expect.objectContaining({
        type: Button,
        props: {onPress},
      }),
    );
    expect(
      (stack.children[0] as RemoteComponent<any, any>).children[0],
    ).toStrictEqual(expect.objectContaining({text: content}));
  });
});
