import type {ParentNode} from './ParentNode.ts';
import type {Element} from './Element.ts';
import {NodeList} from './NodeList.ts';
import {descendants, isElementNode} from './shared.ts';

export function getElementsByClassName(
  node: ParentNode,
  classNames: string,
): NodeList<Element> {
  const names = [...new Set(String(classNames).split(/[\t\n\f\r ]+/))].filter(
    Boolean,
  );
  const matches = new NodeList<Element>();

  if (names.length === 0) return matches;

  for (const descendant of descendants(node)) {
    if (!isElementNode(descendant)) continue;

    const classes = descendant.getAttribute('class');
    if (classes == null) continue;

    const tokens = classes.split(/[\t\n\f\r ]+/);
    if (names.every((name) => tokens.includes(name))) {
      matches.push(descendant);
    }
  }

  return matches;
}
