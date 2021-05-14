import {useContext} from 'react';

import {ReconcilerContext} from '../context';

export function useReconciler() {
  const root = useContext(ReconcilerContext);

  if (root == null) {
    throw new Error('No remote-ui Reconciler instance found in context');
  }

  return root;
}
