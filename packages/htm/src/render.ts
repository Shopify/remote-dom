import baseHtm from 'htm';
import type {RemoteRoot, RemoteComponent} from '@remote-ui/core';

interface Element {
  type: string;
  props: Record<string, any>;
  children: (string | Element)[];
}

export const htm = baseHtm.bind<Element>((type, props, ...children) => {
  if (typeof type !== 'string') {
    throw new Error(`You can only create components with string names.`);
  }

  for (const child of children) {
    if (typeof child !== 'string' && !isElement(child)) {
      throw new Error(`Unexpected child ${JSON.stringify(child)}`);
    }
  }

  return {type, props, children};
});

export function render<Root extends RemoteRoot<any, any>>(
  tree: ReturnType<typeof htm>,
  root: Root,
) {
  const normalizedTree = Array.isArray(tree) ? tree : [tree];
  return normalizedTree.map((element) => attach(element, root, root));
}

function attach<Root extends RemoteRoot<any, any>>(
  {type, props, children}: Element,
  to: Root | RemoteComponent<any, any>,
  root: Root,
): RemoteComponent<any, Root> {
  const component = root.createComponent(type, props);

  for (const child of children) {
    if (typeof child === 'string') {
      component.appendChild(child);
    } else {
      attach(child, component, root);
    }
  }

  to.appendChild(component);

  return component as any;
}

function isElement(child: unknown): child is Element {
  return (
    child != null &&
    typeof (child as any).type === 'string' &&
    typeof (child as any).props === 'object' &&
    Array.isArray((child as any).children)
  );
}
