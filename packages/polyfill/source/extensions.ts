import type {Hooks} from './hooks.ts';
import type {Window} from './Window.ts';

export type WindowExtension = (window: Window) => Partial<Hooks> | void;
