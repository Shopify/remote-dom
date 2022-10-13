/* eslint-disable guard-for-in */
import type {AbstractChannel} from '../protocol';

import {PROPERTIES, CHANNEL, OWNER_ELEMENT, ID} from './constants';
import type {Element} from './Element';

type StyleProto = StyleProtoConstructor;

interface StyleProtoConstructor {
  new (): StyleProto;
}

const dashed = (str: string) =>
  str.replace(/([A-Z]|^(webkit|moz|o|ms)[A-Z])/g, '-$1').toLowerCase();

const StyleProto: StyleProtoConstructor = function () {} as any;
StyleProto.prototype = Object.create(
  new Proxy(
    {},
    {
      set(target, property, value, receiver) {
        if (
          typeof property !== 'string' ||
          property in CSSStyleDeclaration.prototype
        )
          return Reflect.set(target, property, value, receiver);
        receiver.setProperty(dashed(property), value);
        return true;
      },
      get(target, property, receiver) {
        if (
          typeof property !== 'string' ||
          property in CSSStyleDeclaration.prototype
        )
          return Reflect.get(target, property, receiver);
        return receiver[PROPERTIES][dashed(property)];
      },
    },
  ),
);

export class CSSStyleDeclaration extends StyleProto {
  [CHANNEL]!: AbstractChannel;
  [OWNER_ELEMENT]?: number;
  [PROPERTIES]!: Record<string, string | null | undefined>;
  constructor(owner: Element) {
    super();
    Object.defineProperty(this, CHANNEL, {value: owner && owner[CHANNEL]});
    Object.defineProperty(this, OWNER_ELEMENT, {value: owner && owner[ID]});
    Object.defineProperty(this, PROPERTIES, {writable: true, value: {}});
  }

  getPropertyValue(key: string): string | null | undefined {
    return this[PROPERTIES][key];
  }

  removeProperty(key: string) {
    this.setProperty(key, null);
  }

  setProperty(key: string, value?: string | null) {
    this[PROPERTIES][key] = value;
    const owner = this[OWNER_ELEMENT];
    if (owner !== undefined) {
      this[CHANNEL].setProperty(owner, 'style', this.cssText);
    }
  }

  get cssText() {
    let t = '';
    const properties = this[PROPERTIES];
    for (const prop in properties) {
      const value = properties[prop];
      if (value == null) continue;
      if (t) t += ' ';
      t += `${prop}: ${value};`;
    }
    return t;
  }

  set cssText(css) {
    const properties: Record<string, string> = {};
    const tokenizer =
      /\s*([a-z-]+)\s*:\s*((?:[^;]*url\(.*?\)[^;]*|[^;]*)*)\s*(?:;|$)/gi;
    let token;
    while ((token = tokenizer.exec(css))) {
      let key = token[1];
      if (key[0] !== '-') key = key.toLowerCase();
      properties[key] = token[2];
    }
    this[PROPERTIES] = properties;
    const owner = this[OWNER_ELEMENT];
    if (owner !== undefined) {
      this[CHANNEL].setProperty(owner, 'style', this.cssText);
    }
  }
}
