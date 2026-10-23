import {createBasicEncoder} from '../encoding';
import {StackFrame} from '../memory';
import type {EncodingStrategyApi} from '../types';

const FUNCTION = '_@f';

describe('createBasicEncoder()', () => {
  it('encodes nested objects, arrays and primitives with the same shape', () => {
    const encoder = createBasicEncoder(createApi());
    const value = {
      string: 'value',
      number: 1,
      boolean: false,
      nil: null,
      missing: undefined,
      nested: {array: [1, {deep: 'yes'}, [2, 3]], empty: {}},
    };

    const [encoded, transferables] = encoder.encode(value);

    expect(encoded).toStrictEqual(value);
    expect(encoded).not.toBe(value);
    expect(transferables).toStrictEqual([]);
    expect(encoder.decode(encoded)).toStrictEqual(value);
  });

  it('preserves key order', () => {
    const encoder = createBasicEncoder(createApi());
    const value = {beta: 1, alpha: 2, 2: 'two', 1: 'one', gamma: 3};

    const [encoded] = encoder.encode(value);

    expect(Object.keys(encoded)).toStrictEqual(Object.keys(value));
    expect(Object.keys(encoder.decode(encoded) as object)).toStrictEqual(
      Object.keys(value),
    );
  });

  it('encodes functions as ids and decodes them as callable proxies', async () => {
    const api = createApi();
    const encoder = createBasicEncoder(api);
    const callback = jest.fn();

    const [encoded] = encoder.encode({callback, nested: {again: callback}});

    expect(encoded).toStrictEqual({
      callback: {[FUNCTION]: 'id-0'},
      nested: {again: {[FUNCTION]: 'id-0'}},
    });

    const decoded = encoder.decode(encoded) as {
      callback: (...args: unknown[]) => Promise<unknown>;
      nested: {again: unknown};
    };

    expect(decoded.nested.again).toBe(decoded.callback);
    expect(await decoded.callback('arg')).toBe('called');
    expect(api.call).toHaveBeenCalledWith('id-0', ['arg']);
  });

  it('retains decoded functions nested in objects with the given retainers', () => {
    const api = createApi();
    const encoder = createBasicEncoder(api);
    const stackFrame = new StackFrame();

    const [encoded] = encoder.encode({nested: {deeper: {callback: jest.fn()}}});
    encoder.decode(encoded, [stackFrame]);

    expect(api.release).not.toHaveBeenCalled();

    stackFrame.release();

    expect(api.release).toHaveBeenCalledWith('id-0');
  });

  it('encodes circular references as undefined', () => {
    const encoder = createBasicEncoder(createApi());
    const object: Record<string, unknown> = {name: 'object'};
    const array: unknown[] = ['array'];
    object.self = object;
    object.array = array;
    array.push(array, object);

    const [encoded] = encoder.encode(object);

    expect(encoded).toStrictEqual({
      name: 'object',
      self: undefined,
      array: ['array', undefined, undefined],
    });
  });

  it('keeps __proto__ and constructor as own keys without touching prototypes', () => {
    const encoder = createBasicEncoder(createApi());
    const value = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": "value", "nested": {"__proto__": "string"}}',
    );

    const [encoded] = encoder.encode(value);
    const decoded = encoder.decode(encoded) as Record<string, unknown>;

    for (const result of [encoded, decoded]) {
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(Object.keys(result)).toStrictEqual([
        '__proto__',
        'constructor',
        'nested',
      ]);
      expect(
        Object.getOwnPropertyDescriptor(result, '__proto__'),
      ).toStrictEqual({
        value: {polluted: true},
        enumerable: true,
        writable: true,
        configurable: true,
      });
      expect(result.constructor).toBe('value');
      expect(
        Object.getOwnPropertyDescriptor(result.nested, '__proto__')?.value,
      ).toBe('string');
      expect(result).not.toHaveProperty('polluted');
    }

    expect({}).not.toHaveProperty('polluted');
  });

  it.each(['get', 'set'])(
    'keeps working when Object.prototype.%s is defined',
    (property) => {
      const encoder = createBasicEncoder(createApi());
      const value = {nested: {key: 'value'}};
      let roundTrip: unknown;
      let error: unknown;

      // eslint-disable-next-line no-extend-native
      Object.defineProperty(Object.prototype, property, {
        value: undefined,
        configurable: true,
        writable: true,
      });

      try {
        roundTrip = encoder.decode(encoder.encode(value)[0]);
      } catch (caught) {
        error = caught;
      } finally {
        Reflect.deleteProperty(Object.prototype, property);
      }

      expect(error).toBeUndefined();
      expect(roundTrip).toStrictEqual(value);
    },
  );

  it('round-trips an object with thousands of keys in linear time', () => {
    const encoder = createBasicEncoder(createApi());
    const value = {items: createWideObject(5000)};

    const start = performance.now();
    const [encoded] = encoder.encode(value);
    const decoded = encoder.decode(encoded);
    const duration = performance.now() - start;

    expect(decoded).toStrictEqual(value);
    // The previous quadratic implementation takes about 4 s for this payload on a laptop.
    expect(duration).toBeLessThan(1000);
  });
});

function createApi(): jest.Mocked<EncodingStrategyApi> {
  let nextId = 0;

  return {
    uuid: jest.fn(() => `id-${nextId++}`),
    release: jest.fn(),
    call: jest.fn<
      ReturnType<EncodingStrategyApi['call']>,
      Parameters<EncodingStrategyApi['call']>
    >(() => Promise.resolve('called')),
  };
}

function createWideObject(keyCount: number): Record<string, string> {
  const object: Record<string, string> = {};

  for (let index = 0; index < keyCount; index++) {
    object[`key_${index}`] = `value_${index}_${'x'.repeat(50)}`;
  }

  return object;
}
