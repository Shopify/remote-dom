import {createContext} from 'react';

import type reconciler from './reconciler';

export const RenderContext = createContext<{
  root: import('@remote-ui/core').RemoteRoot;
  reconciler: typeof reconciler;
} | null>(null);
