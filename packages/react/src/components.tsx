import {memo, createElement, isValidElement, useMemo} from 'react';
import type {RemoteComponentType, RemoteRoot} from '@remote-ui/core';
import type {ReactComponentTypeFromRemoteComponentType} from './types';

import {useRoot, useReconciler} from './hooks';

export function createRemoteReactComponent<
  Type extends string,
  Props = {},
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true
>(
  componentType: Type | RemoteComponentType<Type, Props, AllowedChildren>,
): RemoteComponentType<Type, Props, AllowedChildren> &
  ReactComponentTypeFromRemoteComponentType<
    RemoteComponentType<Type, Props, AllowedChildren>
  > {
  return memo(function ComponentWrapper(externalProps: any) {
    const root = useRoot();
    const reconciler = useReconciler();

    const {props, children} = useMemo(
      () => reactElementToRemoteFragment(externalProps, root, reconciler),
      [externalProps, root, reconciler],
    );

    return createElement(componentType as any, props, children);
  }) as any;
}

function reactElementToRemoteFragment(
  {children = [], ...externalProps}: any,
  root: RemoteRoot<any, any>,
  reconciler: ReturnType<typeof useReconciler>,
) {
  const props: any = {};
  const portals = [];

  for (const key of Object.keys(externalProps)) {
    const element = externalProps[key];
    if (isValidElement(element)) {
      const fragment = root.createFragment();

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
    }
  }

  return {props, children: [...children, ...portals]};
}
