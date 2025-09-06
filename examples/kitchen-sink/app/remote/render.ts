import {RemoteChannel} from '@remote-ui/core';

// Defines the custom elements available to render in the remote environment.
import './elements.ts';

export async function renderLegacy(channel: RemoteChannel) {
  const {renderUsingReactRemoteUI} = await import(
    './examples/react-remote-ui.tsx'
  );
  return renderUsingReactRemoteUI(channel);
}
