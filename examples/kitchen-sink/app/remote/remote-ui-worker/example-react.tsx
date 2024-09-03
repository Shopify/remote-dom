/** @jsxRuntime automatic */
/** @jsxImportSource react */

import {
  createRoot,
  createRemoteReactComponent,
  type RemoteRoot,
} from '@remote-ui/react';
import {ButtonProperties, StackProperties, RenderAPI} from '../../types';

const Stack = createRemoteReactComponent<'Stack', StackProperties>('Stack');
const Button = createRemoteReactComponent<'Button', ButtonProperties>('Button');

export function renderReact(remoteRoot: RemoteRoot, api: RenderAPI) {
  const root = createRoot(remoteRoot);
  root.render(<App api={api} />);
}

function App({api}: {api: RenderAPI}) {
  return (
    <Stack>
      <Button onPress={() => api.alert('Hello world')}>Click me</Button>
    </Stack>
  );
}
