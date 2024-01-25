import type {RenderAPI} from '../../types.ts';

import App from './App.svelte';

export function renderUsingSvelte(root: Element, api: RenderAPI) {
  new App({target: root, props: {api}});
}
