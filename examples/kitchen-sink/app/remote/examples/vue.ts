import {createApp} from 'vue';
import type {RenderAPI} from '../../types.ts';

// @ts-ignore Not bothering to set up proper Vue type-checking
import App from './App.vue';

export function renderUsingVue(root: Element, api: RenderAPI) {
  createApp(App, {api}).mount(root);
}
