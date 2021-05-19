import {isValidElement, memo, useMemo, useState} from 'react';
import type {ComponentType} from 'react';
import {isRemoteFragment, RemoteComponentType} from '@remote-ui/core';
import type {ReactComponentTypeFromRemoteComponentType} from './types';

import {useRender} from './hooks';

interface Options {
  hasFragmentProps?: boolean;
}

export function createRemoteReactComponent<
  Type extends string,
  Props = {},
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true
>(
  componentType: Type | RemoteComponentType<Type, Props, AllowedChildren>,
  {hasFragmentProps}: Options = {},
): RemoteComponentType<Type, Props, AllowedChildren> &
  ReactComponentTypeFromRemoteComponentType<
    RemoteComponentType<Type, Props, AllowedChildren>
  > {
  if (hasFragmentProps) {
    return createComponentWrapper(componentType) as any;
  }
  return componentType as any;
}

function createComponentWrapper<T>(componentType: T): T {
  const Component: ComponentType = componentType as any;

  return memo(function ComponentWrapper({
    children: externalChildren = [],
    ...externalProps
  }: any) {
    const [fragments] = useState<any>({});
    const {root, reconciler} = useRender();

    const {props, children} = useMemo(() => {
      /**
       * React portals need to be attached to the tree after intialize in order to render.
       * It's usually done by appending them as children of a parent node.
       * @see https://reactjs.org/docs/portals.html
       */
      const portals = [];
      const props: any = {};

      for (const key of Object.keys(externalProps)) {
        const element = externalProps[key];
        if (isValidElement(element)) {
          const currentFragment = fragments[key];
          const fragment = isRemoteFragment(currentFragment)
            ? currentFragment
            : root.createFragment();
          fragments[key] = fragment;

          /**
           * Assign createText and createComponent to fragment
           * so that it can become a React container to render the portal
           */
          Object.assign(fragment, {
            createText(...args: any[]) {
              return root.createText(...args);
            },
            createComponent(type: any, ...args: any[]) {
              return root.createComponent(type, ...args);
            },
          });
          const portal = reconciler.createPortal(element, fragment, null, null);
          portals.push(portal);
          props[key] = fragment;
        } else {
          props[key] = element;
          fragments[key] = undefined;
        }
      }

      return {props, children: [...externalChildren, ...portals]};
    }, [externalChildren, externalProps, root, reconciler, fragments]);

    return <Component {...props}>{children}</Component>;
  }) as any;
}
