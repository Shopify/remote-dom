import type {RenderApi} from '../../types.ts';

import App from './App.svelte';

export function renderUsingSvelte(root: Element, api: RenderApi) {
  new App({target: root, props: {api}});
}
