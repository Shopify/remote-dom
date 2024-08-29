/** @jsxRuntime automatic */
/** @jsxImportSource react */

import {useState, useRef} from 'react';
import {createRoot} from 'react-dom/client';

import type {RenderAPI} from '../../types.ts';
import {RemoteElement} from '@remote-dom/core/elements';

type IgnoreKeys =
  | symbol
  | number
  | 'children'
  | keyof HTMLElement
  | keyof RemoteElement;

type PropsForElement<T extends keyof HTMLElementTagNameMap> =
  React.PropsWithChildren<{
    [K in keyof HTMLElementTagNameMap[T] as `${K extends IgnoreKeys ? '' : K}`]?: HTMLElementTagNameMap[T][K];
  }> & {
    ref?: React.Ref<HTMLElementTagNameMap[T]>;
  };

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ui-stack': PropsForElement<'ui-stack'>;
      'ui-text': PropsForElement<'ui-text'>;
      'ui-button': PropsForElement<'ui-button'>;
      'ui-modal': PropsForElement<'ui-modal'>;
    }
  }
}

export function renderUsingReactDOM(root: Element, api: RenderAPI) {
  createRoot(root).render(<App api={api} />);
}

function App({api}: {api: RenderAPI}) {
  return (
    <ui-stack spacing>
      <ui-text>
        Rendering example: <ui-text emphasis>{api.example}</ui-text>
      </ui-text>
      <ui-text>
        Rendering in sandbox: <ui-text emphasis>{api.sandbox}</ui-text>
      </ui-text>
      {/* <ui-button modal={<CountModal alert={api.alert} />}>Open modal</ui-button> */}
      <ui-button>
        Open modal
        <CountModal slot="modal" alert={api.alert} />
      </ui-button>
    </ui-stack>
  );
}

function CountModal({alert}: Pick<RenderAPI, 'alert'>) {
  const [count, setCount] = useState(0);
  const modalRef = useRef<HTMLElementTagNameMap['ui-modal']>(null);

  return (
    <ui-modal
      ref={modalRef}
      onClose={() => {
        if (count > 0) {
          alert(`You clicked ${count} times!`);
        }

        setCount(0);
      }}
    >
      <ui-button slot="primaryAction" onPress={() => modalRef.current?.close()}>
        Close
      </ui-button>
      <ui-stack spacing>
        <ui-text>
          Click count: <ui-text emphasis>{count}</ui-text>
        </ui-text>
        <ui-button
          onPress={() => {
            setCount((count) => count + 1);
          }}
        >
          Click me!
        </ui-button>
      </ui-stack>
    </ui-modal>
  );
}
