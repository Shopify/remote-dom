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

const RemoteImage = createRemoteReactComponent<'Image', {src: string}>('Image');

const RemoteWithFragment = createRemoteReactComponent<
  'WithFragment',
  {title: string | RemoteFragment}
>('WithFragment', {fragmentProps: ['title']});

const PersonContext = createContext({name: 'Mollie'});

function HostHelloWorld({
  name,
}: ReactPropsFromRemoteComponentType<typeof RemoteHelloWorld>) {
  return <>Hello, {name}</>;
}

function HostWithPerson({
  run,
}: ReactPropsFromRemoteComponentType<typeof RemoteWithPerson>) {
  const person = useContext(PersonContext);

  useEffect(() => {
    run(person);
  }, [run, person]);

  return null;
}

function HostImage(
  props: ReactPropsFromRemoteComponentType<typeof RemoteImage>,
) {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img {...props} />;
}

function HostWithFragment({
  title,
  children,
}: ReactPropsFromRemoteComponentType<typeof RemoteWithFragment>) {
  return (
    <>
      {title}
      {children}
    </>
  );
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

    expect(appElement.innerHTML).toBe(`Hello, ${name}`);
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

    expect(appElement.innerHTML).toBe(`Hello, Hello, ${name}`);
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

  it('does not render children when none was provided', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteImage],
    });

    function RemoteApp() {
      return <RemoteImage src="https://shopify.com" />;
    }

    const controller = createController({
      Image: HostImage,
    });

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
    expect(appElement.innerHTML).toBe(`<img src="https://shopify.com">`);
  });

  it('renders a single child when there are fragment props', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteWithFragment.displayName!],
    });

    function RemoteApp() {
      return <RemoteWithFragment title="hello">{null}</RemoteWithFragment>;
    }

    const controller = createController({
      WithFragment: HostWithFragment,
    });

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
    expect(appElement.innerHTML).toBe('hello');
  });
});
