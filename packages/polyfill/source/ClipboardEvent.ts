import {Event} from './Event.ts';

// https://w3c.github.io/clipboard-apis/#clipboardevent-interface
export class ClipboardEvent extends Event {
  readonly clipboardData: ClipboardEventInit['clipboardData'];

  constructor(type: string, eventInitDict: ClipboardEventInit = {}) {
    super(type, eventInitDict);

    this.clipboardData = eventInitDict.clipboardData ?? null;
  }
}
