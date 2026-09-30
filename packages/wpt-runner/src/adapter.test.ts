// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';
import {buildWptBundle} from './adapter.ts';

const runtimeShims = `
function __appendWptNode(parent, spec) {
  if (spec.kind === 'text') {
    const text = document.createTextNode(spec.text ?? '');
    parent.appendChild(text);
    return text;
  }

  const element = spec.namespace === 'svg'
    ? document.createElementNS('http://www.w3.org/2000/svg', spec.name)
    : document.createElement(spec.name);
  for (const [name, value] of spec.attributes) element.setAttribute(name, value);
  parent.appendChild(element);
  for (const child of spec.children) __appendWptNode(element, child);
  return element;
}
`;

const sourceHtml = `<!doctype html>
<html>
  <head>
    <script>
      globalThis.__adapterObservations = {
        headBodyId: document.body.id,
        headExistingChild: document.body.firstElementChild.id,
      };
    </script>
    <script src="/resources/testharness.js"></script>
  </head>
  <body id="body-id" class="one two" data-value="data" data-empty data-escaped="quoted &quot; value \\ line&#10;break &lt;/script>">
    <section id="from-source"></section>
    <script>
      Object.assign(globalThis.__adapterObservations, {
        bodyId: document.body.id,
        bodyClass: document.body.className,
        bodyValue: document.body.getAttribute('data-value'),
        bodyEmpty: document.body.getAttribute('data-empty'),
        bodyEscaped: document.body.getAttribute('data-escaped'),
        bodyCount: document.getElementsByTagName('body').length,
        childIds: Array.from(document.body.children, (child) => child.id),
      });
    </script>
  </body>
</html>`;

interface AdapterObservations {
  headBodyId: string;
  headExistingChild: string;
  bodyId: string;
  bodyClass: string;
  bodyValue: string | null;
  bodyEmpty: string | null;
  bodyEscaped: string | null;
  bodyCount: number;
  childIds: string[];
}

const scope = globalThis as typeof globalThis & {
  __adapterObservations?: AdapterObservations;
  __REMOTE_DOM_WPT_HARNESS_READY__?: () => void;
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete scope.__adapterObservations;
  delete scope.__REMOTE_DOM_WPT_HARNESS_READY__;
});

describe('WPT document replay', () => {
  it('applies outer body attributes after head scripts and before body contents', async () => {
    document.documentElement.innerHTML =
      '<head></head><body><p id="existing"></p></body>';
    scope.__REMOTE_DOM_WPT_HARNESS_READY__ = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('/wpt-runner/runtime-shims.js')) {
          return new Response(runtimeShims);
        }
        if (url.includes(encodeURIComponent('fixture.html'))) {
          return new Response(sourceHtml);
        }
        if (url.includes(encodeURIComponent('resources/testharness.js'))) {
          return new Response('');
        }
        return new Response('Not found', {status: 404});
      }),
    );

    const bundle = await buildWptBundle('fixture.html');
    const AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor as new (source: string) => () => Promise<void>;
    await new AsyncFunction(bundle.generatedSource)();

    expect(scope.__adapterObservations).toEqual({
      headBodyId: '',
      headExistingChild: 'existing',
      bodyId: 'body-id',
      bodyClass: 'one two',
      bodyValue: 'data',
      bodyEmpty: '',
      bodyEscaped: 'quoted " value \\ line\nbreak </script>',
      bodyCount: 1,
      childIds: ['existing', 'from-source'],
    });
  });
});
