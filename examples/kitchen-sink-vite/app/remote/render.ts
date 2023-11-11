import type {RenderApi} from '../types.ts';

import {renderUsingVanillaDOM} from './render/vanilla.ts';
import {renderUsingHtm} from './render/htm.ts';

export function render(root: Element, api: RenderApi) {
  switch (api.framework) {
    case 'htm':
      return renderUsingHtm(root, api);
    case 'vanilla':
      return renderUsingVanillaDOM(root, api);
  }
}
