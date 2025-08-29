import {Event} from './Event.ts';

// https://w3c.github.io/uievents/#interface-focusevent
export class FocusEvent extends Event {
  readonly relatedTarget: FocusEventInit['relatedTarget'];

  constructor(type: string, eventInitDict: FocusEventInit = {}) {
    super(type, eventInitDict);

    this.relatedTarget = eventInitDict.relatedTarget ?? null;
  }
}
