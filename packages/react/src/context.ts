import {createContext} from 'react';

import type reconciler from './reconciler';

export const RootContext = createContext<
  import('@remote-ui/core').RemoteRoot<any, any> | null
>(null);

export const ReconcilerContext = createContext<typeof reconciler | null>(null);
