import type {FunctionComponent} from 'preact';

import {renderRemoteNode} from './node.tsx';
import type {RemoteComponentRendererProps} from './types.ts';

export const RemoteFragmentRenderer: FunctionComponent<RemoteComponentRendererProps> =
  function RemoteFragmentRenderer({
    element,
    receiver,
    components,
  }: RemoteComponentRendererProps) {
    const renderOptions = {receiver, components};

    return (
      <>
        {element.children.value.map((child) =>
          renderRemoteNode(child, renderOptions),
        )}
      </>
    );
  };
