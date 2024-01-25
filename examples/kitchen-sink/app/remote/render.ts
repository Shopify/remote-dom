import type {RenderAPI} from '../types.ts';

import {renderUsingVanillaDOM} from './examples/vanilla.ts';
import {renderUsingHTM} from './examples/htm.ts';
import {renderUsingPreact} from './examples/preact.tsx';
import {renderUsingSvelte} from './examples/svelte.ts';

const EXAMPLE_MAP = new Map<
  RenderAPI['example'],
  (root: Element, api: RenderAPI) => void
>([
  ['vanilla', renderUsingVanillaDOM],
  ['htm', renderUsingHTM],
  ['preact', renderUsingPreact],
  ['svelte', renderUsingSvelte],
]);

export function render(root: Element, api: RenderAPI) {
  console.log(api);
  return EXAMPLE_MAP.get(api.example)?.(root, api);
}
