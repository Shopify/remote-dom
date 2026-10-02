import {OWNER_ELEMENT, VALUE, splitOnASCIIWhitespace} from './constants.ts';
import {createDOMException} from './dom-exception.ts';
import {toPropertyIndex} from './shared.ts';
import type {Element} from './Element.ts';

function validateTokens(token: string, otherToken?: string) {
  if (token === '' || otherToken === '') {
    throw createDOMException(
      'The token provided must not be empty.',
      'SyntaxError',
    );
  }

  if (
    /[\t\n\f\r ]/.test(token) ||
    (otherToken !== undefined && /[\t\n\f\r ]/.test(otherToken))
  ) {
    throw createDOMException(
      'The token provided contains ASCII whitespace, which is not valid in tokens.',
      'InvalidCharacterError',
    );
  }
}

function normalizeTokens(tokens: string[]) {
  // Convert every argument before validation so conversion side effects and
  // errors still occur when an earlier token is invalid.
  for (let index = 0; index < tokens.length; index++) {
    tokens[index] = String(tokens[index]);
  }

  for (const token of tokens) {
    validateTokens(token);
  }

  return tokens;
}

export class DOMTokenList {
  readonly [index: number]: string;
  [OWNER_ELEMENT]: Element;
  #cachedRawValue?: string;
  #cachedTokens: readonly string[] = [];

  constructor(element: Element) {
    this[OWNER_ELEMENT] = element;
  }

  get [VALUE](): readonly string[] {
    const rawValue = this[OWNER_ELEMENT].className;

    if (rawValue !== this.#cachedRawValue) {
      this.#cachedTokens = [...new Set(splitOnASCIIWhitespace(rawValue))];
      this.#cachedRawValue = rawValue;
    }

    return this.#cachedTokens;
  }

  get length() {
    return this[VALUE].length;
  }

  get value() {
    return this[OWNER_ELEMENT].className;
  }

  set value(value: string) {
    this[OWNER_ELEMENT].className = String(value);
  }

  #setTokens(tokens: readonly string[]) {
    const rawValue = tokens.join(' ');
    // Seed before writing so synchronous hooks can reuse the parsed result.
    // Reads still check the actual raw value after failed or reentrant writes.
    this.#cachedRawValue = rawValue;
    this.#cachedTokens = tokens;
    this.value = rawValue;
  }

  item(index: number) {
    return this[VALUE][index] ?? null;
  }

  contains(token: string) {
    return this[VALUE].includes(String(token));
  }

  add(...tokens: string[]) {
    const normalizedTokens = normalizeTokens(tokens);
    const currentTokens = this[VALUE];

    if (normalizedTokens.length === 0) {
      this.#setTokens(currentTokens);
      return;
    }

    if (normalizedTokens.length === 1) {
      const token = normalizedTokens[0]!;
      this.#setTokens(
        currentTokens.includes(token)
          ? currentTokens
          : [...currentTokens, token],
      );
      return;
    }

    const nextTokens = new Set(currentTokens);
    for (const token of normalizedTokens) nextTokens.add(token);

    this.#setTokens(
      nextTokens.size === currentTokens.length
        ? currentTokens
        : [...nextTokens],
    );
  }

  remove(...tokens: string[]) {
    const normalizedTokens = normalizeTokens(tokens);
    if (!this[OWNER_ELEMENT].hasAttribute('class')) return;

    const currentTokens = this[VALUE];
    if (normalizedTokens.length === 0 || currentTokens.length === 0) {
      this.#setTokens(currentTokens);
      return;
    }

    if (normalizedTokens.length === 1) {
      const index = currentTokens.indexOf(normalizedTokens[0]!);
      this.#setTokens(
        index < 0
          ? currentTokens
          : currentTokens.filter((_, tokenIndex) => tokenIndex !== index),
      );
      return;
    }

    const removedTokens = new Set(normalizedTokens);
    const nextTokens: string[] = [];
    for (const token of currentTokens) {
      if (!removedTokens.has(token)) nextTokens.push(token);
    }
    this.#setTokens(
      nextTokens.length === currentTokens.length ? currentTokens : nextTokens,
    );
  }

  toggle(token: string, force?: boolean) {
    const normalizedToken = String(token);
    validateTokens(normalizedToken);
    const tokens = this[VALUE];
    const index = tokens.indexOf(normalizedToken);
    const present = index >= 0;
    const next = force === undefined ? !present : Boolean(force);

    if (next !== present) {
      this.#setTokens(
        next
          ? [...tokens, normalizedToken]
          : tokens.filter((_, tokenIndex) => tokenIndex !== index),
      );
    }

    return next;
  }

  replace(token: string, newToken: string) {
    const normalizedToken = String(token);
    const normalizedNewToken = String(newToken);
    validateTokens(normalizedToken, normalizedNewToken);
    const tokens = this[VALUE];
    const index = tokens.indexOf(normalizedToken);
    if (index < 0) return false;

    if (normalizedToken === normalizedNewToken) {
      this.#setTokens(tokens);
      return true;
    }

    const nextTokens: string[] = [];
    let seenReplacement = false;
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
      const candidate =
        tokenIndex === index ? normalizedNewToken : tokens[tokenIndex]!;
      if (candidate === normalizedNewToken) {
        if (seenReplacement) continue;
        seenReplacement = true;
      }
      nextTokens.push(candidate);
    }

    this.#setTokens(nextTokens);
    return true;
  }

  toString() {
    return this.value;
  }

  [Symbol.iterator]() {
    return this[VALUE][Symbol.iterator]();
  }
}

Object.setPrototypeOf(
  DOMTokenList.prototype,
  new Proxy(
    {},
    {
      get(target, name, receiver) {
        const index = toPropertyIndex(name);
        return index !== undefined
          ? (receiver as DOMTokenList)[VALUE][index]
          : Reflect.get(target, name, receiver);
      },
      set(target, name, value, receiver) {
        return (
          toPropertyIndex(name) !== undefined ||
          Reflect.set(target, name, value, receiver)
        );
      },
    },
  ),
);
