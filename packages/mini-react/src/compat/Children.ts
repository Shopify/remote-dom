import type {ComponentChildren, ComponentChild} from '../types';

export const Children = {
  map: mapOverChildren,
  forEach: mapOverChildren as (
    children: ComponentChildren,
    func: (child: ComponentChild) => void,
  ) => void,
  count(children: ComponentChildren) {
    return children ? toChildArray(children).length : 0;
  },
  only(children: ComponentChildren) {
    const normalized = toChildArray(children);

    if (normalized.length !== 1) {
      throw new Error('Children.only');
    }

    return normalized[0];
  },
  toArray: toChildArray,
};

function mapOverChildren<T>(
  children: ComponentChildren,
  func: (child: ComponentChild) => T,
) {
  if (children == null) return null;
  return toChildArray(toChildArray(children).map(func));
}

/**
 * Flatten and loop through the children of a virtual node
 */
function toChildArray(children: ComponentChildren, out: ComponentChild[] = []) {
  if (children == null || typeof children === 'boolean') {
    return out;
  }

  if (Array.isArray(children)) {
    for (const grandChild of children) {
      toChildArray(grandChild, out);
    }
  } else {
    out.push(children);
  }

  return out;
}
