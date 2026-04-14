/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {render} from 'preact';
import {useEffect, useRef} from 'preact/hooks';
import {createRemoteComponent} from '@remote-dom/preact';

import type {RenderAPI} from '../../types.ts';
import {
  Text as TextElement,
  Stack as StackElement,
  Banner as BannerElement,
} from '../elements.ts';

const Text = createRemoteComponent('ui-text', TextElement);
const Stack = createRemoteComponent('ui-stack', StackElement);
const Banner = createRemoteComponent('s-banner', BannerElement);

export function renderUsingPreactIntercept(root: Element, api: RenderAPI) {
  render(<App api={api} />, root);
}

function App({api}: {api: RenderAPI}) {
  const bannerRef = useRef<InstanceType<typeof BannerElement>>(null);
  const interceptHandlerRef = useRef<() => Promise<string>>();

  interceptHandlerRef.current ??= async () => {
    if (bannerRef.current != null) {
      bannerRef.current.textContent = 'DONE';
    }

    return {a: 1};
  };

  useEffect(() => {
    void api.intercept(interceptHandlerRef.current!);
  }, [api]);

  return (
    <Stack spacing>
      <Text>
        Rendering example: <Text emphasis>{api.example}</Text>
      </Text>
      <Text>
        Rendering in sandbox: <Text emphasis>{api.sandbox}</Text>
      </Text>
      <Text>
        The sandbox registered an intercepted callback. Use the host button to
        invoke it.
      </Text>
      <Banner ref={bannerRef}>START</Banner>
    </Stack>
  );
}
