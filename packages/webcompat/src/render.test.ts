import {
  createRemoteRoot,
  createRemoteComponent,
  RemoteComponent,
} from '@remote-ui/core';

import {createDocument, createRoot} from './render';

const Button = createRemoteComponent('button');

describe('htm', () => {
  it('converts htm into RemoteRoot operations', () => {
    const remoteRoot = createRemoteRoot(() => {});
    const document = createDocument();

    const root = createRoot(remoteRoot, document);

    const onPress = jest.fn();
    const content = 'Buy me!';

    const button = document.createElement('button');
    button.addEventListener('press', onPress);
    button.textContent = content;
    root.append(button);

    expect(remoteRoot.children).toHaveLength(1);
    expect(remoteRoot.children[0]).toStrictEqual(
      expect.objectContaining({
        type: Button,
        props: {onPress},
      }),
    );
    expect(
      (remoteRoot.children[0] as RemoteComponent<any, any>).children[0],
    ).toStrictEqual(expect.objectContaining({text: content}));
  });
});
