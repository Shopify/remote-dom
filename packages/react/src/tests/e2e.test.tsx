import {useEffect, useContext, createContext} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {act as domAct} from 'react-dom/test-utils';
import {
  KIND_ROOT,
  createRemoteRoot,
  createRemoteReceiver,
} from '@remote-ui/core';
import type {RemoteFragment, PropsForRemoteComponent} from '@remote-ui/core';

import {RemoteRenderer, createController} from '../host';
import type {ControllerOptions} from '../host';
import {
  render,
  createRemoteReactComponent,
  ReactPropsFromRemoteComponentType,
} from '..';

// Tell react to enable `act()` behaviour. See:
// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#configuring-your-testing-environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
  {title?: string | RemoteFragment}
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
  let domRoot: Root;

  beforeEach(() => {
    appElement = document.createElement('div');
    document.body.appendChild(appElement);
    domAct(() => {
      domRoot = createRoot(appElement);
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    domAct(() => {
      domRoot.unmount();
    });
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
      domRoot.render(<HostApp />);
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
      domRoot.render(<HostApp />);
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
      domRoot.render(
        <PersonContext.Provider value={person}>
          <HostApp />
        </PersonContext.Provider>,
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
      domRoot.render(<HostApp />);
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
      domRoot.render(<HostApp />);
      render(<RemoteApp />, remoteRoot, () => {
        remoteRoot.mount();
      });
      jest.runAllTimers();
    });
    expect(appElement.innerHTML).toBe('hello');
  });

  it('allows customizing the rendering of individual remote components', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteImage],
    });

    function RemoteApp() {
      return (
        <>
          <RemoteImage src="/image.jpg" />
          <RemoteImage src="/malicious.jpg" />
        </>
      );
    }

    // Our custom `renderComponent` will filter out images with a malicious source prop.
    const renderComponent = jest.fn((({component}, {renderDefault}) => {
      if (component.type !== RemoteImage) return renderDefault();

      if (
        (
          component.props as PropsForRemoteComponent<typeof RemoteImage>
        ).src.includes('malicious.jpg')
      )
        return null;

      return renderDefault();
    }) as ControllerOptions['renderComponent']);

    const controller = createController(
      {
        Image: HostImage,
      },
      {
        renderComponent,
      },
    );

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      render(<RemoteApp />, remoteRoot, () => {
        remoteRoot.mount();
      });
      jest.runAllTimers();
    });

    expect(renderComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        component: expect.objectContaining({
          type: RemoteImage,
          props: {src: '/image.jpg'},
        }),
      }),
      expect.anything(),
    );
    expect(renderComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        component: expect.objectContaining({
          type: RemoteImage,
          props: {src: '/malicious.jpg'},
        }),
      }),
      expect.anything(),
    );
    expect(appElement.innerHTML).toBe('<img src="/image.jpg">');
  });

  it('provides the parent container to the function for customizing the rendering of individual remote components', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteImage, RemoteWithFragment.displayName!],
    });

    function RemoteApp() {
      return (
        <>
          <RemoteImage src="/image1.jpg" />
          <RemoteWithFragment>
            <RemoteImage src="/image2.jpg" />
          </RemoteWithFragment>
        </>
      );
    }

    // Our custom `renderComponent` will only allow images to be rendered if they are nested.
    const renderComponent = jest.fn((({component, parent}, {renderDefault}) => {
      if (component.type !== RemoteImage) return renderDefault();
      if (parent.kind === KIND_ROOT) return null;
      return renderDefault();
    }) as ControllerOptions['renderComponent']);

    const controller = createController(
      {
        Image: HostImage,
        WithFragment: HostWithFragment,
      },
      {
        renderComponent,
      },
    );

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      render(<RemoteApp />, remoteRoot, () => {
        remoteRoot.mount();
      });
      jest.runAllTimers();
    });

    expect(renderComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: expect.objectContaining({
          kind: KIND_ROOT,
        }),
        component: expect.objectContaining({
          type: RemoteImage,
          props: {src: '/image1.jpg'},
        }),
      }),
      expect.anything(),
    );
    expect(renderComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: expect.objectContaining({
          type: RemoteWithFragment.displayName,
        }),
        component: expect.objectContaining({
          type: RemoteImage,
          props: {src: '/image2.jpg'},
        }),
      }),
      expect.anything(),
    );
    expect(appElement.innerHTML).toBe('<img src="/image2.jpg">');
  });
});
