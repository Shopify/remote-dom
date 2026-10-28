import {h, render} from 'preact';
import {act} from 'preact/test-utils';
import {
  createRemoteReceiver,
  ACTION_MOUNT,
  ACTION_UPDATE_PROPS,
  KIND_COMPONENT,
  KIND_TEXT,
} from '@remote-ui/core';

import {RemoteRenderer, createController} from '../host';

jest.mock('react', () => jest.requireActual('preact/compat'));
jest.mock('react/jsx-runtime', () => jest.requireActual('preact/jsx-runtime'));
jest.mock('react/jsx-dev-runtime', () =>
  jest.requireActual('preact/jsx-runtime'),
);

const receivedProps = jest.fn();

function HostSpread(props: Record<string, any>) {
  receivedProps(props);
  return h('div', props);
}

describe('untrusted props on preact/compat', () => {
  beforeEach(() => receivedProps.mockClear());

  it.each([
    ['innerHTML', 'mount'],
    ['innerHTML', 'update'],
    ['outerHTML', 'mount'],
    ['outerHTML', 'update'],
  ])('never spreads %s from remote props on %s', async (name, action) => {
    const receiver = createRemoteReceiver();
    const controller = createController({Spread: HostSpread as any});
    const container = document.createElement('div');
    const props = {
      [name]: '<b id="injected-by-remote">injected</b>',
      title: 'kept',
    };
    try {
      await act(async () => {
        render(h(RemoteRenderer as any, {receiver, controller}), container);
        receiver.receive(ACTION_MOUNT, [
          {
            id: '1',
            kind: KIND_COMPONENT,
            type: 'Spread',
            props: action === 'mount' ? props : {title: 'initial'},
            children: [{id: '2', kind: KIND_TEXT, text: 'Safe child'}],
          },
        ]);
        await receiver.flush();
      });
      if (action === 'update') {
        await act(async () => {
          receiver.receive(ACTION_UPDATE_PROPS, '1', props);
          await receiver.flush();
        });
      }

      const forwarded = receivedProps.mock.calls.slice(-1)[0][0];
      expect(Object.prototype.hasOwnProperty.call(forwarded, name)).toBe(false);
      expect(container.querySelector('#injected-by-remote')).toBeNull();
      expect(container.querySelector('div[title="kept"]')?.textContent).toBe(
        'Safe child',
      );
    } finally {
      act(() => render(null, container));
    }
  });
});
