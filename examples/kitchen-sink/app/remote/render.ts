import type {RenderApi} from '../types.ts';

import {renderUsingVanillaDOM} from './render/vanilla.ts';
import {renderUsingHtm} from './render/htm.ts';
import {renderUsingPreact} from './render/preact.tsx';
import {renderUsingSvelte} from './render/svelte.ts';

export function render(root: Element, api: RenderApi) {
  switch (api.framework) {
    case 'htm':
      return renderUsingHtm(root, api);
    case 'vanilla':
      return renderUsingVanillaDOM(root, api);
    case 'preact':
      return renderUsingPreact(root, api);
    case 'svelte':
      return renderUsingSvelte(root, api);
  }
}
