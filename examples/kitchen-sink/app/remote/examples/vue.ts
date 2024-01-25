import {createApp} from 'vue';
import type {RenderAPI} from '../../types.ts';

import App from './App.vue';

export function renderUsingVue(root: Element, api: RenderAPI) {
  createApp(App, {api}).mount(root);
}
