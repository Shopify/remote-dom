import '../polyfill/polyfill.ts';

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {RemoteRootElement} from '../elements/RemoteRootElement.ts';
import {RemoteReceiver} from '../receivers/RemoteReceiver.ts';

customElements.define('imperative-method-root', RemoteRootElement);

describe('polyfilled imperative element methods', () => {
  let receiver: RemoteReceiver;
  let root: RemoteRootElement;

  beforeEach(() => {
    receiver = new RemoteReceiver();
    root = document.createElement(
      'imperative-method-root',
    ) as RemoteRootElement;
    root.connect(receiver.connection);
  });

  it('calls focus() and scrollIntoView() on the host implementation', () => {
    const element = document.createElement('div');
    root.appendChild(element);

    const received = receiver.root.children[0]!;
    const implementation = {
      focus: vi.fn(),
      scrollIntoView: vi.fn(),
    };
    receiver.implement(received, implementation);

    const focusOptions = {preventScroll: true};
    const scrollOptions = {behavior: 'smooth'} as const;
    element.focus(focusOptions);
    element.scrollIntoView(scrollOptions);

    expect(implementation.focus).toHaveBeenCalledWith(focusOptions);
    expect(implementation.scrollIntoView).toHaveBeenCalledWith(scrollOptions);
  });
});
