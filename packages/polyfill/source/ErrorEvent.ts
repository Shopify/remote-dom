import {Event} from './Event.ts';

// https://html.spec.whatwg.org/multipage/webappapis.html#errorevent
export class ErrorEvent extends Event {
  readonly message: ErrorEventInit['message'];
  readonly filename: ErrorEventInit['filename'];
  readonly lineno: ErrorEventInit['lineno'];
  readonly colno: ErrorEventInit['colno'];
  readonly error: ErrorEventInit['error'];

  constructor(type: string, eventInitDict: ErrorEventInit) {
    super(type, eventInitDict);

    this.message = eventInitDict.message;
    this.filename = eventInitDict.filename;
    this.lineno = eventInitDict.lineno;
    this.colno = eventInitDict.colno;
    this.error = eventInitDict.error;
  }
}
