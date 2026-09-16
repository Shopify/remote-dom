import type {Node} from './Node.ts';

export class NodeList<Item extends Node = Node> extends Array<Item> {
  item(index: number): Item | null {
    return this[index] ?? null;
  }
}
