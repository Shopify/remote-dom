import {
  normalizeRemoteText,
  assertSafeRemoteProp,
  assertSafeRemoteProps,
  assertRemotePropName,
  assertRemoteComponentType,
} from '../validation';

/**
 * Objects shaped like a Preact virtual node. `constructor: undefined` as an
 * own property survives structured cloning and the RPC encoder.
 */
function preactVNode() {
  return {
    constructor: undefined,
    type: 'div',
    props: {dangerouslySetInnerHTML: {__html: '<b>x</b>'}},
    __b: 1,
  };
}

function nullPrototypeObject() {
  const object = Object.create(null);
  Object.assign(object, {type: 'div', props: {}, __b: 1});
  return object;
}

function vueVNode() {
  return {__v_isVNode: true, type: 'div', props: {innerHTML: '<b>x</b>'}};
}

describe('normalizeRemoteText()', () => {
  it('keeps strings', () => {
    expect(normalizeRemoteText('hi')).toBe('hi');
  });

  it('coerces primitives', () => {
    expect(normalizeRemoteText(1)).toBe('1');
    expect(normalizeRemoteText(true)).toBe('true');
  });

  it('turns nullish values into an empty string', () => {
    expect(normalizeRemoteText(null)).toBe('');
    expect(normalizeRemoteText(undefined)).toBe('');
  });

  it('describes objects without invoking their methods', () => {
    const toString = jest.fn(() => 'from remote');
    const valueOf = jest.fn(() => 'from remote');

    expect(normalizeRemoteText({toString, valueOf})).toBe('[object Object]');
    expect(normalizeRemoteText(preactVNode())).toBe('[object Object]');
    expect(normalizeRemoteText(nullPrototypeObject())).toBe('[object Object]');
    expect(normalizeRemoteText([1, 2])).toBe('[object Array]');
    expect(normalizeRemoteText(() => {})).toBe('[object Function]');

    expect(toString).not.toHaveBeenCalled();
    expect(valueOf).not.toHaveBeenCalled();
  });
});

describe('assertSafeRemoteProp()', () => {
  it('accepts ordinary data', () => {
    expect(() =>
      assertSafeRemoteProp({
        number: 1,
        string: 'two',
        list: [1, {empty: null}],
        map: new Map([['key', {flag: true}]]),
        set: new Set([1]),
        callback: () => {},
        date: new Date(),
      }),
    ).not.toThrow(/not allowed/);
  });

  it('accepts cyclic data', () => {
    const cyclic: any = {items: []};
    cyclic.items.push(cyclic);
    cyclic.self = cyclic;
    expect(() => assertSafeRemoteProp(cyclic)).not.toThrow(/not allowed/);
  });

  it('rejects an object with an own undefined constructor', () => {
    expect(() => assertSafeRemoteProp(preactVNode())).toThrow(/masquerades/);
  });

  it('rejects an object with a null prototype', () => {
    expect(() => assertSafeRemoteProp(nullPrototypeObject())).toThrow(
      /masquerades/,
    );
  });

  it('rejects an object flagged as a Vue virtual node', () => {
    expect(() => assertSafeRemoteProp(vueVNode())).toThrow(/masquerades/);
  });

  it('rejects a framework node shape anywhere in the value', () => {
    expect(() => assertSafeRemoteProp({items: ['ok', preactVNode()]})).toThrow(
      /not allowed/,
    );
    expect(() =>
      assertSafeRemoteProp({deep: {deeper: nullPrototypeObject()}}),
    ).toThrow(/not allowed/);
    expect(() => assertSafeRemoteProp(new Map([['k', vueVNode()]]))).toThrow(
      /not allowed/,
    );
    expect(() => assertSafeRemoteProp(new Set([preactVNode()]))).toThrow(
      /not allowed/,
    );
  });

  it('rejects a framework node shape hidden behind a redirected prototype', () => {
    const container = Object.create({});
    container.items = [preactVNode()];
    expect(() => assertSafeRemoteProp(container)).toThrow(/not allowed/);
  });

  it('rejects an object whose prototype chain hides the constructor', () => {
    const value = Object.create({constructor: undefined});
    value.type = 'div';
    expect(() => assertSafeRemoteProp(value)).toThrow(/not allowed/);
  });
});

describe('assertSafeRemoteProps()', () => {
  it('accepts nullish and ordinary records', () => {
    expect(() => assertSafeRemoteProps(undefined)).not.toThrow(/not allowed/);
    expect(() => assertSafeRemoteProps({count: 1, onPress() {}})).not.toThrow(
      /not allowed/,
    );
  });

  it('rejects non-object records and bad names or values', () => {
    expect(() => assertSafeRemoteProps('nope')).toThrow(/must be an object/);
    expect(() => assertSafeRemoteProps({heading: preactVNode()})).toThrow(
      /not allowed/,
    );
    expect(() =>
      assertSafeRemoteProps(JSON.parse('{"__proto__": {"polluted": 1}}')),
    ).toThrow(/name is not allowed/);
  });
});

describe('assertRemotePropName()', () => {
  it('rejects __proto__ and non-strings', () => {
    expect(() => assertRemotePropName('__proto__')).toThrow(/not allowed/);
    expect(() => assertRemotePropName(1)).toThrow(/not allowed/);
    expect(() => assertRemotePropName('fine')).not.toThrow(/not allowed/);
  });
});

describe('assertRemoteComponentType()', () => {
  it('requires a string', () => {
    expect(() => assertRemoteComponentType('Banner')).not.toThrow(
      /not allowed/,
    );
    expect(() => assertRemoteComponentType({})).toThrow(/component type/);
  });
});
