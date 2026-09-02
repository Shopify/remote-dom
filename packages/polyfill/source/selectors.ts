import {CHILD, NEXT, PARENT, PREV, HTML_NAMESPACE} from './constants.ts';
import {isElementNode, splitOnASCIIWhitespace} from './shared.ts';
import {NodeList} from './NodeList.ts';

import type {Node} from './Node.ts';
import type {Element} from './Element.ts';
import type {ParentNode} from './ParentNode.ts';

export const COMBINATOR_DESCENDANT = 0;
export const COMBINATOR_CHILD = 1;
export const COMBINATOR_SIBLING = 2;
export const COMBINATOR_ADJACENT = 3;
export const COMBINATOR_INNER = 4;

export type Combinator =
  | typeof COMBINATOR_DESCENDANT
  | typeof COMBINATOR_CHILD
  | typeof COMBINATOR_SIBLING
  | typeof COMBINATOR_ADJACENT
  | typeof COMBINATOR_INNER;

export const MATCHER_UNKNOWN = 0;
export const MATCHER_ELEMENT = 1;
export const MATCHER_ID = 2;
export const MATCHER_CLASS = 3;
export const MATCHER_ATTRIBUTE = 4;
export const MATCHER_PSEUDO = 5;
export const MATCHER_FUNCTION = 6;

export type MatcherType =
  | typeof MATCHER_UNKNOWN
  | typeof MATCHER_ELEMENT
  | typeof MATCHER_ID
  | typeof MATCHER_CLASS
  | typeof MATCHER_ATTRIBUTE
  | typeof MATCHER_PSEUDO
  | typeof MATCHER_FUNCTION;

export interface Part {
  combinator: Combinator;
  matchers: Matcher[];
}

export interface Matcher {
  type: MatcherType;
  name: string;
  value?: string;
}

const ELEMENT_SELECTOR_TEST = /[a-zA-Z]/;

export function querySelector(
  within: ParentNode,
  selector: string | Matcher[],
): Element | null {
  const parts: Part[] =
    typeof selector === 'string'
      ? parseSelector(selector)
      : [{combinator: COMBINATOR_INNER, matchers: selector}];
  let result: Element | null = null;

  const child = within[CHILD];
  if (child && parts[0]!.matchers.length) {
    walkNodesForSelector(child, parts, (node) => {
      result = node;
      return false;
    });
  }
  return result;
}

export function querySelectorAll(
  within: ParentNode,
  selector: string | Matcher[],
): NodeList<Element> {
  const parts: Part[] =
    typeof selector === 'string'
      ? parseSelector(selector)
      : [{combinator: COMBINATOR_INNER, matchers: selector}];
  const results = new NodeList<Element>();

  const child = within[CHILD];
  if (child && parts[0]!.matchers.length) {
    walkNodesForSelector(child, parts, (node) => {
      results.push(node);
    });
  }
  return results;
}

export function parseSelector(selector: string) {
  let part: Part = {combinator: COMBINATOR_INNER, matchers: []};
  const parts = [part];
  const tokenizer =
    /[\t\n\f\r ]*?([>+~\t\n\f\r ]?)[\t\n\f\r ]*?(?:(?:\[[\t\n\f\r ]*([^\]=]+)(?:=(['"])(.*?)\3)?[\t\n\f\r ]*\])|([#.]?)([^\t\n\f\r #.[>:+~]+)|:(\w+)(?:\((.*?)\))?)/gi;
  let token;
  while ((token = tokenizer.exec(selector))) {
    // [1]: ancestor/parent/sibling/adjacent
    // [2]: attribute name
    // [4]: attribute value
    // [5]: id/class sigil
    // [6]: id/class name
    // [7]: :pseudo/:function() name
    // [8]: :function(argument) value
    if (token[1]) {
      // Update the combinator on the (now parent) Part:
      if (token[1] === '>') part.combinator = COMBINATOR_CHILD;
      else if (token[1] === '+') part.combinator = COMBINATOR_ADJACENT;
      else if (token[1] === '~') part.combinator = COMBINATOR_SIBLING;
      else part.combinator = COMBINATOR_DESCENDANT;
      // Add a new Part for the next selector parts:
      part = {combinator: COMBINATOR_INNER, matchers: []};
      parts.push(part);
    }

    let type: MatcherType = MATCHER_UNKNOWN;
    if (token[2]) {
      type = MATCHER_ATTRIBUTE;
    } else if (token[5]) {
      type = token[5] === '#' ? MATCHER_ID : MATCHER_CLASS;
    } else if (token[7]) {
      type = token[8] == null ? MATCHER_PSEUDO : MATCHER_FUNCTION;
    } else if (token[6]) {
      if (token[6] === '*') {
        type = MATCHER_UNKNOWN; // Universal selector matches all
      } else if (ELEMENT_SELECTOR_TEST.test(token[6])) {
        type = MATCHER_ELEMENT;
      }
    }
    part.matchers.push({
      type,
      name: (token[2] || token[6] || token[7])!,
      value: token[4] ?? token[6] ?? token[8],
    });
  }
  return parts;
}

function matchesSelector(element: Element, selector: string) {
  const parsed = parseSelector(selector);
  let part: Part | undefined;
  while ((part = parsed.pop())) {
    if (!matchesSelectorPart(element, part)) return false;
  }
  return true;
}

function walkNodesForSelector(
  node: Node,
  parts: Part[],
  callback: (node: Element) => boolean | void,
) {
  if (isElementNode(node)) {
    if (matchesSelectorRecursive(node, parts)) {
      if (callback(node) === false) return false;
    }
    const child = node[CHILD];
    if (child && walkNodesForSelector(child, parts, callback) === false) {
      return false;
    }
  }
  const next = node[NEXT];
  if (next && walkNodesForSelector(next, parts, callback) === false) {
    return false;
  }
  return true;
}

function matchesSelectorRecursive(element: Element, parts: Part[]): boolean {
  const {combinator, matchers} = parts[parts.length - 1]!;
  if (combinator === COMBINATOR_INNER) {
    if (!matchesSelectorMatcher(element, matchers)) return false;
    const pp = parts.slice(0, -1);
    return pp.length === 0 || matchesSelectorRecursive(element, pp);
  }
  const link =
    combinator === COMBINATOR_CHILD || combinator === COMBINATOR_DESCENDANT
      ? PARENT
      : PREV;
  let ref = element[link];
  if (!ref) return false;

  if (
    combinator === COMBINATOR_DESCENDANT ||
    combinator === COMBINATOR_SIBLING
  ) {
    // For descendant/sibling combinators, search through all ancestors/siblings
    while (ref) {
      if (isElementNode(ref) && matchesSelectorMatcher(ref, matchers)) {
        const pp = parts.slice(0, -1);
        if (pp.length === 0) return true;
        if (matchesSelectorRecursive(element, pp)) return true;
      }
      ref = ref[link];
    }
    return false;
  } else {
    // For child/adjacent combinators, check only the immediate parent/sibling
    // For sibling combinators, skip non-element siblings
    if (combinator === COMBINATOR_ADJACENT && !isElementNode(ref)) {
      // Skip to next element sibling
      while (ref && !isElementNode(ref)) {
        ref = ref[link];
      }
      if (!ref) return false;
    }

    if (!isElementNode(ref) || !matchesSelectorMatcher(ref, matchers)) {
      return false;
    }
    const pp = parts.slice(0, -1);
    return pp.length === 0 || matchesSelectorRecursive(element, pp);
  }
}

function matchesSelectorPart(element: Element, {combinator, matchers}: Part) {
  if (combinator === COMBINATOR_INNER) {
    return matchesSelectorMatcher(element, matchers);
  }
  const link =
    combinator === COMBINATOR_CHILD || combinator === COMBINATOR_DESCENDANT
      ? PARENT
      : PREV;
  let ref = element[link];
  if (!ref) return false;

  // For sibling combinators, skip non-element siblings
  if (combinator === COMBINATOR_ADJACENT && !isElementNode(ref)) {
    while (ref && !isElementNode(ref)) {
      ref = ref[link];
    }
    if (!ref) return false;
  }

  if (!isElementNode(ref) || !matchesSelectorMatcher(ref, matchers)) {
    return false;
  }

  if (
    combinator === COMBINATOR_DESCENDANT ||
    combinator === COMBINATOR_SIBLING
  ) {
    while ((ref = ref[link])) {
      if (isElementNode(ref) && matchesSelectorMatcher(ref, matchers))
        return true;
    }
  }
  return true;
}

function matchesSelectorMatcher(
  element: Element | null,
  matcher: Matcher | Matcher[],
) {
  if (!element) return false;
  if (Array.isArray(matcher)) {
    for (const single of matcher) {
      if (matchesSelectorMatcher(element, single) === false) return false;
    }
    return true;
  }
  const {type, name, value} = matcher;
  switch (type) {
    case MATCHER_UNKNOWN:
      return name === '*'; // Universal selector
    case MATCHER_ELEMENT:
      return element.namespaceURI === HTML_NAMESPACE
        ? element.localName.toLowerCase() === name.toLowerCase()
        : element.localName === name;
    case MATCHER_ID:
      return element.getAttribute('id') === name;
    case MATCHER_CLASS:
      const classAttr = element.getAttribute('class');
      if (!classAttr) return false;
      return splitOnASCIIWhitespace(classAttr).includes(name);
    case MATCHER_ATTRIBUTE:
      return value == null
        ? element.hasAttribute(name)
        : element.getAttribute(name) === value;
    case MATCHER_PSEUDO:
      switch (name) {
        default:
          throw Error(`Pseudo :${name} not implemented`);
      }
    case MATCHER_FUNCTION:
      switch (name) {
        case 'has':
          return matchesSelector(element, value || '');
        case 'not':
          return !matchesSelector(element, value || '');
        default:
          throw Error(`Function :${name}(${value}) not implemented`);
      }
  }
  return false;
}
