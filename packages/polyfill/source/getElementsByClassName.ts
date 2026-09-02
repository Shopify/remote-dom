import type {ParentNode} from './ParentNode.ts';
import {MATCHER_CLASS, querySelectorAll} from './selectors.ts';

export function getElementsByClassName(node: ParentNode, classNames: string) {
  const names = [...new Set(String(classNames).split(/[\t\n\f\r ]+/))].filter(
    Boolean,
  );

  return querySelectorAll(
    node,
    names.map((name) => ({type: MATCHER_CLASS, name})),
  );
}
