import {version} from 'react';
import type {ReactNode} from 'react';
import type {RemoteRoot} from '@remote-ui/core';
import type {RootTag} from 'react-reconciler';

import {createReconciler} from './reconciler';
import type {Reconciler} from './reconciler';
import {RenderContext} from './context';
import type {RenderContextDescriptor} from './context';

const cache = new WeakMap<
  RemoteRoot,
  {
    container: ReturnType<Reconciler['createContainer']>;
    renderContext: RenderContextDescriptor;
  }
>();

// @see https://github.com/facebook/react/blob/fea6f8da6ab669469f2fa3f18bd3a831f00ab284/packages/react-reconciler/src/ReactRootTags.js#L12
// We don't support concurrent rendering for now.
const LEGACY_ROOT: RootTag = 0;
const defaultReconciler = createReconciler();

export interface Root {
  render(children: ReactNode): void;
  unmount(): void;
}

export function createRoot(root: RemoteRoot<any, any>): Root {
  return {
    render(children) {
      render(children, root);
    },
    unmount() {
      if (!cache.has(root)) return;
      render(null, root);
      cache.delete(root);
    },
  };
}

/**
 * @deprecated Use `createRoot` for a React 18-style rendering API.
 */
export function render(
  element: ReactNode,
  root: RemoteRoot<any, any>,
  callback?: () => void,
  reconciler: Reconciler = defaultReconciler,
) {
  // First, check if we've already cached a container and render context for this root
  let cached = cache.get(root);

  if (!cached) {
    const major = Number(version.split('.')?.[0] || 18);

    // Since we haven't created a container for this root yet, create a new one
    const value = {
      container:
        major >= 18
          ? reconciler.createContainer(
              root,
              LEGACY_ROOT,
              null,
              false,
              null,
              // Might not be necessary
              'r-ui',
              () => null,
              null,
            )
          : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - this is to support React 17
            reconciler.createContainer(root, LEGACY_ROOT, false, null),
      // We also cache the render context to avoid re-creating it on subsequent render calls
      renderContext: {root, reconciler},
    };

    // Store the container and render context for retrieval on subsequent render calls
    cache.set(root, value);
    cached = value;
  }

  const {container, renderContext} = cached;

  // callback is cast here because the typings do not mark that argument
  // as optional, even though it is.
  reconciler.updateContainer(
    element && (
      <RenderContext.Provider value={renderContext}>
        {element}
      </RenderContext.Provider>
    ),
    container,
    null,
    callback as any,
  );

  // Did not work for me because (I think?) it is done by the worker
  // and therefore has an entirely different React.
  //
  // Original code was from:
  // @see https://github.com/facebook/react/issues/16666
  // @see https://github.com/michalochman/react-pixi-fiber/pull/148
  //
  // reconciler.injectIntoDevTools({
  //   bundleType: 1,
  //   findFiberByHostInstance: reconciler.findFiberByHostInstance,
  //   rendererPackageName: '@remote-ui/react',
  //   version: '16.9.0',
  // });
}
