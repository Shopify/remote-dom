/* eslint @shopify/jsx-no-hardcoded-content: off */

import type {ReactNode} from 'react';
import {createRoot as createDOMRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {act as domAct} from 'react-dom/test-utils';
import {
  createRemoteReceiver,
  ACTION_MOUNT,
  ACTION_UPDATE_TEXT,
  ACTION_UPDATE_PROPS,
  KIND_COMPONENT,
  KIND_TEXT,
} from '@remote-ui/core';

import {RemoteRenderer, createController} from '../host';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The remote environment is untrusted: it can send any structured-cloneable
 * value where the protocol expects a string (text) or plain data (props).
 * React refuses to render objects that aren’t tagged with its `$$typeof`
 * symbol, but it throws while doing so, tearing down the host tree; and
 * hosts that run this package on `preact/compat` would render a smuggled
 * virtual node as real markup. The receiver normalizes text to strings and
 * rejects virtual-node shapes in props; the host renderer never spreads
 * framework-reserved prop names onto host components.
 */

const INJECTED_ID = 'injected-by-remote';
const INJECTED_HTML = `<b id="${INJECTED_ID}">injected</b>`;

function smuggledNode() {
  return {
    constructor: undefined,
    type: 'div',
    props: {dangerouslySetInnerHTML: {__html: INJECTED_HTML}},
    key: null,
    ref: null,
    __b: 1,
  };
}

// Mirrors how `@remote-ui/rpc`’s basic encoder rebuilds objects: own keys,
// including a literal `constructor`, survive the trip.
function rpcDecode(value: any): any {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map(rpcDecode);
  return Object.keys(value).reduce(
    (object, key) => ({...object, [key]: rpcDecode(value[key])}),
    {} as any,
  );
}

function HostBanner({
  heading,
  children,
}: {
  heading?: string;
  children?: ReactNode;
}) {
  return (
    <section>
      <h2>{heading}</h2>
      <div>{children}</div>
    </section>
  );
}

function HostSpread(props: Record<string, any>) {
  return <div {...props} />;
}

const roots: Root[] = [];

function mount() {
  const receiver = createRemoteReceiver();
  const controller = createController({Banner: HostBanner, Spread: HostSpread});
  const container = document.createElement('div');
  document.body.append(container);

  let root!: Root;
  domAct(() => {
    root = createDOMRoot(container, {onRecoverableError() {}});
    root.render(<RemoteRenderer receiver={receiver} controller={controller} />);
  });
  roots.push(root);

  return {
    container,
    async receive(...args: any[]) {
      await domAct(async () => {
        (receiver.receive as any)(...rpcDecode(args));
        await receiver.flush();
      });
    },
  };
}

describe('untrusted values from the remote environment', () => {
  afterEach(() => {
    for (const root of roots.splice(0)) domAct(() => root.unmount());
    document.body.innerHTML = '';
  });

  it('renders smuggled text content as plain text and keeps rendering', async () => {
    const {container, receive} = mount();

    await receive(ACTION_MOUNT, [
      {
        id: '1',
        kind: KIND_COMPONENT,
        type: 'Banner',
        props: {heading: 'Hi'},
        children: [{id: '2', kind: KIND_TEXT, text: smuggledNode()}],
      },
    ]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('section > div')!.textContent).toBe(
      '[object Object]',
    );

    await receive(ACTION_UPDATE_TEXT, '2', smuggledNode());
    expect(document.getElementById(INJECTED_ID)).toBeNull();

    await receive(ACTION_UPDATE_TEXT, '2', 7);
    expect(container.querySelector('section > div')!.textContent).toBe('7');
  });

  it('rejects smuggled props and keeps the previous tree', async () => {
    const {container, receive} = mount();

    await expect(
      receive(ACTION_MOUNT, [
        {
          id: '1',
          kind: KIND_COMPONENT,
          type: 'Banner',
          props: {heading: smuggledNode()},
          children: [],
        },
      ]),
    ).rejects.toThrow(/masquerades/);

    await receive(ACTION_MOUNT, [
      {
        id: '1',
        kind: KIND_COMPONENT,
        type: 'Banner',
        props: {heading: 'Hi'},
        children: [],
      },
    ]);

    await expect(
      receive(ACTION_UPDATE_PROPS, '1', {heading: {items: [smuggledNode()]}}),
    ).rejects.toThrow(/masquerades/);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('h2')!.textContent).toBe('Hi');
  });

  it('never spreads dangerouslySetInnerHTML, children, ref, or key from remote props', async () => {
    const {container, receive} = mount();

    await receive(ACTION_MOUNT, [
      {
        id: '1',
        kind: KIND_COMPONENT,
        type: 'Spread',
        props: {
          dangerouslySetInnerHTML: {__html: INJECTED_HTML},
          children: 'override',
          ref: {current: null},
          key: 'other',
          title: 'kept',
        },
        children: [],
      },
    ]);

    expect(document.getElementById(INJECTED_ID)).toBeNull();
    expect(container.querySelector('div[title="kept"]')).not.toBeNull();
    expect(container.textContent).not.toContain('override');
  });
});
