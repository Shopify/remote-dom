// @vitest-environment jsdom

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

import {describe, it, expect, vi} from 'vitest';

import {createRoot} from 'react-dom/client';
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
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
import {
  RemoteRootRenderer,
  RemoteFragmentRenderer,
  createRemoteComponentRenderer,
} from '../host.ts';

expect.extend(matchers);

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface ButtonProps {
  disabled?: boolean;
  onPress?(): void;
}

const HostButton = forwardRef(function HostButton({
  children,
  disabled,
  onPress,
}: PropsWithChildren<ButtonProps>) {
  return (
    <button disabled={disabled} onClick={() => onPress?.()}>
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

const HostModal = forwardRef(function HostModal(
  {
    children,
    action,
  }: PropsWithChildren<{
    action?: ReactNode;
  }>,
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open() {
      dialogRef.current?.showModal();
    },
    close() {
      dialogRef.current?.close();
    },
  }));

  return (
    <dialog ref={dialogRef}>
      {children}
      <div>{action}</div>
    </dialog>
  );
});

const RemoteModalElement = createRemoteElement<
  {},
  {
    open(): void;
    close(): void;
  },
  {
    action?: true;
  }
>({
  methods: ['open', 'close'],
  slots: ['action'],
});

customElements.define('remote-button', RemoteButtonElement);
customElements.define('remote-modal', RemoteModalElement);

declare global {
  interface HTMLElementTagNameMap {
    'remote-button': InstanceType<typeof RemoteButtonElement>;
    'remote-modal': InstanceType<typeof RemoteModalElement>;
  }
}

const RemoteButton = createRemoteComponent(
  'remote-button',
  RemoteButtonElement,
);

const RemoteModal = createRemoteComponent('remote-modal', RemoteModalElement);

const components = new Map([
  ['remote-button', createRemoteComponentRenderer(HostButton)],
  ['remote-modal', createRemoteComponentRenderer(HostModal)],
  ['remote-fragment', RemoteFragmentRenderer],
]);

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
    const remoteModal = document.createElement('remote-modal');
    const remoteButton = document.createElement('remote-button');
    remoteButton.slot = 'action';
    remoteButton.onPress = () => {
      remoteModal.close();
    };
    remoteModal.append(remoteButton);
    remoteRoot.append(remoteModal);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    const closeSpy = vi.fn();
    Object.assign(rendered.find(HostModal)!.domNode!, {close: closeSpy});

    rendered.find(HostButton)?.trigger('onPress');

    expect(closeSpy).toHaveBeenCalled();
  });

  it('can render remote DOM elements wrapped as React components', async () => {
    const receiver = new RemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');

    function Remote() {
      const ref = useRef<InstanceType<typeof RemoteModalElement>>(null);

      return (
        <RemoteModal
          ref={ref}
          action={
            <RemoteButton
              onPress={() => {
                ref.current?.close();
              }}
            >
              Close
            </RemoteButton>
          }
        >
          Modal body
        </RemoteModal>
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

    const closeSpy = vi.fn();
    Object.assign(rendered.find(HostModal)!.domNode!, {close: closeSpy});

    rendered.find(HostButton)?.trigger('onPress');

    expect(closeSpy).toHaveBeenCalled();
  });

  it('can remove the wrapper element on elements passed as properties to remote Preact components', async () => {
    const RemoteModalWithoutWrappers = createRemoteComponent(
      'remote-modal',
      RemoteModalElement,
      {
        slotProps: {wrapper: false},
      },
    );

    function Remote() {
      const ref = useRef<InstanceType<typeof RemoteModalElement>>(null);

      return (
        <RemoteModalWithoutWrappers
          ref={ref}
          action={
            <RemoteButton
              onPress={() => {
                ref.current?.close();
              }}
            >
              Close
            </RemoteButton>
          }
        >
          Modal body
        </RemoteModalWithoutWrappers>
      );
    }

    const rendered = render(<Remote />);

    expect(rendered).not.toContainReactComponent('remote-fragment');
    expect(rendered).toContainReactComponent(RemoteButton, {slot: 'action'});
  });

  it('can change the wrapper element on elements passed as properties to remote Preact components', async () => {
    const RemoteModalWithoutWrappers = createRemoteComponent(
      'remote-modal',
      RemoteModalElement,
      {
        slotProps: {wrapper: 'remote-box'},
      },
    );

    function Remote() {
      const ref = useRef<InstanceType<typeof RemoteModalElement>>(null);

      return (
        <RemoteModalWithoutWrappers
          ref={ref}
          action={
            <RemoteButton
              onPress={() => {
                ref.current?.close();
              }}
            >
              Close
            </RemoteButton>
          }
        >
          Modal body
        </RemoteModalWithoutWrappers>
      );
    }

    const rendered = render(<Remote />);

    expect(rendered).not.toContainReactComponent('remote-fragment');
    expect(rendered).toContainReactComponent('remote-box');
  });
});
