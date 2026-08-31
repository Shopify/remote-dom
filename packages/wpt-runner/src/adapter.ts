const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const WPT_ORIGIN = 'https://wpt.local';
const RUNTIME_SHIMS_PATH = `${import.meta.env.BASE_URL}wpt-runner/runtime-shims.js`;

interface WptUrl {
  path: string;
  pathname: string;
  search: string;
  href: string;
}

interface NodeSpec {
  kind: 'element' | 'text';
  name?: string;
  namespace?: 'html' | 'svg';
  attributes?: Array<[string, string]>;
  children?: NodeSpec[];
  text?: string;
}

interface AppendOperation {
  type: 'append';
  target: 'head' | 'body';
  node: NodeSpec;
}

interface ScriptOperation {
  type: 'script';
  label: string;
  source: string;
  harness: boolean;
}

type Operation = AppendOperation | ScriptOperation;

export interface WptBundle {
  generatedSource: string;
  harnessSource: string;
  sourceHtml: string;
  testSource: string;
  warnings: string[];
}

/**
 * Builds an executable worker bundle from a testharness HTML file. This
 * function parses the WPT test HTML and collects all DOM and script operations
 * in the order they would be executed in a browser. It includes testharness.js
 * and the runner shims while replacing testharnessreport.js with programmatic
 * result capture. The resulting bundle runs against Remote DOM in a worker.
 */
export async function buildWptBundle(testPath: string): Promise<WptBundle> {
  const testUrl = parseWptUrl(testPath);
  if (!testUrl.path.endsWith('.html') && !testUrl.path.endsWith('.htm')) {
    throw new Error(
      `Only testharness.js HTML files are supported: ${testPath}`,
    );
  }

  const [sourceHtml, runtimeShims] = await Promise.all([
    fetchWptFile(testUrl.path),
    fetchRunnerSource(RUNTIME_SHIMS_PATH),
  ]);
  const warnings: string[] = [];
  const operations = await collectOperations(
    sourceHtml,
    testUrl.path,
    warnings,
  );

  if (
    !operations.some(
      (operation) => operation.type === 'script' && operation.harness,
    )
  ) {
    throw new Error(`${testPath} does not load /resources/testharness.js.`);
  }

  const context = JSON.stringify({
    path: testUrl.path,
    pathname: testUrl.pathname,
    search: testUrl.search,
    href: testUrl.href,
  });
  const operationSource = operations.map(emitOperation).join('\n\n');
  const harnessSource = operations
    .filter((operation) => operation.type === 'script' && operation.harness)
    .map(emitOperation)
    .join('\n\n');
  const testSource = operations
    .filter((operation) => !(operation.type === 'script' && operation.harness))
    .map(emitOperation)
    .join('\n\n');

  return {
    generatedSource: [
      `const __WPT_CONTEXT__ = ${context};`,
      runtimeShims,
      operationSource,
      `dispatchEvent(new Event('load'));`,
    ].join('\n\n'),
    harnessSource: [runtimeShims, harnessSource].join('\n\n'),
    sourceHtml,
    testSource,
    warnings,
  };
}

/** Converts a test document into replayable head and body operations. */
async function collectOperations(
  source: string,
  ownerPath: string,
  warnings: string[],
): Promise<Operation[]> {
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const operations: Operation[] = [];
  await collectNodes(
    parsed.head.childNodes,
    'head',
    ownerPath,
    operations,
    warnings,
  );
  await collectNodes(
    parsed.body.childNodes,
    'body',
    ownerPath,
    operations,
    warnings,
  );
  return operations;
}

/** Collects one document region while preserving script execution order. */
async function collectNodes(
  nodes: NodeListOf<ChildNode>,
  target: 'head' | 'body',
  ownerPath: string,
  operations: Operation[],
  warnings: string[],
) {
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text.trim())
        operations.push({type: 'append', target, node: {kind: 'text', text}});
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as Element;
    if (element.localName === 'script') {
      const script = element as HTMLScriptElement;
      const type = script.getAttribute('type');
      if (
        type &&
        type !== 'text/javascript' &&
        type !== 'application/javascript'
      ) {
        throw new Error(
          `Unsupported script type ${JSON.stringify(type)} in ${ownerPath}.`,
        );
      }

      const src = script.getAttribute('src');
      if (!src) {
        operations.push({
          type: 'script',
          label: `${ownerPath} inline script`,
          source: script.textContent ?? '',
          harness: false,
        });
        continue;
      }

      const resolvedPath = resolveWptPath(src, ownerPath);
      if (isHarnessResource(resolvedPath, 'testharnessreport.js')) {
        warnings.push(
          'Skipped testharnessreport.js; results are captured programmatically.',
        );
        continue;
      }
      const harness = isHarnessResource(resolvedPath, 'testharness.js');
      operations.push({
        type: 'script',
        label: resolvedPath,
        source: await fetchWptFile(resolvedPath),
        harness,
      });
      continue;
    }

    operations.push({
      type: 'append',
      target,
      node: serializeNode(element, ownerPath),
    });
  }
}

function serializeNode(node: ChildNode, ownerPath: string): NodeSpec {
  if (node.nodeType === Node.TEXT_NODE) {
    return {kind: 'text', text: node.textContent ?? ''};
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    throw new Error(`Unsupported node type ${node.nodeType} in ${ownerPath}.`);
  }

  const element = node as Element;
  if (element.localName === 'script') {
    throw new Error(`Nested scripts are not supported in ${ownerPath}.`);
  }

  return {
    kind: 'element',
    name: element.localName,
    namespace: element.namespaceURI === SVG_NAMESPACE ? 'svg' : 'html',
    attributes: Array.from(element.attributes, (attribute) => [
      attribute.name,
      attribute.value,
    ]),
    children: Array.from(element.childNodes, (child) =>
      serializeNode(child, ownerPath),
    ),
  };
}

function parseWptUrl(input: string): WptUrl {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Missing WPT path.');
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    throw new Error(`External WPT paths are not supported: ${input}`);
  }

  const suffixIndex = trimmed.search(/[?#]/);
  const rawPath = suffixIndex < 0 ? trimmed : trimmed.slice(0, suffixIndex);
  const decodedPath = decodeURIComponent(rawPath).replace(/^\/+/, '');
  if (
    !decodedPath ||
    decodedPath.includes('\\') ||
    decodedPath.split('/').some((segment) => segment === '..')
  ) {
    throw new Error(`Invalid WPT path: ${input}`);
  }

  const url = new URL(trimmed.replace(/^\/+/, ''), `${WPT_ORIGIN}/`);
  if (url.origin !== WPT_ORIGIN) {
    throw new Error(`External WPT paths are not supported: ${input}`);
  }

  const normalizedPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  return {
    path: normalizedPath,
    pathname: `/${normalizedPath}`,
    search: url.search,
    href: `/${normalizedPath}${url.search}`,
  };
}

function resolveWptPath(source: string, ownerPath: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith('//')) {
    throw new Error(`External WPT resource is not supported: ${source}`);
  }

  const url = new URL(source, new URL(`/${ownerPath}`, WPT_ORIGIN));
  if (url.origin !== WPT_ORIGIN) {
    throw new Error(`External WPT resource is not supported: ${source}`);
  }
  const resolved = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (resolved.includes('\\') || !resolved) {
    throw new Error(`Invalid WPT resource path: ${source}`);
  }
  return resolved;
}

function isHarnessResource(resourcePath: string, filename: string) {
  return (
    resourcePath === `resources/${filename}` ||
    resourcePath.endsWith(`/resources/${filename}`)
  );
}

async function fetchWptFile(filePath: string) {
  const response = await fetch(
    `/__wpt-file?path=${encodeURIComponent(filePath)}`,
  );
  if (!response.ok) throw new Error(await response.text());
  return await response.text();
}

async function fetchRunnerSource(sourcePath: string) {
  const response = await fetch(sourcePath);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch runner source ${sourcePath}: ${await response.text()}`,
    );
  }
  return await response.text();
}

/** Serializes a collected DOM or script operation as executable source. */
function emitOperation(operation: Operation) {
  if (operation.type === 'append') {
    return `__appendWptNode(document.${operation.target}, ${JSON.stringify(operation.node)});`;
  }

  if (operation.harness) {
    // The real harness selects its browser-window environment whenever it sees
    // `document`, which requires unrelated DOM APIs such as getElementsByTagName.
    // It also makes dedicated workers wait for an explicit done() call. Expose
    // neither shape during harness initialization so it selects its shell
    // environment, then restore the untouched polyfill globals for the test.
    return [
      `// ${operation.label}`,
      `const __wptEnvironmentNames = ['document', 'DedicatedWorkerGlobalScope', 'WorkerGlobalScope'];`,
      `const __wptEnvironmentDescriptors = new Map(__wptEnvironmentNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));`,
      `delete globalThis.document;`,
      `for (const name of __wptEnvironmentNames.slice(1)) Object.defineProperty(globalThis, name, {configurable: true, value: function WptNonWorkerGlobal() {}});`,
      operation.source,
      `for (const [name, descriptor] of __wptEnvironmentDescriptors) {`,
      `  if (descriptor) Object.defineProperty(globalThis, name, descriptor);`,
      `  else delete globalThis[name];`,
      `}`,
      `globalThis.__REMOTE_DOM_WPT_HARNESS_READY__();`,
    ].join('\n');
  }

  return [`// ${operation.label}`, operation.source].join('\n');
}
