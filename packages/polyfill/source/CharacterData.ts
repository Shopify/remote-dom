import {DATA, HOOKS} from './constants.ts';
import {ChildNode} from './ChildNode.ts';
import {queueMutationRecord} from './MutationObserver.ts';

export class CharacterData extends ChildNode {
  [DATA] = '';

  constructor(data: any) {
    super();
    this[DATA] = data == null ? '' : String(data);
  }

  protected setData(data: any) {
    const oldValue = this[DATA];
    let str = '';
    if (data != null) {
      str = typeof data === 'string' ? data : String(data);
    }
    this[DATA] = str;
    if (oldValue !== str) {
      queueMutationRecord({
        type: 'characterData',
        target: this,
        oldValue,
      });
    }
    this[HOOKS].setText?.(this as any, str);
  }

  get data() {
    return this[DATA];
  }

  set data(data: any) {
    this.setData(data);
  }
}
