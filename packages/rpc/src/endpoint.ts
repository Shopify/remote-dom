import {createBasicEncoder} from './encoding';
import type {
  MessageEndpoint,
  RemoteCallable,
  EncodingStrategy,
  EncodingStrategyApi,
} from './types';
import {StackFrame} from './memory';
import type {Retainer} from './memory';

export const CALL = 0;
export const RESULT = 1;
export const TERMINATE = 2;
export const RELEASE = 3;
export const FUNCTION_APPLY = 5;
export const FUNCTION_RESULT = 6;

type AnyFunction = (...args: any[]) => any;

interface MessageMap {
  [CALL]: [string, string | number, any];
  [RESULT]: [string, Error?, any?];
  [TERMINATE]: void;
  [RELEASE]: [string];
  [FUNCTION_APPLY]: [string, string, any];
  [FUNCTION_RESULT]: [string, Error?, any?];
}

type MessageData = {
  [K in keyof MessageMap]: [K, MessageMap[K]];
}[keyof MessageMap];

export interface CreateEndpointOptions<T = unknown> {
  uuid?(): string;
  createEncoder?(api: EncodingStrategyApi): EncodingStrategy;
  callable?: (keyof T)[];
}

export interface Endpoint<T> {
  readonly call: RemoteCallable<T>;
  replace(messenger: MessageEndpoint): void;
  expose(api: Record<string, AnyFunction | undefined>): void;
  callable(...methods: string[]): void;
  terminate(): void;
}

export class MissingResolverError extends Error {
  readonly callId: string;
  readonly error?: Error;
  readonly result?: unknown;
  readonly groupingHash: string = 'RemoteUI::MissingResolverError';

  constructor(message: {callId: string; error?: Error; result?: unknown}) {
    const {callId, error, result} = message;

    const errorMessage = error ? ` Error: ${String(error)}` : '';
    const resultMessage =
      result == null ? '' : ` Result: ${JSON.stringify(result)}`;

    super(
      `No resolver found for call ID: ${callId}${errorMessage}${resultMessage}`,
    );

    this.name = 'MissingResolverError';
    this.callId = callId;
    this.error = error;
    this.result = result;
  }
}

/**
 * An endpoint wraps around a messenger, acting as the intermediary for all
 * messages both send from, and received by, that messenger. The endpoint sends
 * all messages as arrays, where the first element is the message type, and the
 * second is the arguments for that message (as an array). For messages that send
 * meaningful content across the wire (e.g., arguments to function calls, return
 * results), the endpoint first encodes these values.
 *
 * Encoding is done using a CBOR-like encoding scheme. The value is encoded into
 * an array buffer, and is paired with an additional array buffer that contains all
 * the strings used in that message (in the encoded value, strings are encoded as
 * their index in the "strings" encoding to reduce the cost of heavily-duplicated
 * strings, which is more likely in payloads containing UI). This encoding also takes
 * care of encoding functions: it uses a "tagged" item in CBOR to represent a
 * function as a string ID, which the opposite endpoint will be capable of turning
 * into a consistent, memory-manageable function proxy.
 *
 * The main CBOR encoding is entirely take from the [cbor.js package](https://github.com/paroga/cbor-js).
 * The special behavior for encoding strings and functions was then added in to the
 * encoder and decoder. For additional details on CBOR:
 *
 * @see https://tools.ietf.org/html/rfc7049
 */
export function createEndpoint<T>(
  initialMessenger: MessageEndpoint,
  {
    uuid = defaultUuid,
    createEncoder = createBasicEncoder,
    callable,
  }: CreateEndpointOptions<T> = {},
): Endpoint<T> {
  let terminated = false;
  let messenger = initialMessenger;

  const activeApi = new Map<string | number, AnyFunction>();
  const callIdsToResolver = new Map<
    string,
    (
      ...args: MessageMap[typeof FUNCTION_RESULT] | MessageMap[typeof RESULT]
    ) => void
  >();

  const call = createCallable<T>(handlerForCall, callable);

  const encoder = createEncoder({
    uuid,
    release(id) {
      send(RELEASE, [id]);
    },
    call(id, args, retainedBy) {
      const callId = uuid();
      const done = waitForResult(callId, retainedBy);
      const [encoded, transferables] = encoder.encode(args);

      send(FUNCTION_APPLY, [callId, id, encoded], transferables);

      return done;
    },
  });

  messenger.addEventListener('message', listener);

  return {
    call,
    replace(newMessenger) {
      const oldMessenger = messenger;
      messenger = newMessenger;

      oldMessenger.removeEventListener('message', listener);
      newMessenger.addEventListener('message', listener);
    },
    expose(api) {
      for (const key of Object.keys(api)) {
        const value = api[key];

        if (typeof value === 'function') {
          activeApi.set(key, value);
        } else {
          activeApi.delete(key);
        }
      }
    },
    callable(...newCallable) {
      // If no callable methods are supplied initially, we use a Proxy instead,
      // so all methods end up being treated as callable by default.
      if (callable == null) return;

      for (const method of newCallable) {
        Object.defineProperty(call, method, {
          value: handlerForCall(method),
          writable: false,
          configurable: true,
          enumerable: true,
        });
      }
    },
    terminate() {
      send(TERMINATE, undefined);

      terminate();

      if (messenger.terminate) {
        messenger.terminate();
      }
    },
  };

  function send<Type extends keyof MessageMap>(
    type: Type,
    args: MessageMap[Type],
    transferables?: Transferable[],
  ) {
    if (terminated) {
      return;
    }

    messenger.postMessage(args ? [type, args] : [type], transferables);
  }

  async function listener(event: MessageEvent) {
    if (terminated) {
      return;
    }

    const {data} = event;

    if (!isMessageData(data)) {
      return;
    }

    switch (data[0]) {
      case TERMINATE: {
        terminate();
        break;
      }
      case CALL: {
        const stackFrame = new StackFrame();
        const [id, property, args] = data[1];
        const func = activeApi.get(property);

        try {
          if (func == null) {
            throw new Error(
              `No '${property}' method is exposed on this endpoint`,
            );
          }

          const [encoded, transferables] = encoder.encode(
            await func(...(encoder.decode(args, [stackFrame]) as any[])),
          );

          send(RESULT, [id, undefined, encoded], transferables);
        } catch (error) {
          const {name, message, stack} = error as Error;
          send(RESULT, [id, {name, message, stack}]);
          throw error;
        } finally {
          stackFrame.release();
        }

        break;
      }
      case RESULT: {
        const [callId, error, result] = data[1];
        const resolver = callIdsToResolver.get(callId);

        if (resolver == null) {
          throw new MissingResolverError({
            callId,
            error,
            result,
          });
        }

        resolver(...data[1]);
        callIdsToResolver.delete(callId);
        break;
      }
      case RELEASE: {
        const [id] = data[1];
        encoder.release(id);
        break;
      }
      case FUNCTION_RESULT: {
        const [callId, error, result] = data[1];
        const resolver = callIdsToResolver.get(callId);

        if (resolver == null) {
          throw new MissingResolverError({
            callId,
            error,
            result,
          });
        }

        resolver(...data[1]);
        callIdsToResolver.delete(callId);
        break;
      }
      case FUNCTION_APPLY: {
        const [callId, funcId, args] = data[1];

        try {
          const result = await encoder.call(funcId, args);
          const [encoded, transferables] = encoder.encode(result);
          send(FUNCTION_RESULT, [callId, undefined, encoded], transferables);
        } catch (error) {
          const {name, message, stack} = error as Error;
          send(FUNCTION_RESULT, [callId, {name, message, stack}]);
          throw error;
        }

        break;
      }
    }
  }

  function handlerForCall(property: string | number | symbol) {
    return (...args: any[]) => {
      if (terminated) {
        return Promise.reject(
          new Error(
            'You attempted to call a function on a terminated web worker.',
          ),
        );
      }

      if (typeof property !== 'string' && typeof property !== 'number') {
        return Promise.reject(
          new Error(
            `Can’t call a symbol method on a remote endpoint: ${property.toString()}`,
          ),
        );
      }

      const id = uuid();
      const done = waitForResult(id);
      const [encoded, transferables] = encoder.encode(args);

      send(CALL, [id, property, encoded], transferables);

      return done;
    };
  }

  function waitForResult(id: string, retainedBy?: Iterable<Retainer>) {
    return new Promise<any>((resolve, reject) => {
      callIdsToResolver.set(id, (_, errorResult, value) => {
        if (errorResult == null) {
          resolve(value && encoder.decode(value, retainedBy));
        } else {
          const error = new Error();
          Object.assign(error, errorResult);
          reject(error);
        }
      });
    });
  }

  function terminate() {
    terminated = true;
    activeApi.clear();
    callIdsToResolver.clear();
    encoder.terminate?.();
    messenger.removeEventListener('message', listener);
  }
}

function defaultUuid() {
  return `${uuidSegment()}-${uuidSegment()}-${uuidSegment()}-${uuidSegment()}`;
}

function uuidSegment() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

function createCallable<T>(
  handlerForCall: (
    property: string | number | symbol,
  ) => AnyFunction | undefined,
  callable?: (keyof T)[],
): RemoteCallable<T> {
  let call: any;

  if (callable == null) {
    if (typeof Proxy !== 'function') {
      throw new Error(
        `You must pass an array of callable methods in environments without Proxies.`,
      );
    }

    const cache = new Map<string | number | symbol, AnyFunction | undefined>();

    call = new Proxy(
      {},
      {
        get(_target, property) {
          if (cache.has(property)) {
            return cache.get(property);
          }

          const handler = handlerForCall(property);
          cache.set(property, handler);
          return handler;
        },
      },
    );
  } else {
    call = {};

    for (const method of callable) {
      Object.defineProperty(call, method, {
        value: handlerForCall(method),
        writable: false,
        configurable: true,
        enumerable: true,
      });
    }
  }

  return call;
}

function isMessageData(value: unknown): value is MessageData {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    (value[1] == null || Array.isArray(value[1]))
  );
}
