import {IS_NON_DIMENSIONAL} from '../constants';
import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
export function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
  let i;
  let needsUpdate = false;
  const update = {};

  for (i in oldProps) {
    if (i !== 'children' && i !== 'key' && !(i in newProps)) {
      needsUpdate = true;
      update[i] = undefined;
    }
  }

  for (i in newProps) {
    if (i !== 'children' && i !== 'key' && oldProps[i] !== newProps[i]) {
      needsUpdate = true;
      update[i] = newProps[i];
    }
  }

  if (needsUpdate) dom.updateProps(update);
}
