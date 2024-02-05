import type {FunctionComponent} from 'react';

import {renderRemoteNode} from './node.tsx';
import {useRemoteReceived} from './hooks/remote-received.ts';
import type {RemoteComponentRendererProps} from './types.ts';

/**
 * A component that can be used to render a list of children elements, without any
 * additional wrapping elements. This is typically used on the host to render the `remote-root`
 * element, which is a special element rendered by Remote DOM to translate between React
 * elements passed as properties and slotted elements.
 */
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
