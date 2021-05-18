import {useContext} from 'react';

import {RenderContext} from '../context';

export function useRender() {
  const render = useContext(RenderContext);

  if (render == null) {
    throw new Error('No remote-ui Render instance found in context');
  }

  return render;
}
