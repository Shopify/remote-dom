// @vitest-environment jsdom

import {describe, it, expect, vi} from 'vitest';

import {render as preactRender} from 'preact';
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  type PropsWithChildren,
} from 'preact/compat';

// The `SignalRemoteReceiver` library uses `@preact/signals-core`, which does not include
// the auto-updating of Preact components when they use signals. Importing this library
// applies the internal hooks that make this work.
import '@preact/signals';

import {render} from '@quilted/preact-testing';
import {matchers, type CustomMatchers} from '@quilted/preact-testing/matchers';

import {
  RemoteMutationObserver,
  createRemoteElement,
} from '@remote-dom/core/elements';
import {SignalRemoteReceiver} from '@remote-dom/signals';

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
  tooltip?: string;
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

const RemoteButtonElement = createRemoteElement<
  ButtonProps,
  {},
  {},
  {press(): void}
>({
  attributes: ['tooltip'],
  events: ['press'],
  properties: {
    disabled: {type: Boolean},
  },
});

const HostModal = forwardRef(function HostModal(
  {
    children,
    action,
  }: PropsWithChildren<{
    action?: ChildNode;
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
  {
    eventProps: {
      onPress: {event: 'press'},
    },
  },
);

const RemoteModal = createRemoteComponent('remote-modal', RemoteModalElement);

const components = new Map([
  ['remote-button', createRemoteComponentRenderer(HostButton)],
  ['remote-modal', createRemoteComponentRenderer(HostModal)],
  ['remote-fragment', RemoteFragmentRenderer],
]);

describe('preact', () => {
  it('can render simple remote DOM elements', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.textContent = 'Click me!';
    remoteRoot.append(remoteButton);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).not.toContainPreactComponent(HostButton);

    rendered.act(() => {
      mutationObserver.observe(remoteRoot);
    });

    expect(rendered).toContainPreactComponent(HostButton);
  });

  it('can render remote DOM elements with attributes', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.setAttribute('tooltip', 'I do cool things.');
    remoteButton.textContent = 'Click me!';
    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).toContainPreactComponent(HostButton, {
      tooltip: 'I do cool things.',
    });
  });

  it('can render remote DOM elements with simple properties', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.disabled = true;
    remoteButton.textContent = 'Disabled button';
    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).toContainPreactComponent(HostButton, {disabled: true});
  });

  it('can render remote DOM elements with event listeners', async () => {
    const receiver = new SignalRemoteReceiver();
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

    expect(rendered).toContainPreactComponent(HostButton, {disabled: false});

    rendered.find(HostButton)?.trigger('onPress');

    expect(rendered).toContainPreactComponent(HostButton, {disabled: true});
  });

  it('can call methods on a remote DOM element by forwarding calls to the host’s implementation component ref', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteModal = document.createElement('remote-modal');
    const remoteButton = document.createElement('remote-button');
    remoteButton.slot = 'action';
    remoteButton.addEventListener('press', () => {
      remoteModal.close();
    });
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

  it('can render remote DOM elements wrapped as Preact components', async () => {
    const receiver = new SignalRemoteReceiver();
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

    preactRender(<Remote />, remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

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

    expect(rendered).not.toContainPreactComponent('remote-fragment');
    expect(rendered).toContainPreactComponent(RemoteButton, {slot: 'action'});
  });

  it('can change the wrapper element on elements passed as properties to remote Preact components', async () => {
    const RemoteModalWithBoxWrapper = createRemoteComponent(
      'remote-modal',
      RemoteModalElement,
      {
        slotProps: {wrapper: 'remote-box'},
      },
    );

    function Remote() {
      const ref = useRef<InstanceType<typeof RemoteModalElement>>(null);

      return (
        <RemoteModalWithBoxWrapper
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
        </RemoteModalWithBoxWrapper>
      );
    }

    const rendered = render(<Remote />);

    expect(rendered).not.toContainPreactComponent('remote-fragment');
    expect(rendered).toContainPreactComponent('remote-box');
  });
});
