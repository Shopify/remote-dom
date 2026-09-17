import {
  CHILD,
  NEXT,
  PARENT,
  PREV,
  NAME,
  HTML_NAMESPACE,
  asciiLowercase,
  splitOnASCIIWhitespace,
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
// Internal matcher for qualified-name queries. CSS type selectors use localName
// instead, while both kinds precompute their HTML comparison value.
export const MATCHER_QUALIFIED_NAME = 8;

/** Common fields available on every selector matcher. */
export interface MatcherBase {
  /**
   * A precomputed name for matching HTML elements and attributes. Matcher
   * kinds that do not perform namespace-sensitive name matching ignore it.
   */
  htmlName?: string;
}

/** Matchers whose comparison value is carried entirely by `name`. */
export interface NameMatcher extends MatcherBase {
  type: typeof MATCHER_UNKNOWN | typeof MATCHER_ID | typeof MATCHER_CLASS;
  /**
   * The literal ID (without `#`) or class token (without `.`). Spelling is
   * preserved. For unknown tokens, only `*` matches.
   */
  name: string;
  /** Unused by matching; the parser may echo `name` here. */
  value?: string;
}

/** An attribute selector, optionally requiring an exact value. */
export interface AttributeMatcher extends MatcherBase {
  type: typeof MATCHER_ATTRIBUTE;
  /** The attribute name as supplied in the selector. */
  name: string;
  /** The precomputed ASCII-lowercased name used for HTML attributes. */
  htmlName: string;
  /** Exact comparison text; `undefined` requests a presence check. */
  value?: string;
}

/** A pseudo-class selector without an argument. */
export interface PseudoMatcher extends MatcherBase {
  type: typeof MATCHER_PSEUDO;
  /** The ASCII-lowercased pseudo name, without its leading `:`. */
  name: string;
  /** Absent: arguments belong to a FunctionMatcher. */
  value?: undefined;
}

/** A functional pseudo-class selector. */
export interface FunctionMatcher extends MatcherBase {
  type: typeof MATCHER_FUNCTION;
  /** The ASCII-lowercased function name, without punctuation. */
  name: string;
  /** Raw argument text; an omitted value is matched as an empty argument. */
  value?: string;
}

/** The internal scope marker used while matching relative selectors. */
export interface ScopeMatcher extends MatcherBase {
  type: typeof MATCHER_SCOPE;
  /** A marker label; the scope element is supplied separately. */
  name: ':scope';
  /** Unused by scope matching. */
  value?: undefined;
}

/** A local- or qualified-name matcher with a precomputed HTML comparison name. */
export interface NormalizedNameMatcher extends MatcherBase {
  /** Selects local-name matching for CSS or qualified-name matching for DOM APIs. */
  type: typeof MATCHER_ELEMENT | typeof MATCHER_QUALIFIED_NAME;
  /**
   * The original local-name query for MATCHER_ELEMENT or qualified-name query
   * for MATCHER_QUALIFIED_NAME, preserving case for non-HTML elements.
   */
  name: string;
  /** The precomputed ASCII-lowercased name used for HTML elements. */
  htmlName: string;
  /** Unused by matching; the parser may echo `name` here. */
  value?: string;
}

export type Matcher =
  | NameMatcher
  | AttributeMatcher
  | PseudoMatcher
  | FunctionMatcher
  | ScopeMatcher
  | NormalizedNameMatcher;

export type MatcherType = Matcher['type'];

export interface Part {
  combinator: Combinator;
  matchers: Matcher[];
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

export function parseSelector(selector: string, insideHas = false) {
  let part: Part = {combinator: COMBINATOR_INNER, matchers: []};
  const parts = [part];
  const tokenizer =
    /[\t\n\f\r ]*?([>\t\n\f\r +~]?)[\t\n\f\r ]*?(?:(?:\[[\t\n\f\r ]*([^\]=\t\n\f\r ]+)[\t\n\f\r ]*(?:=[\t\n\f\r ]*(?:(['"])(.*?)\3|([^\]\t\n\f\r ]+)))?[\t\n\f\r ]*\])|([#.]?)([^\t\n\f\r #.[>:+~()]+)|:(\w+)(\()?)/gi;
  const normalizedSelector = selector.replace(
    /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,
    '',
  );
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
    if (type === MATCHER_FUNCTION && (name === 'has' || name === 'not')) {
      if (name === 'has' && insideHas) {
        throw Error(':has() cannot be nested inside :has()');
      }
      parseSelector(value!, insideHas || name === 'has');
    }
    part.matchers.push({
      type,
      name,
      htmlName:
        type === MATCHER_ELEMENT || type === MATCHER_ATTRIBUTE
          ? asciiLowercase(name)
          : undefined,
      value,
    } as Matcher);
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
    return (
      parts.length === 1 ||
      matchesSelectorRecursive(element, parts.slice(0, -1), scope)
    );
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
        if (
          parts.length === 1 ||
          matchesSelectorRecursive(ref, parts.slice(0, -1), scope)
        ) {
          return true;
        }
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
    return (
      parts.length === 1 ||
      matchesSelectorRecursive(ref, parts.slice(0, -1), scope)
    );
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
  const {type, name, htmlName, value} = matcher;
  switch (type) {
    case MATCHER_UNKNOWN:
      return name === '*'; // Universal selector
    case MATCHER_ELEMENT:
      return (
        element.localName ===
        (element.namespaceURI === HTML_NAMESPACE ? htmlName : name)
      );
    case MATCHER_QUALIFIED_NAME:
      return (
        element[NAME] ===
        (element.namespaceURI === HTML_NAMESPACE ? htmlName : name)
      );
    case MATCHER_ID:
      return element.getAttributeNS(null, 'id') === name;
    case MATCHER_CLASS:
      const classAttr = element.getAttributeNS(null, 'class');
      if (!classAttr) return false;
      return splitOnASCIIWhitespace(classAttr).includes(name);
    case MATCHER_ATTRIBUTE:
      const attribute = element.getAttributeNS(
        null,
        element.namespaceURI === HTML_NAMESPACE ? htmlName : name,
      );
      return value == null ? attribute != null : attribute === value;
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
