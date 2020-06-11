import type {MessageEndpoint, RemoteCallable} from './types';

import {
  StackFrame,
  isMemoryManageable,
  RETAINED_BY,
  RETAIN_METHOD,
  RELEASE_METHOD,
} from './memory';
import type {Retainer} from './memory';

type Encoded = [ArrayBuffer, ArrayBuffer];

const CALL = 0;
const RESULT = 1;
const TERMINATE = 2;
const RELEASE = 3;
const FUNCTION_APPLY = 5;
const FUNCTION_RESULT = 6;

interface MessageMap {
  [CALL]: [string, string, any];
  [RESULT]: [string, Error?, any?];
  [TERMINATE]: [];
  [RELEASE]: [string];
  [FUNCTION_APPLY]: [string, string, any];
  [FUNCTION_RESULT]: [string, Error?, any?];
}

interface Options<T = unknown> {
  uuid?(): string;
  callable?: (keyof T)[];
}

export interface Endpoint<T> {
  readonly call: RemoteCallable<T>;
  replace(messenger: MessageEndpoint): void;
  expose(api: {[key: string]: Function | undefined}): void;
  callable(methods: string[]): void;
  terminate(): void;
}

export function createEndpoint<T>(
  initialMessenger: MessageEndpoint,
  {uuid = defaultUuid, callable}: Options<T> = {},
): Endpoint<T> {
  let terminated = false;
  let messenger = initialMessenger;

  const activeApi = new Map<string, Function>();

  const functionsToId = new Map<Function, string>();
  const idsToFunction = new Map<string, Function>();
  const idsToProxy = new Map<string, Function>();
  const callIdsToResolver = new Map<
    string,
    (
      ...args: MessageMap[typeof FUNCTION_RESULT] | MessageMap[typeof RESULT]
    ) => void
  >();

  let call: any;

  if (callable == null) {
    if (typeof Proxy !== 'function') {
      throw new Error(
        `You must pass an array of callable methods in environments without Proxies.`,
      );
    }

    const cache = new Map<string | number | symbol, Function>();

    call = new Proxy(
      {},
      {
        get(_target, property) {
          const cached = cache.get(property);

          if (cached != null) {
            return cached;
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
    callable(newCallable) {
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
      terminate();

      if (messenger.terminate) {
        messenger.terminate();
      } else {
        send(TERMINATE, []);
      }
    },
  };

  function send<Type extends keyof MessageMap>(
    type: Type,
    args: MessageMap[Type],
    transferables?: Transferable[],
  ) {
    messenger.postMessage([type, args], transferables);
  }

  function encode(value: unknown): [any, Transferable[]?] {
    if (typeof value !== 'object') {
      return [value];
    }

    const strings: string[] = [];
    const stringsToIndex = new Map<string, number>();

    const encodedValue = encodeWithEnvironment(value, {
      store(value) {
        if (typeof value === 'function') {
          const currentId = functionsToId.get(value);
          if (currentId != null) return storeString(currentId);

          const id = uuid();
          functionsToId.set(value, id);
          idsToFunction.set(id, value);
          return storeString(id);
        } else {
          return storeString(value);
        }
      },
    });

    const encodedStrings = encodeWithEnvironment(strings);

    const encoded = [encodedValue, encodedStrings];
    return [encoded, encoded];

    function storeString(value: string) {
      const currentIndex = stringsToIndex.get(value);
      if (currentIndex != null) return currentIndex;

      const index = strings.length;
      strings.push(value);
      stringsToIndex.set(value, index);
      return index;
    }
  }

  function decode(encoded: unknown, retainedBy?: Iterable<Retainer>) {
    if (
      !Array.isArray(encoded) ||
      !(encoded[0] instanceof ArrayBuffer) ||
      !(encoded[1] instanceof ArrayBuffer)
    ) {
      return encoded;
    }

    const [encodedData, encodedStrings] = encoded as Encoded;

    const strings = decodeWithEnvironment(encodedStrings) as string[];

    const data = decodeWithEnvironment(encodedData, {
      getString: (index) => strings[index],
      getFunction(idIndex) {
        const id = strings[idIndex];

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
            send(RELEASE, [id]);
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

          const callId = uuid();
          const done = waitForResult(callId, retainedBy);
          const [encoded, transferables] = encode(args);

          send(FUNCTION_APPLY, [callId, id, encoded], transferables);

          return done;
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
      },
    });

    return data;
  }

  async function listener(event: MessageEvent) {
    const {data} = event;

    if (data == null || !Array.isArray(data)) {
      return;
    }

    switch (data[0]) {
      case TERMINATE: {
        terminate();
        break;
      }
      case CALL: {
        const stackFrame = new StackFrame();
        const [id, property, args] = data[1] as MessageMap[typeof CALL];
        const func = activeApi.get(property);

        try {
          if (func == null) {
            throw new Error(
              `No '${property}' method is exposed on this endpoint`,
            );
          }

          const [encoded, transferables] = encode(
            await func(...(decode(args, [stackFrame]) as any[])),
          );

          send(RESULT, [id, undefined, encoded], transferables);
        } catch (error) {
          const {name, message, stack} = error;
          send(RESULT, [id, {name, message, stack}]);
        } finally {
          stackFrame.release();
        }

        break;
      }
      case RESULT: {
        const [callId] = data[1] as MessageMap[typeof RESULT];

        callIdsToResolver.get(callId)!(
          ...(data[1] as MessageMap[typeof RESULT]),
        );
        callIdsToResolver.delete(callId);
        break;
      }
      case RELEASE: {
        const [id] = data[1] as MessageMap[typeof RELEASE];
        const func = idsToFunction.get(id);

        if (func) {
          idsToFunction.delete(id);
          functionsToId.delete(func);
        }

        break;
      }
      case FUNCTION_RESULT: {
        const [callId] = data[1] as MessageMap[typeof FUNCTION_RESULT];

        callIdsToResolver.get(callId)!(
          ...(data[1] as MessageMap[typeof FUNCTION_RESULT]),
        );
        callIdsToResolver.delete(callId);
        break;
      }
      case FUNCTION_APPLY: {
        const stackFrame = new StackFrame();
        const [
          callId,
          funcId,
          args,
        ] = data[1] as MessageMap[typeof FUNCTION_APPLY];

        const func = idsToFunction.get(funcId);

        if (func == null) {
          const {name, message, stack} = new Error(
            'You attempted to call a function that was already released.',
          );
          send(FUNCTION_RESULT, [callId, {name, message, stack}]);
          return;
        }

        try {
          const retainedBy = isMemoryManageable(func)
            ? [stackFrame, ...func[RETAINED_BY]]
            : [stackFrame];

          const [encoded, transferables] = encode(
            await func(...(decode(args, retainedBy) as any[])),
          );

          send(FUNCTION_RESULT, [callId, undefined, encoded], transferables);
        } catch (error) {
          const {name, message, stack} = error;
          send(FUNCTION_RESULT, [callId, {name, message, stack}]);
        } finally {
          stackFrame.release();
        }

        break;
      }
    }
  }

  function handlerForCall(property: string | number | symbol) {
    return (...args: any[]) => {
      if (terminated) {
        throw new Error(
          'You attempted to call a function on a terminated web worker.',
        );
      }

      const id = uuid();
      const done = waitForResult(id);
      const [encoded, transferables] = encode(args);

      send(CALL, [id, property as string, encoded], transferables);

      return done;
    };
  }

  function waitForResult(id: string, retainedBy?: Iterable<Retainer>) {
    return new Promise<any>((resolve, reject) => {
      callIdsToResolver.set(id, (_, errorResult, value) => {
        if (errorResult == null) {
          resolve(value && decode(value, retainedBy));
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
    functionsToId.clear();
    idsToFunction.clear();
    idsToProxy.clear();
    callIdsToResolver.clear();
    messenger.removeEventListener('message', listener);
  }
}

function defaultUuid() {
  return `${uuidSegment()}-${uuidSegment()}-${uuidSegment()}-${uuidSegment()}`;
}

function uuidSegment() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

const POW_2_24 = 5.960464477539063e-8;
const POW_2_32 = 4294967296;
const POW_2_53 = 9007199254740992;

interface EncodeEnvironment {
  store(value: string | Function): number;
}

function encodeWithEnvironment(value: unknown, env?: EncodeEnvironment) {
  let data = new ArrayBuffer(256);
  let dataView = new DataView(data);
  let lastLength: number;
  let offset = 0;

  function prepareWrite(length: number) {
    let newByteLength = data.byteLength;
    const requiredLength = offset + length;

    while (newByteLength < requiredLength) newByteLength <<= 1;

    if (newByteLength !== data.byteLength) {
      const oldDataView = dataView;

      data = new ArrayBuffer(newByteLength);
      dataView = new DataView(data);

      const uint32count = (offset + 3) >> 2;

      for (let i = 0; i < uint32count; ++i)
        dataView.setUint32(i << 2, oldDataView.getUint32(i << 2));
    }

    lastLength = length;
    return dataView;
  }

  function commitWrite() {
    offset += lastLength;
  }

  function writeFloat64(value: number) {
    prepareWrite(8).setFloat64(offset, value);
    commitWrite();
  }

  function writeUint8(value: number) {
    prepareWrite(1).setUint8(offset, value);
    commitWrite();
  }

  function writeUint16(value: number) {
    prepareWrite(2).setUint16(offset, value);
    commitWrite();
  }

  function writeUint32(value: number) {
    prepareWrite(4).setUint32(offset, value);
    commitWrite();
  }

  function writeUint64(value: number) {
    const low = value % POW_2_32;
    const high = (value - low) / POW_2_32;
    const dataView = prepareWrite(8);
    dataView.setUint32(offset, high);
    dataView.setUint32(offset + 4, low);
    commitWrite();
  }

  function writeUint8Array(value: number[] | Uint8Array) {
    const dataView = prepareWrite(value.length);

    for (let i = 0; i < value.length; ++i)
      dataView.setUint8(offset + i, value[i]);

    commitWrite();
  }

  function writeTypeAndLength(type: number, length: number) {
    if (length < 24) {
      writeUint8((type << 5) | length);
    } else if (length < 0x100) {
      writeUint8((type << 5) | 24);
      writeUint8(length);
    } else if (length < 0x10000) {
      writeUint8((type << 5) | 25);
      writeUint16(length);
    } else if (length < 0x100000000) {
      writeUint8((type << 5) | 26);
      writeUint32(length);
    } else {
      writeUint8((type << 5) | 27);
      writeUint64(length);
    }
  }

  function writeNumber(value: number) {
    if (Math.floor(value) === value) {
      if (value >= 0 && value <= POW_2_53) return writeTypeAndLength(0, value);

      if (-POW_2_53 <= value && value < 0)
        return writeTypeAndLength(1, -(value + 1));
    }

    writeUint8(0xfb);
    writeFloat64(value);
  }

  function writeString(value: string) {
    const data: number[] = [];

    for (let i = 0; i < value.length; ++i) {
      let charCode = value.charCodeAt(i);
      if (charCode < 0x80) {
        data.push(charCode);
      } else if (charCode < 0x800) {
        data.push(0xc0 | (charCode >> 6));
        data.push(0x80 | (charCode & 0x3f));
      } else if (charCode < 0xd800) {
        data.push(0xe0 | (charCode >> 12));
        data.push(0x80 | ((charCode >> 6) & 0x3f));
        data.push(0x80 | (charCode & 0x3f));
      } else {
        charCode = (charCode & 0x3ff) << 10;
        charCode |= value.charCodeAt(++i) & 0x3ff;
        charCode += 0x10000;

        data.push(0xf0 | (charCode >> 18));
        data.push(0x80 | ((charCode >> 12) & 0x3f));
        data.push(0x80 | ((charCode >> 6) & 0x3f));
        data.push(0x80 | (charCode & 0x3f));
      }
    }

    writeTypeAndLength(3, data.length);
    writeUint8Array(data);
  }

  function encodeItem(value: unknown) {
    if (value === false) return writeUint8(0xf4);
    if (value === true) return writeUint8(0xf5);
    if (value === null) return writeUint8(0xf6);
    if (value === undefined) return writeUint8(0xf7);

    if (typeof value === 'number') return writeNumber(value);

    if (typeof value === 'string') {
      if (env) {
        writeTypeAndLength(3, 0);
        writeNumber(env.store(value));
      } else {
        writeString(value);
      }

      return;
    }

    if (Array.isArray(value)) {
      writeTypeAndLength(4, value.length);
      for (const item of value) encodeItem(item);
      return;
    }

    if (value instanceof Uint8Array) {
      writeTypeAndLength(2, value.length);
      writeUint8Array(value);
      return;
    }

    if (typeof value === 'function') {
      if (env == null) {
        throw new Error(
          `Can’t store a function without an encoding environment.`,
        );
      }

      // Using additional information 10 for a function, 6..20 are unassigned.
      // @see https://tools.ietf.org/html/rfc7049#section-2.4
      writeTypeAndLength(6, 10);
      writeNumber(env.store(value));
      return;
    }

    const keys = Object.keys(value as any);
    writeTypeAndLength(5, keys.length);

    for (const key of keys) {
      encodeItem(key);
      encodeItem((value as any)[key]);
    }
  }

  encodeItem(value);

  if ('slice' in data) return data.slice(0, offset);

  const ret = new ArrayBuffer(offset);
  const retView = new DataView(ret);
  for (let i = 0; i < offset; ++i) retView.setUint8(i, dataView.getUint8(i));
  return ret;
}

interface DecodeEnvironment {
  getString(id: number): string;
  getFunction(id: number): Function;
}

function decodeWithEnvironment(data: ArrayBuffer, env?: DecodeEnvironment) {
  let offset = 0;
  const dataView = new DataView(data);

  const ret = decodeItem();
  if (offset !== data.byteLength) throw new Error('Remaining bytes');
  return ret;

  function commitRead<T>(length: number, value: T) {
    offset += length;
    return value;
  }

  function readArrayBuffer(length: number) {
    return commitRead(length, new Uint8Array(data, offset, length));
  }

  function readFloat16() {
    const tempArrayBuffer = new ArrayBuffer(4);
    const tempDataView = new DataView(tempArrayBuffer);
    const value = readUint16();

    const sign = value & 0x8000;
    let exponent = value & 0x7c00;
    const fraction = value & 0x03ff;

    if (exponent === 0x7c00) exponent = 0xff << 10;
    else if (exponent !== 0) exponent += (127 - 15) << 10;
    else if (fraction !== 0) return (sign ? -1 : 1) * fraction * POW_2_24;

    tempDataView.setUint32(
      0,
      (sign << 16) | (exponent << 13) | (fraction << 13),
    );
    return tempDataView.getFloat32(0);
  }

  function readFloat32() {
    return commitRead(4, dataView.getFloat32(offset));
  }

  function readFloat64() {
    return commitRead(8, dataView.getFloat64(offset));
  }

  function readUint8() {
    return commitRead(1, dataView.getUint8(offset));
  }

  function readUint16() {
    return commitRead(2, dataView.getUint16(offset));
  }

  function readUint32() {
    return commitRead(4, dataView.getUint32(offset));
  }

  function readUint64() {
    return readUint32() * POW_2_32 + readUint32();
  }

  function readBreak() {
    if (dataView.getUint8(offset) !== 0xff) return false;
    offset += 1;
    return true;
  }

  function readLength(additionalInformation: number) {
    if (additionalInformation < 24) return additionalInformation;
    if (additionalInformation === 24) return readUint8();
    if (additionalInformation === 25) return readUint16();
    if (additionalInformation === 26) return readUint32();
    if (additionalInformation === 27) return readUint64();
    if (additionalInformation === 31) return -1;
    throw new Error('Invalid length encoding');
  }

  function readIndefiniteStringLength(majorType: number) {
    const initialByte = readUint8();
    if (initialByte === 0xff) return -1;

    const length = readLength(initialByte & 0x1f);

    if (length < 0 || initialByte >> 5 !== majorType) {
      throw new Error('Invalid indefinite length element');
    }

    return length;
  }

  function appendUtf16Data(utf16data: number[], appendLength: number) {
    let length = appendLength;

    for (let i = 0; i < length; ++i) {
      let value = readUint8();

      if (value & 0x80) {
        if (value < 0xe0) {
          value = ((value & 0x1f) << 6) | (readUint8() & 0x3f);
          length -= 1;
        } else if (value < 0xf0) {
          value =
            ((value & 0x0f) << 12) |
            ((readUint8() & 0x3f) << 6) |
            (readUint8() & 0x3f);

          length -= 2;
        } else {
          value =
            ((value & 0x0f) << 18) |
            ((readUint8() & 0x3f) << 12) |
            ((readUint8() & 0x3f) << 6) |
            (readUint8() & 0x3f);

          length -= 3;
        }
      }

      if (value < 0x10000) {
        utf16data.push(value);
      } else {
        value -= 0x10000;
        utf16data.push(0xd800 | (value >> 10));
        utf16data.push(0xdc00 | (value & 0x3ff));
      }
    }
  }

  function decodeString(totalLength: number, majorType: number) {
    const data: number[] = [];
    let length = totalLength;

    if (length < 0) {
      while ((length = readIndefiniteStringLength(majorType)) >= 0)
        appendUtf16Data(data, length);
    } else appendUtf16Data(data, length);

    return String.fromCharCode(...data);
  }

  function decodeItem(): unknown {
    const initialByte = readUint8();
    const majorType = initialByte >> 5;
    const additionalInformation = initialByte & 0x1f;

    if (majorType === 7) {
      switch (additionalInformation) {
        case 25:
          return readFloat16();
        case 26:
          return readFloat32();
        case 27:
          return readFloat64();
      }
    }

    let length = readLength(additionalInformation);

    if (length < 0 && (majorType < 2 || majorType > 6)) {
      throw new Error('Invalid length');
    }

    switch (majorType) {
      case 0:
        return length;
      case 1:
        return -1 - length;
      case 2: {
        if (length < 0) {
          const elements = [];
          let fullArrayLength = 0;
          while ((length = readIndefiniteStringLength(majorType)) >= 0) {
            fullArrayLength += length;
            elements.push(readArrayBuffer(length));
          }

          const fullArray = new Uint8Array(fullArrayLength);
          let fullArrayOffset = 0;

          for (const element of elements) {
            fullArray.set(element, fullArrayOffset);
            fullArrayOffset += element.length;
          }

          return fullArray;
        }

        return readArrayBuffer(length);
      }
      case 3: {
        return env
          ? env.getString(decodeItem() as any)
          : decodeString(length, majorType);
      }
      case 4: {
        let retArray;

        if (length < 0) {
          retArray = [];
          while (!readBreak()) retArray.push(decodeItem());
        } else {
          retArray = new Array(length);
          for (let i = 0; i < length; ++i) retArray[i] = decodeItem();
        }
        return retArray;
      }
      case 5: {
        const retObject: {[key: string]: unknown} = {};
        for (let i = 0; i < length || (length < 0 && !readBreak()); ++i) {
          const key: string = decodeItem() as any;
          retObject[key] = decodeItem();
        }
        return retObject;
      }
      case 6: {
        switch (length) {
          case 10: {
            if (env == null) {
              throw new Error(
                `Can’t parse a function without a decoding environment`,
              );
            }

            return env.getFunction(decodeItem() as any);
          }
          default: {
            return undefined;
          }
        }
      }
      case 7:
        switch (length) {
          case 20:
            return false;
          case 21:
            return true;
          case 22:
            return null;
          case 23:
            return undefined;
          default:
            return undefined;
        }
    }
  }
}
