import {ReactElement} from 'react';

import reconciler from './reconciler';

export function render(
  element: ReactElement,
  root: import('@remote-ui/core').RemoteRoot<any, any>,
) {
  const container = reconciler.createContainer(root, false, false);

  reconciler.updateContainer(element, container, null, () => {
    root.mount();
  });
}
