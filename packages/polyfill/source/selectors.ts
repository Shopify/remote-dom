import {
  CHILD,
  NEXT,
  PARENT,
  PREV,
  HTML_NAMESPACE,
  asciiLowercase,
} from './constants.ts';
import {isElementNode} from './shared.ts';
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
export const MATCHER_SCOPE = 7;

export type MatcherType =
  | typeof MATCHER_UNKNOWN
  | typeof MATCHER_ELEMENT
  | typeof MATCHER_ID
  | typeof MATCHER_CLASS
  | typeof MATCHER_ATTRIBUTE
  | typeof MATCHER_PSEUDO
  | typeof MATCHER_FUNCTION
  | typeof MATCHER_SCOPE;

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

function readFunctionArgument(
  selector: string,
  start: number,
): [string, number] {
  let depth = 1;
  let quote: string | null = null;

  for (let index = start; index < selector.length; index++) {
    const character = selector[index]!;

    if (quote) {
      if (character === '\\') {
        index++;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth++;
    } else if (character === ')' && --depth === 0) {
      return [selector.slice(start, index), index + 1];
    }
  }

  return [selector.slice(start), selector.length];
}

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
    /\s*?([>\s+~]?)\s*?(?:(?:\[\s*([^\]=\s]+)\s*(?:=\s*(?:(['"])(.*?)\3|([^\]\s]+)))?\s*\])|([#.]?)([^\s#.[>:+~()]+)|:(\w+)(\()?)/gi;
  const normalizedSelector = selector.trim();
  let token;
  while ((token = tokenizer.exec(normalizedSelector))) {
    // [1]: ancestor/parent/sibling/adjacent
    // [2]: attribute name
    // [4]/[5]: quoted/unquoted attribute value
    // [6]: id/class sigil
    // [7]: id/class name
    // [8]: :pseudo/:function() name
    // [9]: :function opening parenthesis
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
    } else if (token[6]) {
      type = token[6] === '#' ? MATCHER_ID : MATCHER_CLASS;
    } else if (token[8]) {
      type = token[9] == null ? MATCHER_PSEUDO : MATCHER_FUNCTION;
    } else if (token[7]) {
      if (token[7] === '*') {
        type = MATCHER_UNKNOWN; // Universal selector matches all
      } else if (ELEMENT_SELECTOR_TEST.test(token[7])) {
        type = MATCHER_ELEMENT;
      }
    }
    let value = token[4] ?? token[5] ?? token[7];
    if (token[9]) {
      [value, tokenizer.lastIndex] = readFunctionArgument(
        normalizedSelector,
        tokenizer.lastIndex,
      );
    }
    const name = token[8] ? asciiLowercase(token[8]) : (token[2] || token[7])!;
    part.matchers.push({
      type,
      name,
      value,
    });
  }
  return parts;
}

function matchesSelector(element: Element, selector: string) {
  const parsed = parseSelector(selector);
  return parsed[0]?.matchers.length
    ? matchesSelectorRecursive(element, parsed)
    : false;
}

function matchesRelativeSelector(scope: Element, selector: string) {
  const parts = parseSelector(selector);
  const first = parts[0]!;
  if (parts.length === 1 && first.matchers.length === 0) return false;

  let leadingCombinator = COMBINATOR_DESCENDANT;
  const scopeMatcher: Matcher = {type: MATCHER_SCOPE, name: ':scope'};
  if (first.matchers.length === 0) {
    leadingCombinator = first.combinator;
    first.matchers.push(scopeMatcher);
  } else {
    parts.unshift({
      combinator: COMBINATOR_DESCENDANT,
      matchers: [scopeMatcher],
    });
  }

  if (parts.some(({matchers}) => matchers.length === 0)) return false;

  const root =
    leadingCombinator === COMBINATOR_ADJACENT ||
    leadingCombinator === COMBINATOR_SIBLING
      ? scope[NEXT]
      : scope[CHILD];
  if (!root) return false;

  let matched = false;
  walkNodesForSelector(
    root,
    parts,
    () => {
      matched = true;
      return false;
    },
    scope,
  );
  return matched;
}

function walkNodesForSelector(
  node: Node,
  parts: Part[],
  callback: (node: Element) => boolean | void,
  scope?: Element,
) {
  const pendingSiblings: Node[] = [];
  let current: Node | null = node;

  while (current) {
    if (isElementNode(current)) {
      if (matchesSelectorRecursive(current, parts, scope)) {
        if (callback(current) === false) return false;
      }

      const child: Node | null = current[CHILD];
      if (child) {
        const sibling = current[NEXT];
        if (sibling) pendingSiblings.push(sibling);
        current = child;
        continue;
      }
    }

    current = current[NEXT] ?? pendingSiblings.pop() ?? null;
  }

  return true;
}

function matchesSelectorRecursive(
  element: Element,
  parts: Part[],
  scope?: Element,
): boolean {
  const {combinator, matchers} = parts[parts.length - 1]!;
  if (combinator === COMBINATOR_INNER) {
    if (!matchesSelectorMatcher(element, matchers, scope)) return false;
    const pp = parts.slice(0, -1);
    return pp.length === 0 || matchesSelectorRecursive(element, pp, scope);
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
      if (isElementNode(ref) && matchesSelectorMatcher(ref, matchers, scope)) {
        const pp = parts.slice(0, -1);
        if (pp.length === 0) return true;
        if (matchesSelectorRecursive(ref, pp, scope)) return true;
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

    if (!isElementNode(ref) || !matchesSelectorMatcher(ref, matchers, scope)) {
      return false;
    }
    const pp = parts.slice(0, -1);
    return pp.length === 0 || matchesSelectorRecursive(ref, pp, scope);
  }
}

function matchesSelectorMatcher(
  element: Element | null,
  matcher: Matcher | Matcher[],
  scope?: Element,
) {
  if (!element) return false;
  if (Array.isArray(matcher)) {
    for (const single of matcher) {
      if (matchesSelectorMatcher(element, single, scope) === false) {
        return false;
      }
    }
    return true;
  }
  const {type, name, value} = matcher;
  switch (type) {
    case MATCHER_UNKNOWN:
      return name === '*'; // Universal selector
    case MATCHER_ELEMENT:
      return element.namespaceURI === HTML_NAMESPACE
        ? element.localName === asciiLowercase(name)
        : element.localName === name;
    case MATCHER_ID:
      return element.getAttribute('id') === name;
    case MATCHER_CLASS:
      const classAttr = element.getAttribute('class');
      if (!classAttr) return false;
      return classAttr.split(/\s+/).includes(name);
    case MATCHER_ATTRIBUTE:
      return value == null
        ? element.hasAttribute(name)
        : element.getAttribute(name) === value;
    case MATCHER_SCOPE:
      return element === scope;
    case MATCHER_PSEUDO:
      switch (name) {
        default:
          throw Error(`Pseudo :${name} not implemented`);
      }
    case MATCHER_FUNCTION:
      switch (name) {
        case 'has':
          return matchesRelativeSelector(element, value || '');
        case 'not':
          return !matchesSelector(element, value || '');
        default:
          throw Error(`Function :${name}(${value}) not implemented`);
      }
  }
  return false;
}
