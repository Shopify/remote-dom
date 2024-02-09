import {
  RETAINED_BY,
  RETAIN_METHOD,
  RELEASE_METHOD,
  EncodingStrategy,
  EncodingStrategyApi,
} from '../types';
import type {Retainer} from '../memory';
import {StackFrame, isBasicObject, isMemoryManageable} from '../memory';

type AnyFunction = (...args: any[]) => any;

const FUNCTION = '_@f';

export function createBasicEncoder(api: EncodingStrategyApi): EncodingStrategy {
  const functionsToId = new Map<AnyFunction, string>();
  const idsToFunction = new Map<string, AnyFunction>();
  const idsToProxy = new Map<string, AnyFunction>();

  return {
    encode,
    decode,
    async call(id, args) {
      const stackFrame = new StackFrame();
      const func = idsToFunction.get(id);

      if (func == null) {
        throw new Error(
          'You attempted to call a function that was already released.',
        );
      }

      try {
        const retainedBy = isMemoryManageable(func)
          ? [stackFrame, ...func[RETAINED_BY]]
          : [stackFrame];

        const result = await func(...(decode(args, retainedBy) as any[]));

        return result;
      } finally {
        stackFrame.release();
      }
    },
    release(id) {
      const func = idsToFunction.get(id);

      if (func) {
        idsToFunction.delete(id);
        functionsToId.delete(func);
      }
    },
    terminate() {
      functionsToId.clear();
      idsToFunction.clear();
      idsToProxy.clear();
    },
  };

  type EncodeResult = [any, Transferable[]?];

  function encode(
    value: unknown,
    seen = new Map<any, EncodeResult>(),
  ): EncodeResult {
    if (value == null) {
      return [value];
    }

    const seenValue = seen.get(value);

    if (seenValue) {
      return seenValue;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        seen.set(value, [undefined]);

        const transferables: Transferable[] = [];
        const result = value.map((item) => {
          const [result, nestedTransferables = []] = encode(item, seen);
          transferables.push(...nestedTransferables);
          return result;
        });

        const fullResult: EncodeResult = [result, transferables];

        seen.set(value, fullResult);

        return fullResult;
      }

      if (isBasicObject(value)) {
        seen.set(value, [undefined]);

        const transferables: Transferable[] = [];
        const result = Object.keys(value).reduce((object, key) => {
          const [result, nestedTransferables = []] = encode(
            (value as any)[key],
            seen,
          );
          transferables.push(...nestedTransferables);
          return {...object, [key]: result};
        }, {});

        const fullResult: EncodeResult = [result, transferables];

        seen.set(value, fullResult);

        return fullResult;
      }
    }

    if (typeof value === 'function') {
      if (functionsToId.has(value as AnyFunction)) {
        const id = functionsToId.get(value as AnyFunction)!;
        const result: EncodeResult = [{[FUNCTION]: id}];
        seen.set(value, result);

        return result;
      }

      const id = api.uuid();

      functionsToId.set(value as AnyFunction, id);
      idsToFunction.set(id, value as AnyFunction);

      const result: EncodeResult = [{[FUNCTION]: id}];
      seen.set(value, result);

      return result;
    }

    const result: EncodeResult = [value];
    seen.set(value, result);

    return result;
  }

  function decode(value: unknown, retainedBy?: Iterable<Retainer>): any {
    if (typeof value === 'object') {
      if (value == null) {
        return value as any;
      }

      if (Array.isArray(value)) {
        return value.map((value) => decode(value, retainedBy));
      }

      if (FUNCTION in value) {
        const id = (value as {[FUNCTION]: string})[FUNCTION];

        if (idsToProxy.has(id)) {
          return idsToProxy.get(id)! as any;
        }

        let retainCount = 0;
        let released = false;

        const release = () => {
          retainCount -= 1;

          if (retainCount === 0) {
            released = true;
            idsToProxy.delete(id);
            api.release(id);
          }
        };

        const retain = () => {
          retainCount += 1;
        };

        const retainers = new Set(retainedBy);

        const proxy = (...args: any[]) => {
          if (released) {
            throw new Error(
              'You attempted to call a function that was already released.',
            );
          }

          if (!idsToProxy.has(id)) {
            throw new Error(
              'You attempted to call a function that was already revoked.',
            );
          }

          return api.call(id, args);
        };

        Object.defineProperties(proxy, {
          [RELEASE_METHOD]: {value: release, writable: false},
          [RETAIN_METHOD]: {value: retain, writable: false},
          [RETAINED_BY]: {value: retainers, writable: false},
        });

        for (const retainer of retainers) {
          retainer.add(proxy as any);
        }

        idsToProxy.set(id, proxy);

        return proxy as any;
      }

      if (isBasicObject(value)) {
        return Object.keys(value).reduce(
          (object, key) => ({
            ...object,
            [key]: decode((value as any)[key], retainedBy),
          }),
          {},
        ) as any;
      }
    }

    return value as any;
  }
}
