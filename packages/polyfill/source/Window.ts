import {Document} from './Document.ts';
import {Event} from './Event.ts';
import {EventTarget} from './EventTarget.ts';
import {CustomEvent} from './CustomEvent.ts';
import {ErrorEvent} from './ErrorEvent.ts';
import {PromiseRejectionEvent} from './PromiseRejectionEvent.ts';
import {ToggleEvent} from './ToggleEvent.ts';
import {FocusEvent} from './FocusEvent.ts';
import {ClipboardEvent} from './ClipboardEvent.ts';
import {Node} from './Node.ts';
import {ParentNode} from './ParentNode.ts';
import {ChildNode} from './ChildNode.ts';
import {Element} from './Element.ts';
import {HTMLElement} from './HTMLElement.ts';
import {SVGElement} from './SVGElement.ts';
import {CharacterData} from './CharacterData.ts';
import {Text} from './Text.ts';
import {Comment} from './Comment.ts';
import {DocumentFragment} from './DocumentFragment.ts';
import {HTMLTemplateElement} from './HTMLTemplateElement.ts';
import {CustomElementRegistryImplementation} from './CustomElementRegistry.ts';
import {MutationObserver} from './MutationObserver.ts';
import {EXTENSIONS, HOOKS, HOOKS_DISPATCH} from './constants.ts';
import type {WindowExtension} from './extensions.ts';
import type {Hooks} from './hooks.ts';

type OnErrorHandler =
  | ((
      message: string,
      filename?: string,
      lineno?: number,
      colno?: number,
      error?: any,
    ) => void)
  | null;

const EVENT_HANDLER_PROPERTIES = ['onerror', 'onunhandledrejection'] as const;
const POLYFILL_GLOBAL_PROPERTY = Symbol.for(
  '@remote-dom/polyfill/global-property',
);

type PropertyDescriptors = Record<PropertyKey, PropertyDescriptor>;

function windowPropertyDescriptors(window: Window): PropertyDescriptors {
  return Object.getOwnPropertyDescriptors(window);
}

function eventTargetPropertyDescriptors(window: Window): PropertyDescriptors {
  const properties: PropertyDescriptors = {};

  for (const [property, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(EventTarget.prototype),
  )) {
    if (property !== 'constructor' && typeof descriptor.value === 'function') {
      descriptor.value = markPolyfillGlobalProperty(
        descriptor.value.bind(window),
      );
      properties[property] = descriptor;
    }
  }

  return properties;
}

function eventHandlerPropertyDescriptors(window: Window): PropertyDescriptors {
  const properties: PropertyDescriptors = {};

  for (const property of EVENT_HANDLER_PROPERTIES) {
    properties[property] = {
      configurable: true,
      enumerable: true,
      get: markPolyfillGlobalProperty(() => window[property]),
      set: markPolyfillGlobalProperty((handler) => {
        window[property] = handler as any;
      }),
    };
  }

  return properties;
}

function globalPropertyDescriptors(window: Window): PropertyDescriptors {
  return Object.assign(
    windowPropertyDescriptors(window),
    eventTargetPropertyDescriptors(window),
    eventHandlerPropertyDescriptors(window),
  );
}

function markPolyfillGlobalProperty<
  FunctionType extends (...args: any[]) => any,
>(value: FunctionType) {
  Object.defineProperty(value, POLYFILL_GLOBAL_PROPERTY, {value: true});
  return value;
}

function installMissingGlobalProperties(
  target: object,
  properties: PropertyDescriptors,
) {
  for (const property of Reflect.ownKeys(properties)) {
    const currentDescriptor = findPropertyDescriptor(target, property);
    if (
      currentDescriptor == null ||
      isPolyfillGlobalProperty(currentDescriptor)
    ) {
      Object.defineProperty(target, property, properties[property]!);
    }
  }
}

function findPropertyDescriptor(target: object, property: PropertyKey) {
  let currentTarget: object | null = target;

  while (currentTarget) {
    const descriptor = Object.getOwnPropertyDescriptor(currentTarget, property);
    if (descriptor) return descriptor;
    currentTarget = Object.getPrototypeOf(currentTarget);
  }

  return undefined;
}

function isPolyfillGlobalProperty(descriptor: PropertyDescriptor) {
  return [descriptor.value, descriptor.get, descriptor.set].some(
    (value) =>
      typeof value === 'function' && value[POLYFILL_GLOBAL_PROPERTY] === true,
  );
}

export class Window extends EventTarget {
  [HOOKS]: Partial<Hooks> = {};
  [EXTENSIONS]: Partial<Hooks>[] = [];
  [HOOKS_DISPATCH]: Hooks = createHooksDispatcher(this);
  name = '';
  window = this;
  parent = this;
  self = this;
  top = this;
  document = new Document(this);
  customElements = new CustomElementRegistryImplementation();
  location = globalThis.location;
  navigator = globalThis.navigator;
  Event = Event;
  ErrorEvent = ErrorEvent;
  PromiseRejectionEvent = PromiseRejectionEvent;
  ToggleEvent = ToggleEvent;
  FocusEvent = FocusEvent;
  ClipboardEvent = ClipboardEvent;
  EventTarget = EventTarget;
  CustomEvent = CustomEvent;
  Node = Node;
  ParentNode = ParentNode;
  ChildNode = ChildNode;
  DocumentFragment = DocumentFragment;
  Document = Document;
  CharacterData = CharacterData;
  Comment = Comment;
  Text = Text;
  Element = Element;
  HTMLElement = HTMLElement;
  SVGElement = SVGElement;
  HTMLTemplateElement = HTMLTemplateElement;
  MutationObserver = MutationObserver;

  #currentOnErrorHandler: ((event: any) => void) | null = null;
  #currentOriginalOnErrorHandler: OnErrorHandler = null;
  #currentOnUnhandledRejectionHandler: WindowEventHandlers['onunhandledrejection'] =
    null;

  static with(...extensions: readonly WindowExtension[]): typeof Window {
    const BaseWindow = this;

    return class ExtendedWindow extends BaseWindow {
      constructor() {
        super();

        for (const extension of extensions) {
          installExtension(this, extension);
        }
      }
    };
  }

  get onerror() {
    return this.#currentOriginalOnErrorHandler;
  }
  set onerror(handler: OnErrorHandler) {
    if (this.#currentOnErrorHandler) {
      this.removeEventListener('error', this.#currentOnErrorHandler);
    }
    if (handler && typeof handler === 'function') {
      // the event listener version receives an event object
      // whereas winwow.onerror receives 5 arguments instead
      // we need to wrap the handler to convert the event object to the 5 arguments
      // and also make sure that when window.onerror is read to return the original handler
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event#syntax
      this.#currentOriginalOnErrorHandler = handler;
      this.#currentOnErrorHandler = (event: ErrorEvent) => {
        handler(
          event.message ?? 'Error',
          event.filename,
          event.lineno,
          event.colno,
          event.error,
        );
      };
      this.addEventListener('error', this.#currentOnErrorHandler);
    } else {
      this.#currentOnErrorHandler = null;
      this.#currentOriginalOnErrorHandler = null;
    }
  }

  get onunhandledrejection() {
    return this.#currentOnUnhandledRejectionHandler;
  }
  set onunhandledrejection(
    handler: WindowEventHandlers['onunhandledrejection'],
  ) {
    if (this.#currentOnUnhandledRejectionHandler) {
      this.removeEventListener(
        'unhandledrejection',
        this.#currentOnUnhandledRejectionHandler as any,
      );
    }
    if (handler && typeof handler === 'function') {
      this.#currentOnUnhandledRejectionHandler = handler;
      this.addEventListener(
        'unhandledrejection',
        this.#currentOnUnhandledRejectionHandler as any,
      );
    } else {
      this.#currentOnUnhandledRejectionHandler = null;
    }
  }

  static setGlobal(window: Window) {
    const currentSelf = globalThis.self;
    const currentWindow = globalThis.window;
    const properties = windowPropertyDescriptors(window);
    const missingProperties = Object.assign(
      eventTargetPropertyDescriptors(window),
      eventHandlerPropertyDescriptors(window),
    );

    delete properties.self;

    Object.defineProperties(globalThis, properties);
    installMissingGlobalProperties(globalThis, missingProperties);

    if (
      typeof currentSelf === 'undefined' ||
      (currentSelf === currentWindow && currentSelf !== globalThis)
    ) {
      Object.defineProperty(globalThis, 'self', {
        value: window,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    } else if (currentSelf !== globalThis) {
      // There can already be a `self`, like when polyfilling the DOM
      // in a Web Worker. In those cases, just mirror all the `Window`
      // properties onto `self`, rather than wholly redefining it.
      Object.defineProperties(currentSelf, properties);
      installMissingGlobalProperties(currentSelf, missingProperties);
    }
  }

  static setGlobalThis(window: Window) {
    for (const property in window) {
      if ((window as any)[property] === window) {
        (window as any)[property] = globalThis;
      }
    }

    Object.defineProperties(globalThis, globalPropertyDescriptors(window));
  }
}

function installExtension(window: Window, extension: WindowExtension) {
  window[EXTENSIONS].push(extension(window) ?? {});
}

function createHooksDispatcher(window: Window): Hooks {
  return {
    createElement: dispatchHook.bind(null, window, 'createElement'),
    setAttribute: dispatchHook.bind(null, window, 'setAttribute'),
    removeAttribute: dispatchHook.bind(null, window, 'removeAttribute'),
    createText: dispatchHook.bind(null, window, 'createText'),
    setText: dispatchHook.bind(null, window, 'setText'),
    insertChild: dispatchHook.bind(null, window, 'insertChild'),
    removeChild: dispatchHook.bind(null, window, 'removeChild'),
    addEventListener: dispatchHook.bind(null, window, 'addEventListener'),
    removeEventListener: dispatchHook.bind(null, window, 'removeEventListener'),
  };
}

function dispatchHook(window: Window, name: keyof Hooks, ...args: unknown[]) {
  for (const hooks of window[EXTENSIONS]) {
    const hook = hooks[name] as ((...args: unknown[]) => void) | undefined;
    hook?.apply(hooks, args);
  }

  const hooks = window[HOOKS];
  const legacyHook = hooks[name] as ((...args: unknown[]) => void) | undefined;
  legacyHook?.apply(hooks, args);
}
