import React, {useEffect, useContext, createContext} from 'react';
import {render as domRender} from 'react-dom';
import {act as domAct} from 'react-dom/test-utils';

import {createRemoteRoot, Receiver} from '@remote-ui/core';

import {Renderer, Controller} from '../host';
import {
  render,
  createRemoteComponent,
  ReactPropsFromRemoteComponentType,
} from '..';

declare module '@remote-ui/types' {
  export interface RemoteComponentMap {
    HelloWorld: [{name: string}];
    WithPerson: [{run(person: {name: string}): void | Promise<void>}];
  }
}

const RemoteHelloWorld = createRemoteComponent<'HelloWorld', {name: string}>(
  'HelloWorld',
);

const RemoteWithPerson = createRemoteComponent<
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
  });

  afterEach(() => {
    appElement.remove();
  });

  it('renders a simple component across a remote bridge', () => {
    const name = 'Winston';

    const receiver = new Receiver();
    const controller = new Controller({
      HelloWorld: HostHelloWorld,
    });

    const remoteRoot = createRemoteRoot(receiver.dispatch, {
      components: [RemoteHelloWorld],
    });

    function RemoteApp() {
      return <RemoteHelloWorld name={name} />;
    }

    function HostApp() {
      return <Renderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRender(<HostApp />, appElement);
      render(<RemoteApp />, remoteRoot);
    });

    expect(appElement.innerHTML).toBe(`<div>Hello, ${name}</div>`);
  });

  it('handles function props on remote components', () => {
    const person = {name: 'Luna'};
    const spy = jest.fn();

    const receiver = new Receiver();
    const controller = new Controller({
      WithPerson: HostWithPerson,
    });

    const remoteRoot = createRemoteRoot(receiver.dispatch, {
      components: [RemoteWithPerson],
    });

    function RemoteApp() {
      return <RemoteWithPerson run={spy} />;
    }

    function HostApp() {
      return <Renderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRender(
        <PersonContext.Provider value={person}>
          <HostApp />
        </PersonContext.Provider>,
        appElement,
      );
      render(<RemoteApp />, remoteRoot);
    });

    expect(spy).toHaveBeenCalledWith(person);
  });
});
