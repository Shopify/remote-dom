import {createContext} from 'react';
import type {RemoteRoot} from '@remote-ui/core';

import type reconciler from './reconciler';

export const RenderContext = createContext<{
  root: RemoteRoot;
  reconciler: typeof reconciler;
} | null>(null);
