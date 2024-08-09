import htm from 'htm/mini';

const htmlInner = htm.bind(h);

export function html<
  Result extends null | Node | Node[] = null | Node | Node[],
>(strings: TemplateStringsArray, ...values: any[]) {
  return normalizeComponentReturn<Result>(htmlInner(strings, ...values));
}

export type PropertiesWithChildren<
  Properties extends Record<string, any> = {},
  Children extends Node = Node,
> = Properties & {children: Children[]};

export interface Component<
  Properties extends Record<string, any> = {},
  Children extends Node = Node,
> {
  (
    properties: PropertiesWithChildren<Properties, Children>,
  ): Node | string | (Node | string)[];
}

// Inspired by https://github.com/developit/vhtml
export function h<
  Properties extends Record<string, any> = Record<string, never>,
>(
  name: string | Component<Properties, any>,
  properties?: Properties,
  ...children: (Node | string | (Node | string)[])[]
) {
  let childNodes = normalizeComponentReturn<Node[] | null>(children);

  // Pseudo-components, where they get DOM nodes as children.
  if (typeof name === 'function') {
    const resolvedProperties: any = properties ?? {};
    resolvedProperties.children = childNodes;
    return normalizeComponentReturn(name(resolvedProperties));
  }

  const element = document.createElement(name);

  if (properties) {
    for (const property in properties) {
      const value = properties[property] as any;

      if (value instanceof Node) {
        childNodes ??= [];
        const fragment = document.createElement('remote-fragment');
        fragment.slot = property;
        fragment.append(value);
        childNodes.push(fragment);
      } else if (property in element) {
        (element as any)[property] = value;
      } else if (property[0] === 'o' && property[1] === 'n') {
        const eventName = `${property[2]!.toLowerCase()}${property.slice(3)}`;
        element.addEventListener(eventName, value);
      } else if (value === true) {
        element.setAttribute(property, '');
      } else if (value == null || value === false) {
        element.removeAttribute(property);
      } else {
        element.setAttribute(property, String(value));
      }
    }
  }

  if (childNodes) element.append(...childNodes);

  return element;
}

function normalizeComponentReturn<
  Result extends null | Node | Node[] = null | Node | Node[],
>(result: unknown) {
  let normalized: Result;

  if (Array.isArray(result)) {
    normalized = [] as any;

    for (const item of result.flat()) {
      const normalizedItem = normalizedComponentReturnItem(item);
      if (normalizedItem) (normalized as any).push(normalizedItem);
    }
  } else {
    normalized = normalizedComponentReturnItem(result) as any;
  }

  if (Array.isArray(normalized) && normalized.length === 0) {
    return null as Result;
  }

  return normalized;
}

function normalizedComponentReturnItem<T>(
  value: T,
): T extends string ? Exclude<T, string> | Text : T {
  return typeof value === 'string' || typeof value === 'number'
    ? document.createTextNode(String(value))
    : ((value || null) as any);
}
