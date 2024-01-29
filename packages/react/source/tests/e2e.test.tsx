// @vitest-environment jsdom

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

import {describe, it, expect, vi} from 'vitest';

import {createRoot} from 'react-dom/client';
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  type PropsWithChildren,
} from 'react';

import {render} from '@quilted/react-testing/dom';
import {matchers, type CustomMatchers} from '@quilted/react-testing/matchers';

import {
  RemoteMutationObserver,
  createRemoteElement,
} from '@remote-dom/core/elements';
import {RemoteReceiver} from '@remote-dom/core/receivers';

import {createRemoteComponent} from '../index.ts';
import {RemoteRootRenderer, createRemoteComponentRenderer} from '../host.ts';

expect.extend(matchers);

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface ButtonProps {
  disabled?: boolean;
  onPress?(): void;
}

const HostButton = forwardRef(function HostButton(
  {children, disabled, onPress}: PropsWithChildren<ButtonProps>,
  ref,
) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    focus() {
      buttonRef.current?.focus();
    },
  }));

  return (
    <button ref={buttonRef} disabled={disabled} onClick={() => onPress?.()}>
      {children}
    </button>
  );
});

const RemoteButtonElement = createRemoteElement<ButtonProps>({
  properties: {
    disabled: {type: Boolean},
    onPress: {type: Function},
  },
  methods: ['focus'],
});

customElements.define('remote-button', RemoteButtonElement);

const RemoteButton = createRemoteComponent(
  'remote-button',
  RemoteButtonElement,
);

const components = new Map([
  ['remote-button', createRemoteComponentRenderer(HostButton)],
]);

declare global {
  interface HTMLElementTagNameMap {
    'remote-button': InstanceType<typeof RemoteButtonElement>;
  }
}

describe('react', () => {
  it('can render simple remote DOM elements', async () => {
    const receiver = new RemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.textContent = 'Click me!';
    remoteRoot.append(remoteButton);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).not.toContainReactComponent(HostButton);

    rendered.act(() => {
      mutationObserver.observe(remoteRoot);
    });

    expect(rendered).toContainReactComponent(HostButton);
  });

  it('can render remote DOM elements with simple properties', async () => {
    const receiver = new RemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.setAttribute('disabled', '');
    remoteButton.textContent = 'Disabled button';
    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).toContainReactComponent(HostButton, {disabled: true});
  });

  it('can render remote DOM elements with event listeners', async () => {
    const receiver = new RemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.textContent = 'Click to disable';

    remoteButton.addEventListener(
      'press',
      () => {
        remoteButton.textContent = 'Already disabled';
        remoteButton.setAttribute('disabled', '');
      },
      {once: true},
    );

    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).toContainReactComponent(HostButton, {disabled: false});

    rendered.find(HostButton)?.trigger('onPress');

    expect(rendered).toContainReactComponent(HostButton, {disabled: true});
  });

  it('can call methods on a remote DOM element by forwarding calls to the host’s implementation component ref', async () => {
    const receiver = new RemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.onPress = () => {
      remoteButton.focus();
    };
    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    const focusSpy = vi.spyOn(rendered.find(HostButton)!.domNode!, 'focus');

    rendered.find(HostButton)?.trigger('onPress');

    expect(focusSpy).toHaveBeenCalled();
  });

  it('can render remote DOM elements wrapped as React components', async () => {
    const receiver = new RemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');

    function Remote() {
      const ref = useRef<InstanceType<typeof RemoteButtonElement>>(null);

      return (
        <RemoteButton
          ref={ref}
          onPress={() => {
            ref.current?.focus();
          }}
        >
          Press me!
        </RemoteButton>
      );
    }

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    // Dedicated `act()` so that React actually renders the remote elements,
    // before we start observing the remote DOM node for changes.
    rendered.act(() => {
      createRoot(remoteRoot).render(<Remote />);
    });

    rendered.act(() => {
      mutationObserver.observe(remoteRoot);
    });

    const focusSpy = vi.spyOn(rendered.find(HostButton)!.domNode!, 'focus');

    rendered.find(HostButton)?.trigger('onPress');

    expect(focusSpy).toHaveBeenCalled();
  });
});
