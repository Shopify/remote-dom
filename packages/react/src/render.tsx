import type {ReactElement} from 'react';

import reconciler from './reconciler';
import {RenderContext} from './context';

export function render(
  element: ReactElement,
  root: import('@remote-ui/core').RemoteRoot<any, any>,
  callback?: () => void,
) {
  // @see https://github.com/facebook/react/blob/993ca533b42756811731f6b7791ae06a35ee6b4d/packages/react-reconciler/src/ReactRootTags.js
  // I think we are a legacy root?
  const container = reconciler.createContainer(root, 0, false, null);
  const renderContextValue = {root, reconciler};

  // callback is cast here because the typings do not mark that argument
  // as optional, even though it is.
  reconciler.updateContainer(
    <RenderContext.Provider value={renderContextValue}>
      {element}
    </RenderContext.Provider>,
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
