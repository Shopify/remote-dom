import {isValidElement, memo, useMemo, useRef, Children} from 'react';
import type {ComponentType} from 'react';
import {isRemoteFragment} from '@remote-ui/core';
import type {RemoteComponentType, RemoteFragment} from '@remote-ui/core';

import type {ReactComponentTypeFromRemoteComponentType} from './types';
import {useRender} from './hooks';

interface Options<Props> {
  fragmentProps?: (keyof Props)[];
}

export function createRemoteReactComponent<
  Type extends string,
  Props = Record<string, never>,
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true,
>(
  componentType: Type | RemoteComponentType<Type, Props, AllowedChildren>,
  {fragmentProps}: Options<Props> = {},
): RemoteComponentType<Type, Props, AllowedChildren> &
  ReactComponentTypeFromRemoteComponentType<
    RemoteComponentType<Type, Props, AllowedChildren>
  > {
  if (!fragmentProps || !fragmentProps.length) {
    return componentType as any;
  }
  const wrapper = createComponentWrapper(componentType, fragmentProps) as any;
  wrapper.displayName = componentType;
  return wrapper;
}

function createComponentWrapper<T, P>(
  componentType: T,
  fragmentProps: (keyof P)[],
): T {
  const Component: ComponentType = componentType as any;

  return memo(function ComponentWrapper({
    children: externalChildren = [],
    ...externalProps
  }: any) {
    const fragments = useRef<{[key in string]: RemoteFragment}>({});
    const {root, reconciler} = useRender();

    const {props, children} = useMemo(() => {
      // React portals need to be attached to the tree after intialize in order to render.
      // It's usually done by appending them as children of a parent node.
      // @see https://reactjs.org/docs/portals.html
      const portals = [];
      const props: any = {};

      for (const key of Object.keys(externalProps)) {
        const element = externalProps[key];
        if (fragmentProps.includes(key as any) && isValidElement(element)) {
          const currentFragment = fragments.current[key];
          const fragment = isRemoteFragment(currentFragment)
            ? currentFragment
            : root.createFragment();
          fragments.current[key] = fragment;

          // Assign createText and createComponent to fragment
          // so that it can become a React container to render the portal
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
          delete fragments.current[key];
        }
      }

      return {
        props,
        children: [...Children.toArray(externalChildren), ...portals],
      };
    }, [externalChildren, externalProps, root, reconciler, fragments]);

    return <Component {...props}>{children}</Component>;
  }) as any;
}
