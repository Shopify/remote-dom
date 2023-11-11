import type {FunctionComponent} from 'react';

import {renderRemoteNode} from './node.tsx';
import {useRemoteReceived} from './hooks/remote-received.ts';
import type {RemoteComponentRendererProps} from './types.ts';

export const RemoteFragmentRenderer: FunctionComponent<RemoteComponentRendererProps> =
  function RemoteFragmentRenderer({
    element,
    receiver,
    components,
  }: RemoteComponentRendererProps) {
    const fragments = useRemoteReceived(element, receiver);

    if (!fragments) return null;

    const renderOptions = {receiver, components};

    return (
      <>
        {fragments.children.map((child) =>
          renderRemoteNode(child, renderOptions),
        )}
      </>
    );
  };
