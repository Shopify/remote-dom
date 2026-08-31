import type {Hooks} from './hooks.ts';
import type {Window} from './Window.ts';

export interface WindowExtension {
  readonly name: string;
  install(window: Window): Partial<Hooks> | void;
}
