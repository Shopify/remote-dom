import {useEffect, useContext, createContext} from 'react';
import {render as domRender} from 'react-dom';
import {act as domAct} from 'react-dom/test-utils';

import {createRemoteRoot, createRemoteReceiver} from '@remote-ui/core';
import type {RemoteFragment} from '@remote-ui/core';

import {RemoteRenderer, createController} from '../host';
import {
  render,
  createRemoteReactComponent,
  ReactPropsFromRemoteComponentType,
} from '..';

const RemoteHelloWorld = createRemoteReactComponent<
  'HelloWorld',
  {name: string | RemoteFragment}
>('HelloWorld', {fragmentProps: ['name']});

const RemoteWithPerson = createRemoteReactComponent<
  'WithPerson',
  {run(person: {name: string}): void | Promise<void>}
>('WithPerson');

const PersonContext = createContext({name: 'Mollie'});

function HostHelloWorld({
  name,
}: ReactPropsFromRemoteComponentType<typeof RemoteHelloWorld>) {
  return <div>Hello, {name}</div>;
}

function HostWithPerson({
  run,
}: ReactPropsFromRemoteComponentType<typeof RemoteWithPerson>) {
  const person = useContext(PersonContext);

  useEffect(() => {
    run(person);
  }, [run]);

  return null;
}

describe('@remote-ui/react', () => {
  let appElement!: HTMLElement;

  beforeEach(() => {
    appElement = document.createElement('div');
    document.body.appendChild(appElement);
    jest.useFakeTimers();
  });

  afterEach(() => {
    appElement.remove();
    jest.useRealTimers();
  });

  it('renders a simple component across a remote bridge', () => {
    const name = 'Winston';

    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteHelloWorld.displayName!],
    });

    function RemoteApp() {
      return <RemoteHelloWorld name={name} />;
    }

    const controller = createController({HelloWorld: HostHelloWorld});

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRender(<HostApp />, appElement);
      render(<RemoteApp />, remoteRoot, () => {
        remoteRoot.mount();
      });
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toBe(`<div>Hello, ${name}</div>`);
  });

  it('renders component with fragment as prop across a remote bridge', () => {
    const name = 'Winston';

    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteHelloWorld.displayName!],
    });

    const NameContext = createContext('');

    function ActualApp() {
      const name = useContext(NameContext);
      return <RemoteHelloWorld name={<RemoteHelloWorld name={name} />} />;
    }

    function RemoteApp() {
      return (
        <NameContext.Provider value={name}>
          <ActualApp />
        </NameContext.Provider>
      );
    }

    const controller = createController({HelloWorld: HostHelloWorld});

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRender(<HostApp />, appElement);
      render(<RemoteApp />, remoteRoot, () => {
        remoteRoot.mount();
      });
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toBe(
      `<div>Hello, <div>Hello, ${name}</div></div>`,
    );
  });

  it('handles function props on remote components', () => {
    const person = {name: 'Luna'};
    const spy = jest.fn();

    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteWithPerson],
    });

    function RemoteApp() {
      return <RemoteWithPerson run={spy} />;
    }

    const controller = createController({
      WithPerson: HostWithPerson,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRender(
        <PersonContext.Provider value={person}>
          <HostApp />
        </PersonContext.Provider>,
        appElement,
      );
      render(<RemoteApp />, remoteRoot, () => {
        remoteRoot.mount();
      });
      jest.runAllTimers();
    });

    expect(spy).toHaveBeenCalledWith(person);
  });
});
