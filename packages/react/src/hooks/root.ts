import {useContext} from 'react';

import {RootContext} from '../context';

export function useRoot() {
  const root = useContext(RootContext);

  if (root == null) {
    throw new Error('No remote-ui Root instance found in context');
  }

  return root;
}
