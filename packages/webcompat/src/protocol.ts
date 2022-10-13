/* eslint-disable no-param-reassign */
/* eslint-disable @shopify/typescript/prefer-pascal-case-enums */

export const enum Op {
  CREATE_ELEMENT = 'createElement',
  CREATE_TEXT = 'createText',
  SET_PROPERTY = 'setProperty',
  REMOVE = 'remove',
  INSERT = 'insert',
  ADD_LISTENER = 'addListener',
  REMOVE_LISTENER = 'removeListener',
}

export const enum ClientOp {
  INIT = 'init',
  INVOKE = 'invoke',
}

export type NodeId = number;

export interface ChannelOptions {}

export interface Command {
  id: number;
  name: string;
  params: any[];
}

export interface AbstractChannel<Init = any> {
  initData?: Init;
  ready: Promise<Init>;
  createElement(
    node: NodeId,
    localName: string,
    ns?: string | null,
    parent?: NodeId,
  ): void;
  setAttribute(
    node: NodeId,
    name: string,
    value: string,
    ns?: string | null,
  ): void;
  removeAttribute(node: NodeId, name: string, ns?: string | null): void;
  createText(node: NodeId, data: string, parent?: NodeId): void;
  setText(node: NodeId, data: string): void;
  insert(parent: NodeId, node: NodeId, before?: NodeId): void;
  remove(node: NodeId): void;
  setProperty(node: NodeId, name: string, value: any): void;
  addListener(node: NodeId, type: string, listener: (event: any) => void): void;
  removeListener(
    node: NodeId,
    type: string,
    listener: (event: any) => void,
  ): void;
}

interface Init {
  props: string[];
}

type AnyFunction = (..._: any[]) => any;

export class Channel implements AbstractChannel {
  id = 0;
  initData?: Init;
  ready: Promise<Init>;
  private _ready!: (init: Init) => void;

  private functionIds = new WeakMap<AnyFunction, number>();
  private functions = new Map<number, AnyFunction>();
  private functionId = 0;

  constructor() {
    this.ready = new Promise((resolve) => (this._ready = resolve));
  }

  send(_commands: Command[]) {
    // console.log('send: ', commands);
  }

  op(name: string, ...params: any[]) {
    const id = this.id++;
    this.send([{id, name, params}]);
  }

  createElement(node: NodeId, localName: string, _ns?: string | null) {
    this.op(Op.CREATE_ELEMENT, node, localName);
  }

  setAttribute(node: NodeId, name: string, value: string, _ns?: string | null) {
    this.op(Op.SET_PROPERTY, node, name, value);
  }

  removeAttribute(node: NodeId, name: string, _ns?: string | null) {
    this.op(Op.SET_PROPERTY, node, name, undefined);
  }

  createText(node: NodeId, data: string) {
    this.op(Op.CREATE_TEXT, node, data);
  }

  setText(node: NodeId, data: string) {
    this.setProperty(node, 'data', data);
  }

  insert(parent: NodeId, node: NodeId, before: NodeId) {
    this.op(Op.INSERT, parent, node, before);
  }

  remove(node: NodeId) {
    this.op(Op.REMOVE, node);
  }

  setProperty(node: NodeId, name: string, value: any) {
    if (typeof value === 'function') {
      value = this.function(value);
    }
    this.op(Op.SET_PROPERTY, node, name, value);
  }

  addListener(node: NodeId, type: string, handler: (event: any) => void) {
    // this.setProperty(node, 'on' + type, handler);
    this.op(Op.ADD_LISTENER, node, type, this.function(handler));
  }

  removeListener(node: NodeId, type: string, handler: (event: any) => void) {
    // this.setProperty(node, 'on' + type, undefined);
    this.op(Op.REMOVE_LISTENER, node, type, this.releaseFunction(handler));
  }

  receive(commands: Command[]) {
    // console.log('received: ', commands);
    for (const command of commands) {
      if (!command.name) {
        // this is an RPC result
        continue;
      }
      const params = command.params || [];
      // console.log(command.name, params);
      // let node = params[0];
      switch (command.name) {
        case ClientOp.INIT: {
          const init = params[1];
          this.initData = init;
          this._ready(this.initData!);
          break;
        }
        case ClientOp.INVOKE: {
          const fnId = params[1];
          const args = params[2] as any[];
          const fn = this.functions.get(fnId);
          if (!fn) {
            throw Error(`Unknown function ${fnId} invoked from host`);
          }
          fn(...args);
          break;
        }
        default:
          throw Error(`Unknown host opcode ${command.name}`);
      }
    }
  }

  private function(fn: AnyFunction) {
    let id = this.functionIds.get(fn);
    if (id === undefined) {
      id = this.functionId++;
      this.functions.set(id, fn);
      this.functionIds.set(fn, id);
    }
    return id;
  }

  private releaseFunction(fn: AnyFunction) {
    const id = this.functionIds.get(fn);
    if (id === undefined) {
      throw Error('releaseFunction called on unknown function.');
    }
    this.functionIds.delete(fn);
    this.functions.delete(id);
    return id;
  }
}

interface PostMessageChannelOptions extends ChannelOptions {
  port: MessagePort;
}

export class PostMessageChannel extends Channel {
  private port: MessagePort;

  constructor(options: PostMessageChannelOptions) {
    super();
    this.port = options.port;
    this.port.addEventListener('message', (ev) => this.receive(ev.data));
    this.port.start();
  }

  send(commands: Command[]) {
    this.port.postMessage(commands);
  }
}

interface WebSocketChannelOptions extends ChannelOptions {
  socket: WebSocket;
}

export class WebSocketChannel extends Channel {
  private socket: WebSocket;

  constructor(options: WebSocketChannelOptions) {
    super();
    this.socket = options.socket;
    this.socket.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      if (Array.isArray(data)) {
        this.receive(data);
      } else {
        throw Error(`Message received in unknown format:\n  ${ev.data}`);
      }
    });
    this.ready = new Promise((resolve) => {
      if (this.socket.readyState === 1) {
        resolve({props: []});
      } else {
        this.socket.addEventListener('open', () => {
          resolve({props: []});
        });
      }
    });
  }

  send(commands: Command[]) {
    this.socket.send(JSON.stringify(commands));
  }
}

export class ChannelHost {
  private functions = new Map<number, AnyFunction>();
  private id = 0;

  constructor(private socket: WebSocket) {
    socket.addEventListener('message', (ev) => {
      this.receive(JSON.parse(ev.data));
    });
  }

  send(commands: Command[]) {
    this.socket.send(JSON.stringify(commands));
  }

  receive(_commands: Command[]) {}

  op(name: string, ...params: any[]) {
    const id = this.id++;
    this.send([{id, name, params}]);
  }

  sanitizeEvent(..._e: any[]) {}

  bufferObject(obj: any) {
    return obj;
  }

  function(id: number) {
    let proxy = this.functions.get(id);
    if (proxy === undefined) {
      proxy = (...args: any[]) => {
        if (this.sanitizeEvent) this.sanitizeEvent(...args);
        const sanitized = sanitizeObjectForSerialization(args);
        this.op(ClientOp.INVOKE, 0, id, sanitized);
      };
      this.functions.set(id, proxy);
    }
    return proxy;
  }

  releaseFunction(id: number) {
    const proxy = this.functions.get(id);
    this.functions.delete(id);
    return proxy;
  }
}

const Node = globalThis.Node || function Node() {};
const Window = globalThis.Window || function Window() {};
const EventTarget = globalThis.EventTarget || function EventTarget() {};
const Event = globalThis.Event || function Event() {};

function sanitizeObjectForSerialization<T = any>(
  obj: T,
  seen = new Set(),
): T | undefined {
  if (
    typeof obj === 'function' ||
    obj instanceof Node ||
    obj instanceof EventTarget ||
    obj instanceof Window
  ) {
    return undefined;
  }
  if (typeof obj !== 'object' || obj === null) return obj;
  if (seen.has(obj)) return undefined;
  seen.add(obj);
  if (Array.isArray(obj)) {
    const out = [] as unknown as typeof obj;
    for (let i = 0; i < obj.length; i++) {
      out[i] = sanitizeObjectForSerialization(obj[i], seen);
    }
    return out;
  }
  const isEvent = obj instanceof Event;
  const out = {} as T;
  // eslint-disable-next-line guard-for-in
  for (const i in obj) {
    const value = obj[i];
    if (isEvent && (i === 'isTrusted' || i === 'path')) {
      continue;
    }
    if (i[0] === '_') continue;
    const sanitized = sanitizeObjectForSerialization(value, seen);
    if (sanitized !== undefined) out[i] = sanitized;
  }
  return out;
}
