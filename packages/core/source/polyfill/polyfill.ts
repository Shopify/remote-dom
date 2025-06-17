import {Window} from '@remote-dom/polyfill';
import {window} from './window.ts';
import {hooks, type Hooks} from './hooks.ts';

Window.setGlobal(window);

export {hooks, window, Window, type Hooks};
