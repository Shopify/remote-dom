import {DATA, HOOKS, OWNER_DOCUMENT} from './constants.ts';
import {ChildNode} from './ChildNode.ts';

export class CharacterData extends ChildNode {
  [DATA] = '';

  constructor(data: any) {
    super();
    this.setData(data);
  }

  protected setData(data: any) {
    let str = '';
    if (data != null) {
      str = typeof data === 'string' ? data : String(data);
    }
    this[DATA] = str;
    if (this[OWNER_DOCUMENT]) {
      this[OWNER_DOCUMENT].defaultView[HOOKS].setText?.(this as any, str);
    } else {
      setTimeout(() =>
        this[OWNER_DOCUMENT].defaultView[HOOKS].setText?.(this as any, str),
      );
    }
  }

  get data() {
    return this[DATA];
  }

  set data(data: any) {
    this.setData(data);
  }
}
