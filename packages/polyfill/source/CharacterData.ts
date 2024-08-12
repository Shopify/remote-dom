import {DATA, HOOKS} from './constants.ts';
import {ChildNode} from './ChildNode.ts';

export class CharacterData extends ChildNode {
  [DATA] = '';

  constructor(data: any) {
    super();
    this[DATA] = data == null ? '' : String(data);
  }

  protected setData(data: any) {
    let str = '';
    if (data != null) {
      str = typeof data === 'string' ? data : String(data);
    }
    this[DATA] = str;
    this[HOOKS].setText?.(this as any, str);
  }

  get data() {
    return this[DATA];
  }

  set data(data: any) {
    this.setData(data);
  }
}
