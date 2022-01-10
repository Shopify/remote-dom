import {createContext} from 'react';
import type {RemoteRoot} from '@remote-ui/core';

import type {Reconciler} from './reconciler';

export interface RenderContextDescriptor {
  root: RemoteRoot;
  reconciler: Reconciler;
}

export const RenderContext = createContext<RenderContextDescriptor | null>(
  null,
);
