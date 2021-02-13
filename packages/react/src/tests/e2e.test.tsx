import {useEffect, useContext, createContext} from 'react';
import {render as domRender} from 'react-dom';
import {act as domAct} from 'react-dom/test-utils';

import {createRemoteRoot, RemoteReceiver} from '@remote-ui/core';

import {RemoteRenderer, createController} from '../host';
import {
  render,
  createRemoteReactComponent,
  ReactPropsFromRemoteComponentType,
} from '..';

const RemoteHelloWorld = createRemoteReactComponent<
  'HelloWorld',
  {name: string}
>('HelloWorld');

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

    const receiver = new RemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteHelloWorld],
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

  it('handles function props on remote components', () => {
    const person = {name: 'Luna'};
    const spy = jest.fn();

    const receiver = new RemoteReceiver();
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
