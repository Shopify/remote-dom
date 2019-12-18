import React, {ReactElement} from 'react';

import reconciler from './reconciler';
import {Controller, ControllerContext} from './controller';

export function render(
  element: ReactElement,
  root: import('@remote-ui/core').RemoteRoot<any, any>,
) {
  const controller = new Controller(root);
  const container = reconciler.createContainer(root, false, false);

  reconciler.updateContainer(
    <ControllerContext.Provider value={controller}>
      {element}
    </ControllerContext.Provider>,
    container,
    null,
    () => {
      root.mount();
    },
  );
}
