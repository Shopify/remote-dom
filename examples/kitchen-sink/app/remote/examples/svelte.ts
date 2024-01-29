import type {RenderAPI} from '../../types.ts';

// @ts-ignore Not bothering to set up proper Svelte type-checking
import App from './App.svelte';

export function renderUsingSvelte(root: Element, api: RenderAPI) {
  new App({target: root, props: {api}});
}
