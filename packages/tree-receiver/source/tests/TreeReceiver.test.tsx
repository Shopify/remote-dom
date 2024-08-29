// @vitest-environment node

import {describe, it, expect, vi} from 'vitest';

import {window} from '@remote-dom/core/polyfill';
import {REMOTE_CONNECTION, REMOTE_ID, ROOT_ID} from '@remote-dom/core';
import {TreeReceiver} from '..';
import {BASE_COMPONENTS} from '../components';

const Button = vi.fn();
const components = new Map([['ui-button', Button]]);

describe('TreeReceiver', () => {
  it('can render remote DOM elements and tree updates invalidate using structural sharing', async () => {
    const rerender = vi.fn();

    const createElement = vi.fn(
      (type: string | Function, {children, ...props}: Record<string, any>) => ({
        type,
        props,
        children,
      }),
    );

    const receiver = new TreeReceiver({
      createElement,
      rerender,
      components,
    });

    const {document} = window;

    const root = document.createElement('root');
    Object.assign(root, {
      [REMOTE_CONNECTION]: receiver.connection,
      [REMOTE_ID]: ROOT_ID,
    });

    const button = document.createElement('ui-button');
    button.setAttribute('foo', 'bar');
    button.textContent = 'Click me!';
    root.append(button);

    expect(rerender).toHaveBeenCalledTimes(1);
    expect(rerender).toHaveBeenCalledWith(
      expect.objectContaining({
        type: BASE_COMPONENTS['#fragment'],
        props: expect.objectContaining({key: '~'}),
        children: [
          expect.objectContaining({
            type: Button,
            props: expect.objectContaining({
              foo: 'bar',
            }),
            children: [
              expect.objectContaining({
                type: BASE_COMPONENTS['#text'],
                props: expect.objectContaining({
                  data: 'Click me!',
                }),
              }),
            ],
          }),
        ],
      }),
    );

    // resolved() should be the same as the JSX passed to rerender
    const firstRender = receiver.resolved();
    expect(firstRender).toEqual(rerender.mock.calls[0][0]);

    rerender.mockClear();

    const text = document.createTextNode('Some additional text');
    root.append(text);

    expect(rerender).toHaveBeenCalledTimes(1);

    const secondRender = receiver.resolved();
    expect(secondRender).toEqual(rerender.mock.calls[0][0]);

    expect(secondRender).not.toEqual(firstRender);
    expect(secondRender.children[0]).toEqual(firstRender.children[0]);
    expect(secondRender.children[1]).toMatchObject({
      type: BASE_COMPONENTS['#text'],
      props: expect.objectContaining({
        data: 'Some additional text',
      }),
    });

    rerender.mockClear();

    button.firstChild!.textContent = 'Clicked!';

    expect(rerender).toHaveBeenCalledTimes(1);

    const thirdRender = receiver.resolved();
    expect(thirdRender).not.toEqual(secondRender);
    expect(thirdRender.children[0]).not.toEqual(secondRender.children[0]);
    expect(thirdRender.children[0].children[0]).not.toEqual(
      secondRender.children[0].children[0],
    );
    expect(thirdRender.children[0].children[0]).toMatchObject({
      type: BASE_COMPONENTS['#text'],
      props: expect.objectContaining({
        data: 'Clicked!',
      }),
    });
    // unchanged text node should be referentially-equal:
    expect(thirdRender.children[1]).toEqual(secondRender.children[1]);
  });
});
