/* eslint @shopify/jsx-no-hardcoded-content: off */

import {useEffect, useContext, useState, createContext} from 'react';
import {createRoot as createDOMRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {act as domAct, Simulate} from 'react-dom/test-utils';
import {
  KIND_ROOT,
  createRemoteRoot,
  createRemoteReceiver,
} from '@remote-ui/core';
import type {RemoteFragment, PropsForRemoteComponent} from '@remote-ui/core';

import {RemoteRenderer, createController} from '../host';
import type {ControllerOptions} from '../host';
import {
  createRoot,
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

const RemoteText = createRemoteReactComponent<'Text'>('Text');
const RemoteImage = createRemoteReactComponent<'Image', {src: string}>('Image');
const RemoteButton = createRemoteReactComponent<'Button', {onPress(): void}>(
  'Button',
);

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

function HostText({
  children,
}: ReactPropsFromRemoteComponentType<typeof RemoteText>) {
  return <>{children}</>;
}

function HostButton({
  onPress,
  children,
}: ReactPropsFromRemoteComponentType<typeof RemoteButton>) {
  return (
    <button type="button" onClick={onPress}>
      {children}
    </button>
  );
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
    document.body.append(appElement);
    domAct(() => {
      domRoot = createDOMRoot(appElement);
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });
    expect(appElement.innerHTML).toBe('hello');
  });

  it('can re-order remote components at the root of the tree', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteButton, RemoteText],
    });

    const letterValues = [
      ['a', 'b', 'c'],
      // move a child to the end of the list
      ['b', 'c', 'a'],
      // re-order children in places not at the end of the list
      ['c', 'b', 'a'],
    ];

    function RemoteApp() {
      const [letters, setLetters] = useState(letterValues[0]);

      return (
        <>
          <RemoteButton
            onPress={() =>
              setLetters(
                (currentLetters) =>
                  letterValues[letterValues.indexOf(currentLetters) + 1],
              )
            }
          >
            Reorder
          </RemoteButton>
          {letters.map((letter) => (
            <RemoteText key={letter}>{letter}</RemoteText>
          ))}
        </>
      );
    }

    const controller = createController({
      Text: HostText,
      Button: HostButton,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[0].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[1].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[2].join(''));
  });

  it('can re-order remote components nested in the tree', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteButton, RemoteText, RemoteWithFragment.displayName!],
    });

    const letterValues = [
      ['a', 'b', 'c'],
      // move a child to the end of the list
      ['b', 'c', 'a'],
      // re-order children in places not at the end of the list
      ['c', 'b', 'a'],
    ];

    function RemoteApp() {
      const [letters, setLetters] = useState(letterValues[0]);

      return (
        <>
          <RemoteButton
            onPress={() =>
              setLetters(
                (currentLetters) =>
                  letterValues[letterValues.indexOf(currentLetters) + 1],
              )
            }
          >
            Reorder
          </RemoteButton>
          {letters.map((letter) => (
            <RemoteText key={letter}>{letter}</RemoteText>
          ))}
        </>
      );
    }

    const controller = createController({
      Text: HostText,
      Button: HostButton,
      WithFragment: HostWithFragment,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[0].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[1].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[2].join(''));
  });

  it('can insert a component at the beginning of the tree', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteButton, RemoteText, RemoteWithFragment.displayName!],
    });

    const letterValues = [
      ['b', 'c'],
      // add a child at the beginning of the list
      ['a', 'b', 'c'],
    ];

    function RemoteApp() {
      const [letters, setLetters] = useState(letterValues[0]);

      return (
        <>
          <RemoteButton
            onPress={() =>
              setLetters(
                (currentLetters) =>
                  letterValues[letterValues.indexOf(currentLetters) + 1],
              )
            }
          >
            Reorder
          </RemoteButton>
          {letters.map((letter) => (
            <RemoteText key={letter}>{letter}</RemoteText>
          ))}
        </>
      );
    }

    const controller = createController({
      Text: HostText,
      Button: HostButton,
      WithFragment: HostWithFragment,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[0].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[1].join(''));
  });

  it('can insert a component in the middle of the tree', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteButton, RemoteText, RemoteWithFragment.displayName!],
    });

    const letterValues = [
      ['a', 'c'],
      // add a child in the middle the list
      ['a', 'b', 'c'],
    ];

    function RemoteApp() {
      const [letters, setLetters] = useState(letterValues[0]);

      return (
        <>
          <RemoteButton
            onPress={() =>
              setLetters(
                (currentLetters) =>
                  letterValues[letterValues.indexOf(currentLetters) + 1],
              )
            }
          >
            Reorder
          </RemoteButton>
          {letters.map((letter) => (
            <RemoteText key={letter}>{letter}</RemoteText>
          ))}
        </>
      );
    }

    const controller = createController({
      Text: HostText,
      Button: HostButton,
      WithFragment: HostWithFragment,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[0].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[1].join(''));
  });

  it('can append a component at the end of the tree', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteButton, RemoteText, RemoteWithFragment.displayName!],
    });

    const letterValues = [
      ['a', 'b'],
      // add a child to the end of the list
      ['a', 'b', 'c'],
    ];

    function RemoteApp() {
      const [letters, setLetters] = useState(letterValues[0]);

      return (
        <>
          <RemoteButton
            onPress={() =>
              setLetters(
                (currentLetters) =>
                  letterValues[letterValues.indexOf(currentLetters) + 1],
              )
            }
          >
            Reorder
          </RemoteButton>
          {letters.map((letter) => (
            <RemoteText key={letter}>{letter}</RemoteText>
          ))}
        </>
      );
    }

    const controller = createController({
      Text: HostText,
      Button: HostButton,
      WithFragment: HostWithFragment,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[0].join(''));

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain(letterValues[1].join(''));
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
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
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
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

  it('can update and render nested fragment components', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteWithFragment.displayName!, RemoteImage, RemoteButton],
    });

    function RemoteApp() {
      const [show, setShow] = useState(false);
      return (
        <>
          <RemoteWithFragment
            title={
              show && (
                <RemoteWithFragment
                  title={<RemoteImage src="https://shopify.com" />}
                />
              )
            }
          />
          <RemoteButton
            onPress={() => {
              setShow(true);
            }}
          >
            Show
          </RemoteButton>
        </>
      );
    }

    const controller = createController({
      WithFragment: HostWithFragment,
      Image: HostImage,
      Button: HostButton,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });
    expect(appElement.innerHTML).toBe(`<button type="button">Show</button>`);

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
    });

    domAct(() => {
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toBe(
      `<img src="https://shopify.com"><button type="button">Show</button>`,
    );
  });

  it('can reorder and render nested fragment components', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteWithFragment.displayName!, RemoteText, RemoteButton],
    });

    function RemoteApp() {
      const [letters, setLetters] = useState(['a', 'b', 'c']);

      return (
        <>
          <RemoteWithFragment
            title={
              <>
                {letters.map((letter) => (
                  <RemoteText key={letter}>{letter}</RemoteText>
                ))}
              </>
            }
          />
          <RemoteButton onPress={() => setLetters(['b', 'a', 'c'])}>
            Reorder
          </RemoteButton>
        </>
      );
    }

    const controller = createController({
      Text: HostText,
      Button: HostButton,
      WithFragment: HostWithFragment,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
    });

    domAct(() => {
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).toContain('bac');
  });

  it('handles removal & cleanup of unmounted components', () => {
    const receiver = createRemoteReceiver();
    const remoteRoot = createRemoteRoot(receiver.receive, {
      components: [RemoteImage, RemoteButton],
    });

    function RemoteApp() {
      const [showImage, setShowImage] = useState(true);

      return (
        <>
          {showImage && <RemoteImage src="image.png" />}
          <RemoteButton onPress={() => setShowImage((prev) => !prev)}>
            Toggle image
          </RemoteButton>
        </>
      );
    }

    const controller = createController({
      Button: HostButton,
      Image: HostImage,
    });

    function HostApp() {
      return <RemoteRenderer controller={controller} receiver={receiver} />;
    }

    domAct(() => {
      domRoot.render(<HostApp />);
      createRoot(remoteRoot).render(<RemoteApp />);
      remoteRoot.mount();
      jest.runAllTimers();
    });

    domAct(() => {
      Simulate.click(appElement.querySelector('button')!);
    });

    domAct(() => {
      jest.runAllTimers();
    });

    expect(appElement.innerHTML).not.toContain('data-test-id="image"');
  });
});
