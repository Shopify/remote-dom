import {
  RETAINED_BY,
  RETAIN_METHOD,
  RELEASE_METHOD,
  EncodingStrategy,
  EncodingStrategyApi,
} from '../types';
import type {Retainer} from '../memory';
import {StackFrame, isMemoryManageable} from '../memory';

const FUNCTION = '_@f';

export function createBasicEncoder(api: EncodingStrategyApi): EncodingStrategy {
  const functionsToId = new Map<Function, string>();
  const idsToFunction = new Map<string, Function>();
  const idsToProxy = new Map<string, Function>();

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

  function encode(value: unknown): [any, Transferable[]?] {
    if (typeof value === 'object') {
      if (value == null) {
        return [value];
      }

      const transferables: Transferable[] = [];

      if (Array.isArray(value)) {
        const result = value.map((item) => {
          const [result, nestedTransferables = []] = encode(item);
          transferables.push(...nestedTransferables);
          return result;
        });

        return [result, transferables];
      }

      const result = Object.keys(value).reduce((object, key) => {
        const [result, nestedTransferables = []] = encode((value as any)[key]);
        transferables.push(...nestedTransferables);
        return {...object, [key]: result};
      }, {});

      return [result, transferables];
    }

    if (typeof value === 'function') {
      if (functionsToId.has(value)) {
        const id = functionsToId.get(value)!;
        return [{[FUNCTION]: id}];
      }

      const id = api.uuid();

      functionsToId.set(value, id);
      idsToFunction.set(id, value);

      return [{[FUNCTION]: id}];
    }

    return [value];
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

      return Object.keys(value).reduce(
        (object, key) => ({
          ...object,
          [key]: decode((value as any)[key], retainedBy),
        }),
        {},
      ) as any;
    }

    return value as any;
  }
}
