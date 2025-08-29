import {Event} from './Event.ts';

// https://html.spec.whatwg.org/multipage/popover.html#toggleevent
export class ToggleEvent extends Event {
  readonly oldState: ToggleEventInit['oldState'];
  readonly newState: ToggleEventInit['newState'];

  constructor(type: string, eventInitDict: ToggleEventInit) {
    super(type, eventInitDict);

    this.oldState = eventInitDict.oldState;
    this.newState = eventInitDict.newState;
  }
}
