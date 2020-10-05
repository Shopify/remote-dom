import type {ReactElement} from 'react';

import reconciler from './reconciler';

export function render(
  element: ReactElement,
  root: import('@remote-ui/core').RemoteRoot<any, any>,
  callback?: () => void,
) {
  const container = reconciler.createContainer(root, false, false);

  // callback is cast here because the typings do not mark that argument
  // as optional, even though it is.
  reconciler.updateContainer(element, container, null, callback as any);

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
